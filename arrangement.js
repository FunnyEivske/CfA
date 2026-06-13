import { db, appId } from './firebase.js';
import { authState, userReady, showCustomAlert, showCustomConfirm, toggleModal, setupImageAdjustment, cropAndCompressUniversal, getSearchableUsers, getAllCachedUsers } from './script.js';
import { TaggingSystem, parseMentionsForDisplay } from './tagging.js';
import { notifyMentionedUsers } from './feed.js';
import {
    collection,
    addDoc,
    onSnapshot,
    Timestamp,
    query,
    orderBy,
    doc,
    setDoc,
    deleteDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- UI-ELEMENTER ---
let eventQuill;
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Quill !== 'undefined' && document.getElementById('event-quill-editor')) {
        eventQuill = new Quill('#event-quill-editor', {
            theme: 'snow',
            placeholder: 'Beskrivelse av convention...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'header': [1, 2, 3, false] }],
                    ['link'],
                    ['clean']
                ]
            }
        });
    }

    // --- LOCATION AUTOCOMPLETE (Photon / OpenStreetMap) ---
    const locationInput = document.getElementById('event-location');
    const autocompleteResults = document.getElementById('location-autocomplete-results');
    
    if (locationInput && autocompleteResults) {
        let debounceTimer;
        
        locationInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            
            if (query.length < 3) {
                autocompleteResults.innerHTML = '';
                autocompleteResults.classList.add('hidden');
                return;
            }
            
            debounceTimer = setTimeout(async () => {
                try {
                    const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
                    if (!response.ok) throw new Error('Network response was not ok');
                    const data = await response.json();
                    
                    autocompleteResults.innerHTML = '';
                    
                    if (data.features && data.features.length > 0) {
                        data.features.forEach(feature => {
                            const props = feature.properties;
                            // Bygg adresse-streng
                            const name = props.name || '';
                            const street = props.street ? `${props.street} ${props.housenumber || ''}`.trim() : '';
                            const city = props.city || props.town || props.village || '';
                            const postcode = props.postcode || '';
                            
                            let displayText = name;
                            if (street && name !== street) displayText += `, ${street}`;
                            if (postcode || city) displayText += `, ${postcode} ${city}`.trim();
                            
                            const div = document.createElement('div');
                            div.className = 'autocomplete-item';
                            div.style.padding = '0.5rem 1rem';
                            div.style.cursor = 'pointer';
                            div.style.borderBottom = '1px solid var(--color-border)';
                            div.innerText = displayText;
                            
                            div.addEventListener('mouseenter', () => div.style.backgroundColor = 'var(--color-bg-body)');
                            div.addEventListener('mouseleave', () => div.style.backgroundColor = 'transparent');
                            
                            div.addEventListener('click', () => {
                                locationInput.value = displayText;
                                autocompleteResults.innerHTML = '';
                                autocompleteResults.classList.add('hidden');
                            });
                            
                            autocompleteResults.appendChild(div);
                        });
                        autocompleteResults.classList.remove('hidden');
                    } else {
                        autocompleteResults.classList.add('hidden');
                    }
                } catch (error) {
                    console.error('Error fetching location autocomplete:', error);
                    autocompleteResults.classList.add('hidden');
                }
            }, 300);
        });
        
        // Lukk autocomplete ved klikk utenfor
        document.addEventListener('click', (e) => {
            if (!locationInput.contains(e.target) && !autocompleteResults.contains(e.target)) {
                autocompleteResults.classList.add('hidden');
            }
        });
    }

});
const postsSection = document.getElementById('posts-section');
const eventsSection = document.getElementById('events-section');
const tabPosts = document.getElementById('tab-posts');
const tabEvents = document.getElementById('tab-events');
const tabGlaze = document.getElementById('tab-glaze');
const glazeSection = document.getElementById('glaze-section');

const newEventBtn = document.getElementById('new-event-btn');
const newEventForm = document.getElementById('new-event-form');
const eventError = document.getElementById('event-error');
const eventSubmitButton = document.getElementById('event-submit-button');

if (newEventBtn) {
    newEventBtn.addEventListener('click', () => {
        editingEventId = null;
        if (newEventForm) newEventForm.reset();
        if (typeof eventQuill !== 'undefined' && eventQuill) eventQuill.root.innerHTML = '';
        const pic = document.getElementById('event-image-preview-wrapper');
        if (pic) pic.classList.add('hidden');
        const pimg = document.getElementById('event-image-preview');
        if (pimg) pimg.src = '';
        const pudz = document.getElementById('event-upload-drop-zone');
        if (pudz) pudz.classList.remove('hidden');
        eventImageOffset = 0;
        const modal = document.getElementById('event-modal');
        const mt = modal ? modal.querySelector('h3') : null;
        if (mt) mt.textContent = 'Nytt arrangement';
        if (eventSubmitButton) eventSubmitButton.textContent = 'Publiser arrangement';
    });
}

const upcomingEventsContainer = document.getElementById('upcoming-events-container');
const pastEventsContainer = document.getElementById('past-events-container');
const togglePastEventsBtn = document.getElementById('toggle-past-events');

// Sti til arrangement-databasen
const arrangementsPath = `/artifacts/${appId}/public/data/arrangements`;

// --- TAB LOGIKK ---
function switchTab(tab) {
    // Standard sections and tabs
    const sections = [
        { id: 'posts', section: postsSection, tab: tabPosts },
        { id: 'events', section: eventsSection, tab: tabEvents },
        { id: 'glaze', section: glazeSection, tab: tabGlaze }
    ];

    sections.forEach(s => {
        if (!s.section || !s.tab) return;
        
        if (s.id === tab) {
            s.section.classList.remove('hidden');
            s.tab.classList.replace('btn-secondary', 'btn-primary');
            
            // Trigger specific loading logic if needed
            if (tab === 'glaze' && typeof window.setupGlazeListener === 'function') {
                window.setupGlazeListener();
            }
        } else {
            s.section.classList.add('hidden');
            s.tab.classList.replace('btn-primary', 'btn-secondary');
        }
    });
}

// --- HJELPEFUNKSJONER ---
function formatDate(timestamp, endTimestamp = null) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const options = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    let dateString = date.toLocaleString('nb-NO', options);
    
    if (endTimestamp) {
        const endDate = endTimestamp.toDate ? endTimestamp.toDate() : new Date(endTimestamp);
        if (date.getFullYear() === endDate.getFullYear() && date.getMonth() === endDate.getMonth() && date.getDate() === endDate.getDate()) {
            const endOptions = { hour: '2-digit', minute: '2-digit' };
            dateString += ' - ' + endDate.toLocaleString('nb-NO', endOptions);
        } else {
            dateString += ' - ' + endDate.toLocaleString('nb-NO', options);
        }
    }
    return dateString;
}

function sanitizeHTML(str) {
    if (!str) return '';
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(str);
    }
    // Fallback
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function compressImage(file, maxWidth = 1000, quality = 0.6) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
    });
}
// cropAndCompressImage function removed, now using shared cropAndCompressUniversal
// --- IMAGE ADJUSTMENT STATE ---
let eventImageOffset = 0;
let resetEventAdjustment = null;
let editingEventId = null; // Tracks which event is being edited

// --- EVENT LOGIKK ---
const eventImageInput = document.getElementById('event-image');
const previewWrapper = document.getElementById('event-image-preview-wrapper');
const previewImg = document.getElementById('event-image-preview');

// Initialisering for Universal Cropping
if (eventImageInput) {
    eventImageInput.addEventListener('cropComplete', (e) => {
        eventImageOffset = e.detail.offset;
        console.log("Event crop complete. Offset:", eventImageOffset);
    });

    eventImageInput.addEventListener('change', (e) => {
        if (!e.target.files[0]) {
            eventImageOffset = 0;
        }
    });
}

async function handleEditEvent(eventId) {
    try {
        const eventDoc = await getDoc(doc(db, arrangementsPath, eventId));
        if (!eventDoc.exists()) {
            showCustomAlert("Arrangementet finnes ikke lenger.");
            return;
        }

        const eventData = eventDoc.data();
        editingEventId = eventId;

        // Fyll ut skjemaet
        document.getElementById('event-title').value = eventData.title || '';
        document.getElementById('event-description').value = eventData.description || '';
            if (eventQuill) eventQuill.root.innerHTML = eventData.description || '';
        document.getElementById('event-location').value = eventData.location || '';
        document.getElementById('event-visibility').value = eventData.visibility || 'internal';
        const allowRegistrationCheckbox = document.getElementById('event-allow-registration');
        if (allowRegistrationCheckbox) {
            allowRegistrationCheckbox.checked = eventData.allowRegistration !== false;
        }

        if (eventData.date) {
            const date = eventData.date.toDate();
            // Format for datetime-local input: YYYY-MM-DDThh:mm
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            document.getElementById('event-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
            if (eventData.endDate) {
                const eDate = eventData.endDate.toDate();
                const eYear = eDate.getFullYear();
                const eMonth = String(eDate.getMonth() + 1).padStart(2, '0');
                const eDay = String(eDate.getDate()).padStart(2, '0');
                const eHours = String(eDate.getHours()).padStart(2, '0');
                const eMinutes = String(eDate.getMinutes()).padStart(2, '0');
                document.getElementById('event-end-date').value = `${eYear}-${eMonth}-${eDay}T${eHours}:${eMinutes}`;
            } else {
                document.getElementById('event-end-date').value = '';
            }

        }

        const modalTitle = document.getElementById('event-modal')?.querySelector('h3');
        if (modalTitle) modalTitle.textContent = 'Rediger arrangement';
        if (eventSubmitButton) eventSubmitButton.textContent = 'Lagre endringer';

        // Håndter bilde
        if (eventData.imageUrl) {
            if (previewImg) previewImg.src = eventData.imageUrl;
            if (previewWrapper) previewWrapper.classList.remove('hidden');
            const dropZone = document.getElementById('event-upload-drop-zone');
            if (dropZone) dropZone.classList.add('hidden');
            eventImageOffset = eventData.imageOffset || 0;
            if (resetEventAdjustment) resetEventAdjustment(eventImageOffset);
        } else {
            if (previewWrapper) previewWrapper.classList.add('hidden');
            const dropZone = document.getElementById('event-upload-drop-zone');
            if (dropZone) dropZone.classList.remove('hidden');
            eventImageOffset = 0;
        }

        const eventModal = document.getElementById('event-modal');
        if (eventModal) toggleModal(eventModal, true);
    } catch (error) {
        console.error("Error fetching event for edit:", error);
        showCustomAlert("Kunne ikke hente arrangementet: " + error.message);
    }
}

async function handleEventSubmit(e) {
    e.preventDefault();
    if ((authState.role !== 'admin' && authState.role !== 'contributor') || !authState.user) {
        if (eventError) eventError.textContent = 'Du har ikke tilgang til å publisere.';
        return;
    }

    if (eventError) eventError.textContent = '';
    const originalBtnText = editingEventId ? 'Lagre endringer' : 'Publiser arrangement';
    if (eventSubmitButton) {
        eventSubmitButton.disabled = true;
        eventSubmitButton.textContent = editingEventId ? 'Lagrer endringer...' : 'Publiserer...';
    }

    const title = document.getElementById('event-title').value;
    const description = eventQuill ? eventQuill.root.innerHTML.trim() : document.getElementById('event-description').value;
    const dateVal = document.getElementById('event-date').value;
    const endDateVal = document.getElementById('event-end-date').value;
    const location = document.getElementById('event-location').value;
    const visibility = document.getElementById('event-visibility').value;
    const allowRegistration = document.getElementById('event-allow-registration').checked;
    const imageFile = eventImageInput ? eventImageInput.files[0] : null;

    try {
        let imageUrl = '';
        let imageOffset = eventImageOffset;

        // Hvis vi redigerer og mangler ny fil, behold gammelt bilde
        if (editingEventId && !imageFile) {
            const eventDoc = await getDoc(doc(db, arrangementsPath, editingEventId));
            if (eventDoc.exists()) {
                imageUrl = eventDoc.data().imageUrl || '';
                imageOffset = eventDoc.data().imageOffset || 0;
            }
        }

        if (imageFile) {
            // Bruk universell contextual cropping (offset i %)
            imageUrl = await cropAndCompressUniversal(imageFile, eventImageOffset, {
                targetWidth: 1000,
                targetHeight: 400
            });
            imageOffset = 0;
        }

        const eventData = {
            title,
            description,
            date: Timestamp.fromDate(new Date(dateVal)),
            ...(endDateVal ? { endDate: Timestamp.fromDate(new Date(endDateVal)) } : {}),
            location: location || 'Ikke oppgitt',
            visibility: visibility || 'internal',
            allowRegistration: allowRegistration,
            imageUrl,
            imageOffset: imageOffset,
            updatedAt: serverTimestamp()
        };

        let eventId = editingEventId;

        if (editingEventId) {
            await updateDoc(doc(db, arrangementsPath, editingEventId), eventData);
            showCustomAlert("Arrangementet ble oppdatert!");
        } else {
            eventData.authorId = authState.user.uid;
            eventData.authorName = authState.profile?.displayName || 'Admin';
            eventData.createdAt = serverTimestamp();

            const eventsRef = collection(db, arrangementsPath);
            const newEventRef = await addDoc(eventsRef, eventData);
            eventId = newEventRef.id;
            showCustomAlert("Arrangementet ble publisert!");
        }

        // Notify tagged users
        if(eventId) {
            await notifyMentionedUsers(description, eventId, `${arrangementsPath}/${eventId}`, `${authState.profile?.displayName || 'Admin'} nevnte deg i et arrangement`);
        }

        newEventForm.reset();
        if (previewWrapper) previewWrapper.classList.add('hidden');
        if (previewImg) previewImg.src = '';
        const dropZone = document.getElementById('event-upload-drop-zone');
        if (dropZone) dropZone.classList.remove('hidden');
        eventImageOffset = 0;
        if (resetEventAdjustment) resetEventAdjustment(0);

        editingEventId = null;
        const modalTitle = document.getElementById('event-modal')?.querySelector('h3');
        if (modalTitle) modalTitle.textContent = 'Nytt arrangement';

        const eventModal = document.getElementById('event-modal');
        if (eventModal) toggleModal(eventModal, false);

    } catch (error) {
        console.error("Error saving event:", error);
        if (eventError) eventError.textContent = 'En feil oppstod. Kunne ikke lagre arrangementet.';
    } finally {
        if (eventSubmitButton) {
            eventSubmitButton.disabled = false;
            eventSubmitButton.textContent = 'Publiser arrangement';
        }
    }
}

function setupArrangementsListener() {
    const eventsRef = collection(db, arrangementsPath);
    const q = query(eventsRef, orderBy("date", "asc"));

    onSnapshot(q, (snapshot) => {
        const upcoming = [];
        const past = [];
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const eventDate = data.date.toDate();
            const event = { id: docSnap.id, ...data };

            if (eventDate < todayStart) {
                past.push(event);
            } else {
                upcoming.push(event);
            }
        });

        renderUpcomingEvents(upcoming);
        renderPastEvents(past.reverse()); // Newest past first
    });
}

function renderUpcomingEvents(events) {
    upcomingEventsContainer.innerHTML = '';
    if (events.length === 0) {
        upcomingEventsContainer.innerHTML = '<p class="text-center py-10 text-muted">Ingen kommende arrangementer.</p>';
        return;
    }

    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            ${event.imageUrl ? `<img src="${event.imageUrl}" class="event-image" alt="${event.title}">` : ''}
            <div class="event-body">
                <div class="event-meta">
                    <div class="event-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 4H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM16 2v4M8 2v4M3 10h18" /></svg>
                        <span>${formatDate(event.date, event.endDate)}</span>
                    </div>
                    <div class="event-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        <span>${sanitizeHTML(event.location)}</span>
                    </div>
                    ${event.visibility === 'public' ? `<div class="event-meta-item" style="color: var(--color-primary);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>Offentlig</span></div>` : `<div class="event-meta-item" style="color: var(--color-text-muted);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Intern</span></div>`}
                </div>
                <h3 class="event-title">${sanitizeHTML(event.title)}</h3>
                <p class="event-description">${parseMentionsForDisplay(sanitizeHTML(event.description || '').replace(/\n/g, '<br>'), getAllCachedUsers()).html}</p>
                
                ${event.allowRegistration !== false ? `
                <div class="event-actions">
                    <button class="btn btn-secondary btn-sm rsvp-btn" data-id="${event.id}" data-status="coming">Kommer!</button>
                    <button class="btn btn-secondary btn-sm rsvp-btn" data-id="${event.id}" data-status="not_coming">Kommer ikke</button>
                    <div id="rsvp-status-${event.id}" class="rsvp-status"></div>
                </div>
                ` : ''}
                
                ${authState.role === 'admin' ? `
                <div style="margin-top: 1rem; text-align: right; display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <button class="btn btn-ghost btn-sm edit-event-btn" data-id="${event.id}">✏️ Rediger</button>
                    <button class="btn btn-ghost btn-sm delete-event-btn" data-id="${event.id}" style="color: var(--color-error);">🗑️ Slett</button>
                </div>
                ` : ''}
                
                ${event.allowRegistration !== false ? `
                <div class="mt-4 text-sm text-muted">
                    <details>
                        <summary style="cursor: pointer;">Se hvem som kommer (<span id="rsvp-count-${event.id}">0</span>)</summary>
                        <ul id="rsvp-list-${event.id}" class="mt-2" style="padding-left: 1rem;">
                            <!-- Liste over folk her -->
                        </ul>
                    </details>
                </div>
                ` : ''}
            </div>
        `;
        upcomingEventsContainer.appendChild(card);
        setupRSVPListener(event.id);
    });
}

function renderPastEvents(events) {
    pastEventsContainer.innerHTML = '';
    if (events.length === 0) {
        pastEventsContainer.innerHTML = '<p class="text-center py-4 text-muted">Ingen tidligere arrangementer.</p>';
        return;
    }

    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'past-event-card mb-2';
        card.innerHTML = `
            <img src="${event.imageUrl || 'https://via.placeholder.com/60'}" class="past-event-img" alt="${event.title}">
            <div class="past-event-info">
                <h4>${sanitizeHTML(event.title)}</h4>
                <p>${formatDate(event.date, event.endDate)}</p>
            </div>
            ${authState.role === 'admin' ? `
                <button class="btn btn-ghost text-sm delete-event-btn" data-id="${event.id}">🗑️</button>
            ` : ''}
        `;
        pastEventsContainer.appendChild(card);
    });
}

// --- RSVP LOGIKK ---
async function handleRSVP(eventId, status) {
    if (!authState.user) return;

    const rsvpRef = doc(db, `${arrangementsPath}/${eventId}/rsvp`, authState.user.uid);
    try {
        const snap = await getDoc(rsvpRef);
        if (snap.exists() && snap.data().status === status) {
            // Hvis man trykker på samme status igjen, slett RSVP (Avbryt)
            await deleteDoc(rsvpRef);
        } else {
            await setDoc(rsvpRef, {
                status,
                userId: authState.user.uid,
                userName: authState.profile?.displayName || 'Medlem',
                userPhoto: authState.profile?.photoURL || null,
                updatedAt: serverTimestamp()
            });
        }
    } catch (e) {
        console.error("RSVP failed:", e);
    }
}

function setupRSVPListener(eventId) {
    const rsvpRef = collection(db, `${arrangementsPath}/${eventId}/rsvp`);
    onSnapshot(rsvpRef, (snapshot) => {
        const listEl = document.getElementById(`rsvp-list-${eventId}`);
        const countEl = document.getElementById(`rsvp-count-${eventId}`);
        const statusEl = document.getElementById(`rsvp-status-${eventId}`);

        if (!listEl || !countEl) return;

        let comingCount = 0;
        listEl.innerHTML = '';

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.status === 'coming') {
                comingCount++;
                const li = document.createElement('li');
                li.style.fontSize = '0.85rem';
                li.textContent = data.userName;
                listEl.appendChild(li);
            }

            // check current user status
            if (data.userId === authState.user?.uid) {
                statusEl.textContent = data.status === 'coming' ? '✓ Kommer' : '✕ Kommer ikke';
                statusEl.className = `rsvp-status ${data.status.replace('_', '-')}`;

                // Highlight the active button
                const buttons = document.querySelectorAll(`.rsvp-btn[data-id="${eventId}"]`);
                buttons.forEach(btn => {
                    if (btn.dataset.status === data.status) {
                        btn.classList.replace('btn-secondary', 'btn-primary');
                    } else {
                        btn.classList.replace('btn-primary', 'btn-secondary');
                    }
                });
            }
        });

        // Reset highlight if no RSVP found for user
        const userRsvp = snapshot.docs.find(d => d.id === authState.user?.uid);
        if (!userRsvp) {
            statusEl.textContent = '';
            statusEl.className = 'rsvp-status';
            const buttons = document.querySelectorAll(`.rsvp-btn[data-id="${eventId}"]`);
            buttons.forEach(btn => btn.classList.replace('btn-primary', 'btn-secondary'));
        }

        countEl.textContent = comingCount;
        if (listEl.innerHTML === '') {
            listEl.innerHTML = '<li class="text-xs italic">Ingen påmeldte ennå.</li>';
        }
    });
}

async function handleDeleteEvent(eventId) {
    const confirmed = await showCustomConfirm("Er du sikker på at du vil slette dette arrangementet?");
    if (confirmed) {
        try {
            await deleteDoc(doc(db, arrangementsPath, eventId));
        } catch (e) {
            showCustomAlert("Kunne ikke slette arrangementet.");
        }
    }
}

function setupEventTagging() {
    const eventDescInput = document.getElementById('event-description');
    if (eventDescInput) {
        new TaggingSystem(eventDescInput, getSearchableUsers);
    }
}

// --- INITIALISERING ---
userReady.then(() => {
    // Initialiser premium opplastingssone for arrangementer
    if (typeof window.setupUploadZone === 'function') {
        window.setupUploadZone('event-image', 'event-upload-drop-zone', 'event-image-preview', 'event-image-preview-wrapper');
    }

    const removeEventImageBtn = document.getElementById('remove-event-image');
    if (removeEventImageBtn) {
        removeEventImageBtn.onclick = (e) => {
            e.preventDefault();
            eventImageInput.value = '';
            if (previewWrapper) previewWrapper.classList.add('hidden');
            if (previewImg) previewImg.src = '';
            const dropZone = document.getElementById('event-upload-drop-zone');
            if (dropZone) dropZone.classList.remove('hidden');
            eventImageOffset = 0;
        };
    }

    if (previewImg) {
        previewImg.style.cursor = 'pointer';
        previewImg.title = 'Klikk for å endre bilde';
        previewImg.onclick = () => eventImageInput.click();
    }

    // Tab event listeners
    tabPosts.addEventListener('click', () => switchTab('posts'));
    tabEvents.addEventListener('click', () => switchTab('events'));
    if (tabGlaze) tabGlaze.addEventListener('click', () => switchTab('glaze'));

    // Admin listeners
    // newEventBtn is handled in script.js for modal toggling

    if (newEventForm) {
        newEventForm.addEventListener('submit', handleEventSubmit);
        setupEventTagging();
    }

    // Toggle past events
    togglePastEventsBtn.addEventListener('click', () => {
        pastEventsContainer.classList.toggle('hidden');
        const svg = togglePastEventsBtn.querySelector('svg');
        if (pastEventsContainer.classList.contains('hidden')) {
            svg.style.transform = 'rotate(0deg)';
        } else {
            svg.style.transform = 'rotate(180deg)';
        }
    });

    // Event delegation for RSVP and Delete
    eventsSection.addEventListener('click', (e) => {
        const rsvpBtn = e.target.closest('.rsvp-btn');
        if (rsvpBtn) {
            handleRSVP(rsvpBtn.dataset.id, rsvpBtn.dataset.status);
            return;
        }

        const editBtn = e.target.closest('.edit-event-btn');
        if (editBtn) {
            handleEditEvent(editBtn.dataset.id);
            return;
        }

        const deleteBtn = e.target.closest('.delete-event-btn');
        if (deleteBtn) {
            handleDeleteEvent(deleteBtn.dataset.id);
            return;
        }
    });

    setupArrangementsListener();
});
