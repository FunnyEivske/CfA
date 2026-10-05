import { EventAPI, AuthAPI } from './api-client.js';

let eventQuill = null;
let currentEventImageBlob = null;
let currentEventImageUrl = '';

export async function initEvents() {
    loadMemberEvents();
    setupNewEventForm();
}

/**
 * Robust image compressor / scaler using HTML5 Canvas
 * Handles any file size / resolution, keeps aspect ratio, max 1920px, crisp JPEG 88%
 */
async function processImage(fileOrBlobOrUrl) {
    return new Promise((resolve) => {
        if (!fileOrBlobOrUrl) return resolve({ blob: null, dataUrl: '' });

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                const maxDim = 1920;
                let w = img.naturalWidth || img.width;
                let h = img.naturalHeight || img.height;

                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, w, h);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
                canvas.toBlob((blob) => {
                    resolve({ blob: blob || fileOrBlobOrUrl, dataUrl });
                }, 'image/jpeg', 0.88);
            } catch (err) {
                console.warn('Canvas process error:', err);
                resolve({ blob: fileOrBlobOrUrl, dataUrl: '' });
            }
        };

        img.onerror = () => {
            resolve({ blob: fileOrBlobOrUrl, dataUrl: '' });
        };

        if (typeof fileOrBlobOrUrl === 'string') {
            img.src = fileOrBlobOrUrl;
        } else if (fileOrBlobOrUrl instanceof Blob || fileOrBlobOrUrl instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.onerror = () => resolve({ blob: fileOrBlobOrUrl, dataUrl: '' });
            reader.readAsDataURL(fileOrBlobOrUrl);
        } else {
            resolve({ blob: null, dataUrl: '' });
        }
    });
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
                ${ev.image_url ? `<img src="${ev.image_url}" alt="${ev.title}" style="width: 100%; max-height: 260px; object-fit: cover; display: block;">` : ''}
                <div class="card-body" style="padding: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <h3 style="margin: 0; color: var(--color-text-main); font-size: 1.2rem;">${ev.title}</h3>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge" style="padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: ${ev.visibility === 'public' ? 'var(--color-primary)' : 'var(--color-bg-subtle)'}; color: ${ev.visibility === 'public' ? '#FFFFFF' : 'var(--color-text-muted)'}; border: 1px solid var(--color-border);">
                                ${ev.visibility === 'public' ? 'Offentlig' : 'Kun Medlemmer'}
                            </span>
                            ${isAdmin ? `
                                <div style="display: flex; gap: 0.35rem; align-items: center;">
                                    <button type="button" class="btn btn-secondary btn-xs edit-event-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer;">✏️ Rediger</button>
                                    <button type="button" class="btn btn-ghost btn-xs delete-event-btn" data-id="${ev.id}" style="color: var(--color-error); padding: 0.25rem 0.4rem; font-size: 0.85rem; cursor: pointer;" title="Slett arrangement">🗑️</button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <p class="text-sm" style="color: var(--color-primary); font-weight: 600; margin-bottom: 0.75rem;">
                        📅 ${eventDateFormatted} ${ev.location ? ' • 📍 ' + ev.location : ''}
                    </p>
                    <div style="color: var(--color-text-main); line-height: 1.6; font-size: 0.95rem;">${ev.description || ''}</div>
                </div>
            `;

            if (isAdmin) {
                const editBtn = card.querySelector('.edit-event-btn');
                if (editBtn) {
                    editBtn.onclick = () => {
                        openEditEventModal(ev);
                    };
                }

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

function openEditEventModal(ev) {
    let editIdInput = document.getElementById('event-edit-id');
    if (!editIdInput) {
        const form = document.getElementById('new-event-form');
        if (form) {
            editIdInput = document.createElement('input');
            editIdInput.type = 'hidden';
            editIdInput.id = 'event-edit-id';
            form.prepend(editIdInput);
        }
    }

    if (editIdInput) editIdInput.value = ev.id;
    const titleInput = document.getElementById('event-title');
    if (titleInput) titleInput.value = ev.title || '';

    const dateInput = document.getElementById('event-date');
    if (dateInput && ev.date) {
        const d = new Date(ev.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }

    const locationInput = document.getElementById('event-location');
    if (locationInput) locationInput.value = ev.location || '';

    const visSelect = document.getElementById('event-visibility');
    if (visSelect) visSelect.value = ev.visibility || 'public';

    if (eventQuill) {
        eventQuill.root.innerHTML = ev.description || '';
    } else {
        const descTextarea = document.getElementById('event-description');
        if (descTextarea) descTextarea.value = ev.description || '';
    }

    // Image preview
    const imagePreviewWrapper = document.getElementById('event-image-preview-wrapper');
    const imagePreview = document.getElementById('event-image-preview');
    const urlInput = document.getElementById('event-image-url-input');

    if (ev.image_url) {
        currentEventImageUrl = ev.image_url;
        currentEventImageBlob = null;
        if (imagePreview) imagePreview.src = ev.image_url;
        if (imagePreviewWrapper) imagePreviewWrapper.classList.remove('hidden');
        if (urlInput) urlInput.value = ev.image_url;
    } else {
        currentEventImageUrl = '';
        currentEventImageBlob = null;
        if (imagePreviewWrapper) imagePreviewWrapper.classList.add('hidden');
        if (urlInput) urlInput.value = '';
    }

    const modalTitle = document.querySelector('#event-modal .card-header h3');
    if (modalTitle) modalTitle.textContent = 'Rediger arrangement';
    const submitBtn = document.getElementById('event-submit-button') || document.querySelector('#new-event-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Lagre endringer';

    const modal = document.getElementById('event-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }
}

function setupNewEventForm() {
    const form = document.getElementById('new-event-form');
    if (!form) return;

    // Reset when new-event-btn clicked
    const newEventBtn = document.getElementById('new-event-btn');
    if (newEventBtn) {
        newEventBtn.addEventListener('click', () => {
            const editIdInput = document.getElementById('event-edit-id');
            if (editIdInput) editIdInput.value = '';
            form.reset();
            currentEventImageBlob = null;
            currentEventImageUrl = '';
            if (eventQuill) eventQuill.setContents([]);
            const imagePreviewWrapper = document.getElementById('event-image-preview-wrapper');
            if (imagePreviewWrapper) imagePreviewWrapper.classList.add('hidden');
            const modalTitle = document.querySelector('#event-modal .card-header h3');
            if (modalTitle) modalTitle.textContent = 'Opprett nytt arrangement';
            const submitBtn = document.getElementById('event-submit-button') || form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Publiser arrangement';
        });
    }

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

    async function handleIncomingImage(fileOrBlobOrUrl) {
        if (!fileOrBlobOrUrl) return;
        const result = await processImage(fileOrBlobOrUrl);
        if (result.blob) {
            currentEventImageBlob = result.blob;
            currentEventImageUrl = result.dataUrl || '';
            if (imagePreview) imagePreview.src = result.dataUrl || URL.createObjectURL(result.blob);
            if (imagePreviewWrapper) imagePreviewWrapper.classList.remove('hidden');
        } else if (typeof fileOrBlobOrUrl === 'string') {
            currentEventImageUrl = fileOrBlobOrUrl;
            currentEventImageBlob = null;
            if (imagePreview) imagePreview.src = fileOrBlobOrUrl;
            if (imagePreviewWrapper) imagePreviewWrapper.classList.remove('hidden');
        }
    }

    function resetImagePreview() {
        currentEventImageBlob = null;
        currentEventImageUrl = '';
        if (imagePreview) imagePreview.src = '';
        if (imagePreviewWrapper) imagePreviewWrapper.classList.add('hidden');
        if (imageInput) imageInput.value = '';
        if (urlInput) urlInput.value = '';
    }

    if (removeImageBtn) {
        removeImageBtn.onclick = (e) => {
            e.stopPropagation();
            resetImagePreview();
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
                    await handleIncomingImage(file);
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
                if (urlInput) urlInput.value = webImageUrl;
                await handleIncomingImage(webImageUrl);
            }
        };

        imageInput.onchange = async () => {
            if (imageInput.files && imageInput.files[0]) {
                await handleIncomingImage(imageInput.files[0]);
            }
        };
    }

    if (applyUrlBtn && urlInput) {
        applyUrlBtn.onclick = async () => {
            const url = urlInput.value.trim();
            if (url && /^https?:\/\//i.test(url)) {
                await handleIncomingImage(url);
            } else {
                alert('Vennligst oppgi en gyldig bilde-URL (f.eks. https://nettsted.no/bilde.jpg)');
            }
        };
    }

    // Paste listener (Ctrl+V) when modal is open
    document.addEventListener('paste', async (e) => {
        const modal = document.getElementById('event-modal');
        if (!modal || modal.classList.contains('hidden')) return;

        if (e.clipboardData && e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    await handleIncomingImage(blob);
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

        const editIdInput = document.getElementById('event-edit-id');
        const editId = editIdInput ? editIdInput.value : '';

        const submitBtn = form.querySelector('button[type="submit"]') || document.getElementById('event-submit-button');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Lagrer arrangement...';
        }

        const formData = new FormData();
        if (editId) formData.append('id', editId);
        formData.append('title', title);
        formData.append('date', date);
        formData.append('location', location);
        formData.append('visibility', visibility);
        formData.append('description', description);

        if (currentEventImageBlob) {
            formData.append('image', currentEventImageBlob, 'event_banner.jpg');
        } else if (currentEventImageUrl && currentEventImageUrl.startsWith('data:image')) {
            formData.append('image_base64', currentEventImageUrl);
        } else if (currentEventImageUrl) {
            formData.append('image_url', currentEventImageUrl);
        }

        try {
            if (editId) {
                await EventAPI.updateEvent(formData);
                alert('Arrangementet ble oppdatert!');
            } else {
                await EventAPI.createEvent(formData);
                alert('Arrangementet ble opprettet og publisert!');
            }

            form.reset();
            if (editIdInput) editIdInput.value = '';
            resetImagePreview();
            if (eventQuill) eventQuill.setContents([]);
            const modal = document.getElementById('event-modal');
            if (modal) modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            await loadMemberEvents();
        } catch (err) {
            alert('Kunne ikke lagre arrangement: ' + err.message);
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
