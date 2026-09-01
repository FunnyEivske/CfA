import { EventAPI, AuthAPI } from './api-client.js';

let eventQuill = null;
let currentEventImageFile = null;
let currentEventImageUrl = '';

export async function initEvents() {
    loadMemberEvents();
    setupNewEventForm();
}

export async function loadMemberEvents() {
    const container = document.getElementById('upcoming-events-container');
    if (!container) return;

    try {
        const data = await EventAPI.getEvents();
        const events = data.events || [];
        container.innerHTML = '';

        if (events.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-8">Ingen kommende arrangementer for øyeblikket.</p>';
            return;
        }

        const authRes = await AuthAPI.getAuthState();
        const isAdmin = authRes.authenticated && authRes.user && authRes.user.role === 'admin';

        events.forEach(ev => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'overflow: hidden; border-radius: var(--radius-lg); border: 1px solid var(--color-border); background: var(--color-bg-card);';
            
            const eventDateFormatted = ev.date ? new Date(ev.date).toLocaleDateString('nb-NO', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            }) : 'Dato ikke satt';

            card.innerHTML = `
                ${ev.image_url ? `<img src="${ev.image_url}" alt="${ev.title}" style="width: 100%; max-height: 240px; object-fit: cover; display: block;">` : ''}
                <div class="card-body" style="padding: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <h3 style="margin: 0; color: var(--color-text-main); font-size: 1.2rem;">${ev.title}</h3>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge" style="padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: ${ev.visibility === 'public' ? 'var(--color-primary)' : 'var(--color-bg-subtle)'}; color: ${ev.visibility === 'public' ? '#FFFFFF' : 'var(--color-text-muted)'}; border: 1px solid var(--color-border);">
                                ${ev.visibility === 'public' ? 'Offentlig' : 'Kun Medlemmer'}
                            </span>
                            ${isAdmin ? `<button type="button" class="btn btn-ghost btn-xs delete-event-btn" data-id="${ev.id}" style="color: var(--color-error); padding: 0.2rem 0.5rem;" title="Slett arrangement">🗑️</button>` : ''}
                        </div>
                    </div>
                    <p class="text-sm" style="color: var(--color-primary); font-weight: 600; margin-bottom: 0.75rem;">
                        📅 ${eventDateFormatted} ${ev.location ? ' • 📍 ' + ev.location : ''}
                    </p>
                    <div style="color: var(--color-text-main); line-height: 1.6; font-size: 0.95rem;">${ev.description || ''}</div>
                </div>
            `;

            if (isAdmin) {
                const delBtn = card.querySelector('.delete-event-btn');
                if (delBtn) {
                    delBtn.onclick = async () => {
                        if (confirm(`Er du sikker på at du vil slette arrangementet "${ev.title}"?`)) {
                            try {
                                await EventAPI.deleteEvent(ev.id);
                                card.remove();
                                alert('Arrangementet ble slettet.');
                            } catch (err) {
                                alert('Kunne ikke slette arrangement: ' + err.message);
                            }
                        }
                    };
                }
            }

            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-center text-error">Kunne ikke laste arrangementer.</p>';
    }
}

function setupNewEventForm() {
    const form = document.getElementById('new-event-form');
    if (!form) return;

    // Init Quill
    const quillContainer = document.getElementById('event-quill-editor');
    if (quillContainer && typeof Quill !== 'undefined' && !eventQuill) {
        try {
            eventQuill = new Quill('#event-quill-editor', {
                theme: 'snow',
                placeholder: 'Skriv detaljer om convention eller arrangementet...'
            });
        } catch (e) {
            console.warn("Quill init error:", e);
        }
    }

    const dropZone = document.getElementById('event-upload-drop-zone');
    const imageInput = document.getElementById('event-image');
    const imagePreviewWrapper = document.getElementById('event-image-preview-wrapper');
    const imagePreview = document.getElementById('event-image-preview');
    const removeImageBtn = document.getElementById('remove-event-image');
    const urlInput = document.getElementById('event-image-url-input');
    const applyUrlBtn = document.getElementById('apply-event-image-url-btn');

    function setImagePreview(src, file = null, url = '') {
        currentEventImageFile = file;
        currentEventImageUrl = url;
        if (imagePreview && imagePreviewWrapper) {
            if (src) {
                imagePreview.src = src;
                imagePreviewWrapper.classList.remove('hidden');
                if (urlInput && url) urlInput.value = url;
            } else {
                imagePreview.src = '';
                imagePreviewWrapper.classList.add('hidden');
                currentEventImageFile = null;
                currentEventImageUrl = '';
                if (imageInput) imageInput.value = '';
                if (urlInput) urlInput.value = '';
            }
        }
    }

    if (removeImageBtn) {
        removeImageBtn.onclick = (e) => {
            e.stopPropagation();
            setImagePreview(null);
        };
    }

    if (dropZone && imageInput) {
        dropZone.onclick = (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                imageInput.click();
            }
        };

        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.background = 'var(--color-primary-light, rgba(235, 78, 118, 0.15))';
        };

        dropZone.ondragleave = () => {
            dropZone.style.background = 'var(--color-bg-subtle)';
        };

        dropZone.ondrop = async (e) => {
            e.preventDefault();
            dropZone.style.background = 'var(--color-bg-subtle)';

            // 1. Check for dropped file
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    setImagePreview(URL.createObjectURL(file), file, '');
                    return;
                }
            }

            // 2. Check for dragged web image / HTML / URI list from other website
            const uriList = e.dataTransfer.getData('text/uri-list');
            const html = e.dataTransfer.getData('text/html');
            const plainText = e.dataTransfer.getData('text/plain');

            let webImageUrl = '';
            if (uriList && /^https?:\/\//i.test(uriList)) {
                webImageUrl = uriList.trim();
            } else if (html) {
                const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (match && match[1]) {
                    webImageUrl = match[1];
                }
            } else if (plainText && /^https?:\/\//i.test(plainText)) {
                webImageUrl = plainText.trim();
            }

            if (webImageUrl) {
                setImagePreview(webImageUrl, null, webImageUrl);
            }
        };

        imageInput.onchange = () => {
            if (imageInput.files && imageInput.files[0]) {
                const file = imageInput.files[0];
                setImagePreview(URL.createObjectURL(file), file, '');
            }
        };
    }

    if (applyUrlBtn && urlInput) {
        applyUrlBtn.onclick = () => {
            const url = urlInput.value.trim();
            if (url && /^https?:\/\//i.test(url)) {
                setImagePreview(url, null, url);
            } else {
                alert('Vennligst oppgi en gyldig bilde-URL (f.eks. https://nettsted.no/bilde.jpg)');
            }
        };
    }

    // Paste listener (Ctrl+V) when modal is open
    document.addEventListener('paste', (e) => {
        const modal = document.getElementById('event-modal');
        if (!modal || modal.classList.contains('hidden')) return;

        if (e.clipboardData && e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    setImagePreview(URL.createObjectURL(blob), blob, '');
                    break;
                }
            }
        }
    });

    form.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('event-title').value.trim();
        const date = document.getElementById('event-date').value;
        const location = document.getElementById('event-location').value.trim();
        const visibility = document.getElementById('event-visibility').value;
        
        let description = '';
        if (eventQuill) {
            description = eventQuill.root.innerHTML.trim();
            if (description === '<p><br></p>') description = '';
        } else {
            const descTextarea = document.getElementById('event-description');
            description = descTextarea ? descTextarea.value.trim() : '';
        }

        if (!title || !date) {
            alert('Vennligst fyll ut tittel og startdato.');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]') || document.getElementById('event-submit-button');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Publiserer arrangement...';
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('date', date);
        formData.append('location', location);
        formData.append('visibility', visibility);
        formData.append('description', description);

        if (currentEventImageFile) {
            formData.append('image', currentEventImageFile);
        } else if (currentEventImageUrl) {
            formData.append('image_url', currentEventImageUrl);
        }

        try {
            await EventAPI.createEvent(formData);
            alert('Arrangementet ble opprettet og publisert!');
            form.reset();
            setImagePreview(null);
            if (eventQuill) eventQuill.setContents([]);
            const modal = document.getElementById('event-modal');
            if (modal) modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            await loadMemberEvents();
        } catch (err) {
            alert('Kunne ikke opprette arrangement: ' + err.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Publiser arrangement';
            }
        }
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents);
} else {
    initEvents();
}
