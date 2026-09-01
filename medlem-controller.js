import { AuthAPI, MemberAPI, GalleryAPI, EventAPI, SettingsAPI, DocumentAPI } from './api-client.js';

let currentUser = null;
let currentWorkshopData = null;

export function openModal(modalId) {
    document.querySelectorAll('.modal-container').forEach(m => m.classList.add('hidden'));
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
    const anyOpen = document.querySelector('.modal-container:not(.hidden)');
    if (!anyOpen) {
        document.body.classList.remove('modal-open');
    }
}

export async function initMedlemPage() {
    setupTabSwitching();
    setupModals();
    setupNotificationsToggle();
    await setupProfileData();
    setupProfileForm();
    setupAdminEditMemberForm();
    setupDocuments();
    setupGalleryManagement();
    setupStatusManagement();
    setupMemberGalleryModal();
    loadSidebarMembers();
    loadDashboardGallery();
    loadWorkshopStatus();
}

function setupTabSwitching() {
    const tabPosts = document.getElementById('tab-posts');
    const tabEvents = document.getElementById('tab-events');
    const postsSection = document.getElementById('posts-section');
    const eventsSection = document.getElementById('events-section');

    if (tabPosts && tabEvents && postsSection && eventsSection) {
        tabPosts.addEventListener('click', () => {
            postsSection.classList.remove('hidden');
            eventsSection.classList.add('hidden');
            tabPosts.className = 'btn btn-primary text-sm';
            tabEvents.className = 'btn btn-secondary text-sm';
        });

        tabEvents.addEventListener('click', () => {
            eventsSection.classList.remove('hidden');
            postsSection.classList.add('hidden');
            tabEvents.className = 'btn btn-primary text-sm';
            tabPosts.className = 'btn btn-secondary text-sm';
        });
    }
}

function setupModals() {
    // 1. Hoved-Adminpanel
    bindClick('open-admin-control-btn', () => openModal('admin-control-modal'));
    bindClick('close-admin-control-modal', () => closeModal('admin-control-modal'));
    bindClick('close-admin-control-footer', () => closeModal('admin-control-modal'));

    // 2. Medlemsadministrasjon (Admin)
    bindClick('admin-panel-members-btn', () => {
        openModal('admin-members-modal');
        renderAdminMembersList();
    });
    bindClick('close-admin-members-modal', () => closeModal('admin-members-modal'));
    bindClick('close-admin-members-footer', () => closeModal('admin-members-modal'));
    bindClick('close-admin-edit-member-modal', () => closeModal('admin-edit-member-modal'));
    bindClick('cancel-admin-edit-member', () => closeModal('admin-edit-member-modal'));

    bindClick('admin-add-user-btn', async () => {
        const email = prompt('Skriv inn e-post for det nye medlemmet:');
        if (!email || !email.trim()) return;
        const name = prompt('Skriv inn visningsnavn:', email.split('@')[0]);
        const password = prompt('Midlertidig passord:', '123456');
        try {
            await MemberAPI.createMember(email.trim(), password || '123456', name ? name.trim() : 'Medlem', 'medlem');
            alert('Brukeren ble opprettet!');
            renderAdminMembersList();
            loadSidebarMembers();
        } catch (err) {
            alert('Kunne ikke opprette bruker: ' + err.message);
        }
    });

    // 3. Galleri-administrasjon (Admin)
    bindClick('admin-panel-gallery-btn', () => {
        openModal('admin-image-modal');
        renderAdminGalleryList();
    });
    bindClick('close-admin-image-modal', () => closeModal('admin-image-modal'));
    bindClick('close-admin-image-footer', () => closeModal('admin-image-modal'));

    // 4. Status & Åpningstider (Admin)
    bindClick('admin-panel-status-btn', () => {
        populateStatusModal();
        openModal('admin-status-modal');
    });
    bindClick('close-admin-status-modal', () => closeModal('admin-status-modal'));
    bindClick('close-admin-status-footer', () => closeModal('admin-status-modal'));

    // 5. Profil Modal
    bindClick('open-profile-modal', () => {
        const nameInput = document.getElementById('display-name-input');
        if (nameInput && currentUser) {
            nameInput.value = currentUser.display_name || '';
        }
        openModal('profile-modal');
    });
    bindClick('close-profile-modal-x', () => closeModal('profile-modal'));
    bindClick('close-profile-modal', () => closeModal('profile-modal'));
    bindClick('cancel-profile-modal', () => closeModal('profile-modal'));

    // 6. Innlegg & Convention knapper
    bindClick('new-post-btn', () => openModal('post-modal'));
    bindClick('close-post-modal', () => closeModal('post-modal'));
    bindClick('cancel-post-modal', () => closeModal('post-modal'));

    bindClick('new-event-btn', () => openModal('event-modal'));
    bindClick('close-event-modal', () => closeModal('event-modal'));
    bindClick('cancel-event-modal', () => closeModal('event-modal'));

    // 7. Dokumenter Modal
    bindClick('close-documents-modal', () => closeModal('view-documents-modal'));
    bindClick('close-documents-footer-btn', () => closeModal('view-documents-modal'));

    // 8. Globale overlegg & ESC-tast
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const container = overlay.closest('.modal-container');
            if (container) container.classList.add('hidden');
            const anyOpen = document.querySelector('.modal-container:not(.hidden)');
            if (!anyOpen) document.body.classList.remove('modal-open');
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-container:not(.hidden)').forEach(m => m.classList.add('hidden'));
            document.body.classList.remove('modal-open');
        }
    });
}

function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            handler(e);
        });
    }
}

function setupProfileForm() {
    const form = document.getElementById('profile-form');
    const nameInput = document.getElementById('display-name-input');
    const fileInput = document.getElementById('profile-image-file-input');
    const previewContainer = document.getElementById('profile-preview-container');
    const previewImg = document.getElementById('profile-image-preview');
    const previewName = document.getElementById('profile-image-name');
    const removeBtn = document.getElementById('remove-profile-image-btn');
    const submitBtn = document.getElementById('save-profile-button');

    if (fileInput) {
        fileInput.onchange = () => {
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                if (previewImg) previewImg.src = URL.createObjectURL(file);
                if (previewName) previewName.textContent = file.name;
                if (previewContainer) previewContainer.classList.remove('hidden');
            }
        };
    }

    if (removeBtn) {
        removeBtn.onclick = () => {
            if (fileInput) fileInput.value = '';
            if (previewContainer) previewContainer.classList.add('hidden');
        };
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const newName = nameInput ? nameInput.value.trim() : '';
            if (!newName) {
                alert('Vennligst oppgi et visningsnavn.');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Lagrer...';
            }

            try {
                await AuthAPI.updateProfile(newName);
                if (currentUser) currentUser.display_name = newName;

                const profileNameEl = document.getElementById('profile-name');
                if (profileNameEl) profileNameEl.textContent = newName;

                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    const avatarRes = await AuthAPI.uploadAvatar(formData);
                    if (avatarRes && avatarRes.photo_url) {
                        if (currentUser) currentUser.photo_url = avatarRes.photo_url;
                        const profileImgEl = document.getElementById('profile-img');
                        if (profileImgEl) profileImgEl.src = avatarRes.photo_url;
                    }
                }

                alert('Profilen din ble oppdatert!');
                closeModal('profile-modal');
                if (fileInput) fileInput.value = '';
                if (previewContainer) previewContainer.classList.add('hidden');
            } catch (err) {
                alert('Kunne ikke oppdatere profil: ' + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Lagre';
                }
            }
        };
    }
}

// Sidepanel: Høyre medlemsliste
async function loadSidebarMembers() {
    const listContainer = document.getElementById('sidebar-members-list');
    if (!listContainer) return;

    try {
        const res = await MemberAPI.getMembers();
        const members = res.members || [];
        listContainer.innerHTML = '';

        if (members.length === 0) {
            listContainer.innerHTML = '<p class="text-muted text-sm">Ingen medlemmer funnet.</p>';
            return;
        }

        members.forEach(m => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
            row.innerHTML = `
                <img src="${m.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.display_name)}" alt="${m.display_name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--color-border);">
                <div>
                    <strong style="font-size: 0.85rem; color: var(--color-text-main); display: block;">${m.display_name}</strong>
                    <span style="font-size: 0.75rem; color: var(--color-text-muted);">${m.role === 'admin' ? 'Administrator' : 'Medlem'}</span>
                </div>
            `;
            listContainer.appendChild(row);
        });
    } catch (e) {
        listContainer.innerHTML = '<p class="text-muted text-sm">Kunne ikke laste medlemmer.</p>';
    }
}

// Sidepanel: Mitt Galleri
async function loadDashboardGallery() {
    const previewContainer = document.getElementById('dashboard-gallery-preview');
    const galleryCountEl = document.getElementById('gallery-count-value');

    try {
        const res = await GalleryAPI.getGallery('my');
        const items = res.gallery || [];
        
        if (galleryCountEl) galleryCountEl.textContent = items.length;

        if (previewContainer) {
            previewContainer.innerHTML = '';
            if (items.length === 0) {
                previewContainer.innerHTML = '<p class="text-muted text-xs" style="grid-column: 1/-1;">Ingen bilder ennå.</p>';
                return;
            }

            const latest = items.slice(0, 4);
            latest.forEach(img => {
                const imgEl = document.createElement('div');
                imgEl.style.cssText = 'aspect-ratio: 1; border-radius: 6px; overflow: hidden; border: 1px solid var(--color-border);';
                imgEl.innerHTML = `<img src="${img.image_url}" alt="${img.title || 'Galleri'}" style="width: 100%; height: 100%; object-fit: cover;">`;
                previewContainer.appendChild(imgEl);
            });
        }
    } catch (e) {
        if (previewContainer) previewContainer.innerHTML = '<p class="text-muted text-xs" style="grid-column: 1/-1;">Kunne ikke laste bilder.</p>';
    }
}

let selectedGalleryFiles = [];

// Rask klient-side bildeoptimalisering (hindrer at store kamera-bilder fra mobil krasjer servergrensen)
async function optimizeImageForUpload(file, maxWidth = 2048, quality = 0.85) {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            let width = img.width;
            let height = img.height;

            if (width <= maxWidth && height <= maxWidth && file.size < 1.5 * 1024 * 1024) {
                // Allerede passe størrelse
                resolve(file);
                return;
            }

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxWidth) {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                        const optimizedFile = new File([blob], cleanName, { type: 'image/jpeg' });
                        resolve(optimizedFile);
                    } else {
                        resolve(file);
                    }
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };

        img.src = url;
    });
}

// Medlem Galleri-Modal ("Administrer bilder")
function setupMemberGalleryModal() {
    bindClick('upload-gallery-btn', () => {
        openModal('upload-modal');
        loadModalGallery();
    });
    bindClick('close-upload-modal', () => closeModal('upload-modal'));
    bindClick('close-upload-modal-x', () => closeModal('upload-modal'));

    const fileInput = document.getElementById('upload-files-input');
    const dropZone = document.getElementById('upload-drop-zone');
    const pendingContainer = document.getElementById('pending-uploads-container');
    const actionsContainer = document.getElementById('upload-actions');
    const uploadForm = document.getElementById('upload-form');

    function renderPendingList() {
        if (!pendingContainer || !actionsContainer) return;
        pendingContainer.innerHTML = '';
        if (selectedGalleryFiles.length > 0) {
            pendingContainer.classList.remove('hidden');
            actionsContainer.classList.remove('hidden');

            selectedGalleryFiles.forEach((fileObj, idx) => {
                const card = document.createElement('div');
                card.className = 'pending-upload-card';
                card.style.cssText = 'position: relative; border-radius: 8px; border: 1px solid var(--color-border); overflow: hidden; background: var(--color-bg-surface);';
                card.innerHTML = `
                    <div style="position: relative;">
                        <img src="${URL.createObjectURL(fileObj.file)}" class="pending-upload-preview" alt="Preview" style="width: 100%; height: 120px; object-fit: cover;">
                        <button type="button" class="btn btn-ghost btn-xs remove-pending-btn" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; border: none;" title="Fjern">✕</button>
                    </div>
                    <div class="pending-upload-info" style="padding: 0.5rem;">
                        <input type="text" class="form-input text-xs pending-title-input" placeholder="Tittel på bilde" value="${fileObj.title}">
                    </div>
                `;

                const titleInp = card.querySelector('.pending-title-input');
                if (titleInp) {
                    titleInp.oninput = () => { fileObj.title = titleInp.value; };
                }

                const removeBtn = card.querySelector('.remove-pending-btn');
                if (removeBtn) {
                    removeBtn.onclick = () => {
                        selectedGalleryFiles.splice(idx, 1);
                        renderPendingList();
                    };
                }

                pendingContainer.appendChild(card);
            });
        } else {
            pendingContainer.classList.add('hidden');
            actionsContainer.classList.add('hidden');
        }
    }

    function addFiles(newFiles) {
        Array.from(newFiles).forEach(f => {
            const isImage = (f.type && f.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|avif|bmp|jfif)$/i.test(f.name);
            if (isImage) {
                selectedGalleryFiles.push({
                    file: f,
                    title: f.name ? f.name.replace(/\.[^/.]+$/, '') : 'Bilde'
                });
            }
        });
        renderPendingList();
    }

    if (fileInput) {
        fileInput.onchange = () => {
            if (fileInput.files && fileInput.files.length > 0) {
                addFiles(fileInput.files);
                fileInput.value = '';
            }
        };
    }

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                addFiles(e.dataTransfer.files);
            }
        });
    }

    if (uploadForm) {
        uploadForm.onsubmit = async (e) => {
            e.preventDefault();
            if (selectedGalleryFiles.length === 0) return;

            const submitBtn = document.getElementById('confirm-upload-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
            }

            let successCount = 0;
            const total = selectedGalleryFiles.length;
            const failedNames = [];

            for (let i = 0; i < total; i++) {
                if (submitBtn) submitBtn.textContent = `Behandler og laster opp ${i + 1} av ${total}...`;
                const item = selectedGalleryFiles[i];
                try {
                    const optimized = await optimizeImageForUpload(item.file);
                    const formData = new FormData();
                    formData.append('file', optimized);
                    formData.append('title', item.title || item.file.name);
                    await GalleryAPI.uploadImage(formData);
                    successCount++;
                } catch (err) {
                    console.error('Error uploading file:', item.file.name, err);
                    failedNames.push(item.file.name);
                }
            }

            if (failedNames.length === 0) {
                alert(`Alle ${successCount} bildene ble lastet opp!`);
            } else {
                alert(`${successCount} av ${total} bilder ble lastet opp. Følgende feilet: ${failedNames.join(', ')}`);
            }

            selectedGalleryFiles = [];
            renderPendingList();
            await loadModalGallery();
            await loadDashboardGallery();

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Last opp alle valgte bilder';
            }
        };
    }
}

async function loadModalGallery() {
    const modalGalleryContainer = document.getElementById('modal-gallery-container');
    if (!modalGalleryContainer) return;

    modalGalleryContainer.innerHTML = '<p class="text-muted text-sm" style="grid-column: 1/-1;">Laster galleri...</p>';
    try {
        const res = await GalleryAPI.getGallery('my');
        const items = res.gallery || [];
        modalGalleryContainer.innerHTML = '';

        if (items.length === 0) {
            modalGalleryContainer.innerHTML = '<p class="text-muted text-sm" style="grid-column: 1/-1;">Ingen bilder lastet opp ennå.</p>';
            return;
        }

        items.forEach(img => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.style.cssText = 'position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; border: 1px solid var(--color-border);';
            item.innerHTML = `
                <img src="${img.image_url}" alt="${img.title || 'Bilde'}" style="width: 100%; height: 100%; object-fit: cover;">
                <button type="button" class="delete-gallery-btn" data-id="${img.id}" style="position: absolute; top: 4px; right: 4px; background: rgba(220, 38, 38, 0.9); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px;" title="Slett bilde">✕</button>
            `;

            const delBtn = item.querySelector('.delete-gallery-btn');
            if (delBtn) {
                delBtn.onclick = async (ev) => {
                    ev.stopPropagation();
                    if (confirm('Vil du slette dette bildet?')) {
                        try {
                            await GalleryAPI.deleteImage(img.id);
                            item.remove();
                            loadDashboardGallery();
                        } catch (e) {
                            alert('Kunne ikke slette bilde: ' + e.message);
                        }
                    }
                };
            }

            modalGalleryContainer.appendChild(item);
        });
    } catch (e) {
        modalGalleryContainer.innerHTML = '<p class="text-muted text-sm" style="grid-column: 1/-1;">Kunne ikke laste galleri.</p>';
    }
}

async function renderAdminMembersList() {
    const container = document.getElementById('admin-members-list-container');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-muted py-4">Laster medlemsliste...</p>';
    try {
        const res = await MemberAPI.getMembers();
        const members = res.members || [];
        container.innerHTML = '';

        if (members.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Ingen registrerte medlemmer.</p>';
            return;
        }

        members.forEach(m => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; background: var(--color-bg-subtle); border-radius: 8px; border: 1px solid var(--color-border); flex-wrap: wrap; gap: 0.75rem;';
            
            const joinDateFormatted = m.member_since ? new Date(m.member_since).toLocaleDateString('nb-NO') : 'Ikke satt';

            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.9rem;">
                    <img src="${m.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.display_name)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-border);">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <strong style="color: var(--color-text-main); font-size: 0.95rem;">${m.display_name}</strong>
                            <span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; background: ${m.role === 'admin' ? 'var(--color-primary)' : 'var(--color-bg-surface)'}; color: ${m.role === 'admin' ? '#FFFFFF' : 'var(--color-text-muted)'}; border: 1px solid var(--color-border);">${m.role === 'admin' ? 'Admin' : 'Medlem'}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 2px;">${m.email}</div>
                        <div style="font-size: 0.72rem; color: var(--color-text-muted); opacity: 0.8;">Medlem siden: ${joinDateFormatted}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button type="button" class="btn btn-secondary btn-xs edit-user-btn" style="padding: 0.4rem 0.75rem; font-size: 0.8rem; cursor: pointer;">✏️ Rediger</button>
                    <button type="button" class="btn btn-ghost btn-xs delete-user-btn" data-id="${m.id}" style="color: var(--color-error); cursor: pointer; padding: 0.4rem 0.6rem;" title="Slett medlem">🗑️</button>
                </div>
            `;

            const editBtn = item.querySelector('.edit-user-btn');
            if (editBtn) {
                editBtn.onclick = () => {
                    openAdminEditMemberModal(m);
                };
            }

            const deleteBtn = item.querySelector('.delete-user-btn');
            if (deleteBtn) {
                deleteBtn.onclick = async () => {
                    if (confirm(`Er du sikker på at du vil slette brukeren ${m.display_name} (${m.email})?`)) {
                        try {
                            await MemberAPI.deleteMember(m.id);
                            item.remove();
                            loadSidebarMembers();
                            alert(`Brukeren ${m.display_name} ble slettet.`);
                        } catch (err) {
                            alert('Kunne ikke slette bruker: ' + err.message);
                        }
                    }
                };
            }

            container.appendChild(item);
        });
    } catch (err) {
        container.innerHTML = '<p class="text-center text-error">Kunne ikke laste brukere: ' + err.message + '</p>';
    }
}

function openAdminEditMemberModal(member) {
    const idInput = document.getElementById('edit-member-id');
    const nameInput = document.getElementById('edit-member-name');
    const emailInput = document.getElementById('edit-member-email');
    const roleSelect = document.getElementById('edit-member-role');
    const sinceInput = document.getElementById('edit-member-since');
    const avatarPreview = document.getElementById('edit-member-avatar-preview');
    const avatarFileInput = document.getElementById('edit-member-avatar-input');
    const pwdInput = document.getElementById('edit-member-password');

    if (idInput) idInput.value = member.id || '';
    if (nameInput) nameInput.value = member.display_name || '';
    if (emailInput) emailInput.value = member.email || '';
    if (roleSelect) roleSelect.value = member.role || 'medlem';
    if (sinceInput) sinceInput.value = member.member_since ? member.member_since.split('T')[0] : '';
    if (avatarPreview) avatarPreview.src = member.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.display_name);
    if (avatarFileInput) avatarFileInput.value = '';
    if (pwdInput) pwdInput.value = '';

    openModal('admin-edit-member-modal');
}

function setupAdminEditMemberForm() {
    const form = document.getElementById('admin-edit-member-form');
    const avatarInput = document.getElementById('edit-member-avatar-input');
    const avatarPreview = document.getElementById('edit-member-avatar-preview');
    const saveBtn = document.getElementById('save-admin-edit-member-btn');

    if (avatarInput && avatarPreview) {
        avatarInput.onchange = () => {
            if (avatarInput.files && avatarInput.files[0]) {
                avatarPreview.src = URL.createObjectURL(avatarInput.files[0]);
            }
        };
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-member-id').value;
            const name = document.getElementById('edit-member-name').value.trim();
            const email = document.getElementById('edit-member-email').value.trim();
            const role = document.getElementById('edit-member-role').value;
            const memberSince = document.getElementById('edit-member-since').value;
            const password = document.getElementById('edit-member-password').value.trim();

            if (!name || !email) {
                alert('Vennligst fyll ut navn og e-post.');
                return;
            }

            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Lagrer endringer...';
            }

            try {
                const formData = new FormData();
                formData.append('id', id);
                formData.append('display_name', name);
                formData.append('email', email);
                formData.append('role', role);
                formData.append('member_since', memberSince);
                if (password) {
                    formData.append('password', password);
                }
                if (avatarInput && avatarInput.files && avatarInput.files[0]) {
                    formData.append('photo', avatarInput.files[0]);
                }

                await MemberAPI.updateMember(formData);
                alert(`Medlemmet ${name} ble oppdatert!`);
                closeModal('admin-edit-member-modal');
                await renderAdminMembersList();
                await loadSidebarMembers();
            } catch (err) {
                alert('Feil ved oppdatering: ' + err.message);
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Lagre endringer';
                }
            }
        };
    }
}

let currentDocCategory = 'vedtekter';
let docQuill = null;
let currentSelectedDocFile = null;

function setupDocuments() {
    bindClick('btn-referater', () => openDocumentsModal('referater', '📝 Møtereferater', '+ Nytt møtereferat'));
    bindClick('btn-retningslinjer', () => openDocumentsModal('retningslinjer', '🛡️ Retningslinjer & Husregler', '+ Ny retningslinje'));
    bindClick('btn-vedtekter', () => openDocumentsModal('vedtekter', '📜 Vedtekter for CfA', '+ Ny vedtekt / paragraf'));
    
    bindClick('close-doc-entry-modal', () => closeModal('doc-entry-modal'));
    bindClick('cancel-doc-entry-modal', () => closeModal('doc-entry-modal'));

    const addDocBtn = document.getElementById('admin-add-doc-btn');
    if (addDocBtn) {
        addDocBtn.onclick = () => {
            openDocEntryModal();
        };
    }

    // Init Quill for document editor if present
    const quillContainer = document.getElementById('doc-quill-editor');
    if (quillContainer && typeof Quill !== 'undefined' && !docQuill) {
        try {
            docQuill = new Quill('#doc-quill-editor', {
                theme: 'snow',
                placeholder: 'Skriv innholdet eller referatet her...'
            });
        } catch (e) {
            console.warn("Quill init error:", e);
        }
    }

    // Setup PDF dropzone & file auto-reader
    const dropzone = document.getElementById('doc-pdf-dropzone');
    const fileInput = document.getElementById('doc-pdf-input');
    if (dropzone && fileInput) {
        dropzone.onclick = () => fileInput.click();

        dropzone.ondragover = (e) => {
            e.preventDefault();
            dropzone.style.background = 'var(--color-primary-light, rgba(235, 78, 118, 0.15))';
        };

        dropzone.ondragleave = () => {
            dropzone.style.background = 'var(--color-bg-subtle)';
        };

        dropzone.ondrop = (e) => {
            e.preventDefault();
            dropzone.style.background = 'var(--color-bg-subtle)';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleDocFileSelect(e.dataTransfer.files[0]);
            }
        };

        fileInput.onchange = () => {
            if (fileInput.files && fileInput.files[0]) {
                handleDocFileSelect(fileInput.files[0]);
            }
        };
    }

    const docForm = document.getElementById('doc-entry-form');
    if (docForm) {
        docForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('doc-entry-id').value;
            const category = document.getElementById('doc-entry-category').value || currentDocCategory;
            const title = document.getElementById('doc-entry-name').value.trim();
            const date = document.getElementById('doc-entry-date').value;
            
            let content = '';
            if (docQuill && !document.getElementById('doc-quill-editor').classList.contains('hidden')) {
                content = docQuill.root.innerHTML.trim();
                if (content === '<p><br></p>') content = '';
            } else {
                content = document.getElementById('doc-entry-content').value.trim();
            }

            if (!title || !content) {
                alert('Vennligst fyll ut tittel og innhold.');
                return;
            }

            const submitBtn = document.getElementById('save-doc-entry-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Lagrer...';
            }

            const formData = new FormData();
            if (id) formData.append('id', id);
            formData.append('category', category);
            formData.append('title', title);
            formData.append('content', content);
            formData.append('document_date', date);

            if (currentSelectedDocFile) {
                formData.append('pdf_file', currentSelectedDocFile);
            }

            try {
                await DocumentAPI.saveDocument(formData);
                alert('Dokumentet ble lagret!');
                closeModal('doc-entry-modal');
                await loadDocuments(category);
            } catch (err) {
                alert('Kunne ikke lagre dokument: ' + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Lagre';
                }
            }
        };
    }
}

async function handleDocFileSelect(file) {
    currentSelectedDocFile = file;
    const statusEl = document.getElementById('doc-pdf-status');
    if (statusEl) {
        statusEl.classList.remove('hidden');
        statusEl.textContent = '⏳ Leser ut innhold og formatering fra ' + file.name + '...';
    }

    const nameInput = document.getElementById('doc-entry-name');
    if (nameInput && (!nameInput.value || nameInput.value.trim() === '')) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        nameInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        if (typeof window.pdfjsLib === 'undefined') {
            if (statusEl) statusEl.textContent = 'PDF lastet opp som vedlegg: ' + file.name;
            return;
        }

        try {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let extractedHtml = '';
            let extractedPlain = '';

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                let lastY = null;
                let pageLines = [];
                let currentLine = '';

                for (const item of textContent.items) {
                    if (lastY !== null && Math.abs(item.transform[5] - lastY) > 6) {
                        if (currentLine.trim()) pageLines.push(currentLine.trim());
                        currentLine = '';
                    }
                    currentLine += (currentLine ? ' ' : '') + item.str;
                    lastY = item.transform[5];
                }
                if (currentLine.trim()) pageLines.push(currentLine.trim());

                let structuredPage = '';
                let plainPage = '';
                for (const line of pageLines) {
                    const isHeader = /^(\d+[\.\)]|§\s*\d+|kapittel\s+\d+|paragraf\s+\d+|vedtekt\s+\d+)/i.test(line) || (line.length < 50 && line === line.toUpperCase() && /[A-ZÆØÅ]/.test(line));
                    if (isHeader) {
                        structuredPage += `<h3 style="margin-top: 1rem; margin-bottom: 0.5rem; color: var(--color-primary); font-size: 1.15rem;">${line}</h3>`;
                        plainPage += `\n${line}\n`;
                    } else {
                        structuredPage += `<p style="margin-bottom: 0.5rem; line-height: 1.6;">${line}</p>`;
                        plainPage += `${line}\n`;
                    }
                }

                if (pdf.numPages > 1) {
                    extractedHtml += `<div class="pdf-page mb-3"><div style="font-size: 0.75rem; color: var(--color-text-muted); border-bottom: 1px dashed var(--color-border); padding-bottom: 2px; margin-bottom: 8px;">--- Side ${pageNum} ---</div>${structuredPage}</div>`;
                    extractedPlain += `\n--- Side ${pageNum} ---\n${plainPage}\n`;
                } else {
                    extractedHtml += structuredPage;
                    extractedPlain += plainPage;
                }
            }

            if (docQuill) {
                docQuill.root.innerHTML = extractedHtml;
            }
            const textarea = document.getElementById('doc-entry-content');
            if (textarea) {
                textarea.value = extractedPlain.trim();
            }

            if (statusEl) {
                statusEl.textContent = `✅ ${pdf.numPages} side(r) ble lest ut og formatert! Vedlegget "${file.name}" er klart.`;
            }
        } catch (err) {
            if (statusEl) statusEl.textContent = 'PDF lagt til: ' + file.name + ' (Feil ved tekstuthenting: ' + err.message + ')';
        }
    } else {
        try {
            const text = await file.text();
            if (docQuill) {
                const formatted = text.split('\n').map(l => l.trim() ? `<p>${l}</p>` : '<br>').join('');
                docQuill.root.innerHTML = formatted;
            }
            const textarea = document.getElementById('doc-entry-content');
            if (textarea) textarea.value = text;
            if (statusEl) statusEl.textContent = `✅ Innholdet fra ${file.name} ble fylt inn!`;
        } catch (err) {
            if (statusEl) statusEl.textContent = 'Fil lagt til: ' + file.name;
        }
    }
}

async function openDocumentsModal(category, titleText, addBtnText) {
    currentDocCategory = category;
    const titleEl = document.getElementById('documents-modal-title');
    const addBtn = document.getElementById('admin-add-doc-btn');
    
    if (titleEl) titleEl.textContent = titleText;
    if (addBtn) {
        addBtn.textContent = addBtnText;
        if (currentUser && currentUser.role === 'admin') {
            addBtn.classList.remove('hidden');
        } else {
            addBtn.classList.add('hidden');
        }
    }

    openModal('view-documents-modal');
    await loadDocuments(category);
}

async function loadDocuments(category) {
    const listContainer = document.getElementById('documents-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = '<p class="text-center text-muted py-6">Laster dokumenter...</p>';

    try {
        const res = await DocumentAPI.getDocuments(category);
        const docs = res.documents || [];
        listContainer.innerHTML = '';

        if (docs.length === 0) {
            listContainer.innerHTML = `<p class="text-center text-muted py-6">Ingen dokumenter lagt inn i denne kategorien ennå.${currentUser && currentUser.role === 'admin' ? ' Trykk på knappen over for å laste opp eller skrive inn.' : ''}</p>`;
            return;
        }

        const isAdmin = currentUser && currentUser.role === 'admin';

        docs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-radius: 8px; padding: 1.25rem; margin-bottom: 0.75rem;';

            const dateFormatted = doc.document_date ? new Date(doc.document_date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

            // Format content
            const isHtml = /<[a-z][\s\S]*>/i.test(doc.content);
            const formattedContent = isHtml ? doc.content : doc.content.split('\n').map(p => p.trim() ? `<p style="margin-bottom: 0.5rem;">${p}</p>` : '').join('');

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
                    <div>
                        <h4 style="margin: 0; color: var(--color-text-main); font-size: 1.15rem;">${doc.title}</h4>
                        ${dateFormatted ? `<div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.25rem;">📅 ${dateFormatted}</div>` : ''}
                    </div>
                    ${isAdmin ? `
                        <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                            <button type="button" class="btn btn-secondary btn-xs edit-doc-btn" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; cursor: pointer;">✏️ Rediger</button>
                            <button type="button" class="btn btn-ghost btn-xs delete-doc-btn" style="color: var(--color-error); padding: 0.3rem 0.5rem; font-size: 0.75rem; cursor: pointer;" title="Slett">🗑️</button>
                        </div>
                    ` : ''}
                </div>
                <div class="doc-body" style="color: var(--color-text-main); line-height: 1.7; font-size: 0.95rem;">
                    ${formattedContent}
                </div>
                ${doc.file_url ? `
                    <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--color-border);">
                        <a href="${doc.file_url}" target="_blank" class="button button-secondary" style="font-size: 0.8rem; padding: 0.35rem 0.75rem; display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: none;">
                            📄 Åpne / Last ned originalt PDF-vedlegg
                        </a>
                    </div>
                ` : ''}
            `;

            if (isAdmin) {
                const editBtn = card.querySelector('.edit-doc-btn');
                if (editBtn) {
                    editBtn.onclick = () => {
                        openDocEntryModal(doc);
                    };
                }

                const deleteBtn = card.querySelector('.delete-doc-btn');
                if (deleteBtn) {
                    deleteBtn.onclick = async () => {
                        if (confirm(`Er du sikker på at du vil slette "${doc.title}"?`)) {
                            try {
                                await DocumentAPI.deleteDocument(doc.id);
                                card.remove();
                                alert('Dokumentet ble slettet.');
                            } catch (e) {
                                alert('Kunne ikke slette dokument: ' + e.message);
                            }
                        }
                    };
                }
            }

            listContainer.appendChild(card);
        });
    } catch (err) {
        listContainer.innerHTML = '<p class="text-center text-error">Kunne ikke hente dokumenter: ' + err.message + '</p>';
    }
}

function openDocEntryModal(doc = null) {
    currentSelectedDocFile = null;
    const idInput = document.getElementById('doc-entry-id');
    const catInput = document.getElementById('doc-entry-category');
    const nameInput = document.getElementById('doc-entry-name');
    const dateInput = document.getElementById('doc-entry-date');
    const textarea = document.getElementById('doc-entry-content');
    const quillDiv = document.getElementById('doc-quill-editor');
    const richTextHint = document.getElementById('doc-rich-text-hint');
    const modalTitle = document.getElementById('doc-entry-title');
    const statusEl = document.getElementById('doc-pdf-status');
    const fileInput = document.getElementById('doc-pdf-input');

    if (fileInput) fileInput.value = '';
    if (statusEl) {
        statusEl.classList.add('hidden');
        statusEl.textContent = '';
    }

    if (idInput) idInput.value = doc ? doc.id : '';
    if (catInput) catInput.value = currentDocCategory;
    if (nameInput) nameInput.value = doc ? doc.title : '';
    if (dateInput) dateInput.value = doc && doc.document_date ? doc.document_date.split('T')[0] : new Date().toISOString().split('T')[0];
    
    if (modalTitle) {
        modalTitle.textContent = doc ? `✏️ Rediger ${doc.title}` : (currentDocCategory === 'referater' ? '📝 Nytt Møtereferat' : '📜 Nytt Dokument / Retningslinje');
    }

    // Always show Quill editor for nice formatting across all document types
    if (quillDiv) quillDiv.classList.remove('hidden');
    if (richTextHint) richTextHint.classList.remove('hidden');
    if (textarea) textarea.classList.add('hidden');
    if (docQuill) {
        docQuill.root.innerHTML = doc ? doc.content : '';
    }

    openModal('doc-entry-modal');
}

async function renderAdminGalleryList() {
    const container = document.getElementById('admin-gallery-list-container');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-muted py-4" style="grid-column: 1/-1;">Laster alle bilder...</p>';
    try {
        const res = await GalleryAPI.getGallery('admin');
        const items = res.gallery || [];
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-4" style="grid-column: 1/-1;">Ingen opplastede bilder ennå.</p>';
            return;
        }

        items.forEach(img => {
            const card = document.createElement('div');
            card.style.cssText = 'position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--color-border); background: var(--color-bg-surface); display: flex; flex-direction: column;';
            
            const isPublic = img.is_public == 1;

            card.innerHTML = `
                <div style="position: relative;">
                    <img src="${img.image_url}" alt="${img.title || 'Galleri'}" style="width: 100%; height: 140px; object-fit: cover;">
                    <button type="button" class="btn btn-ghost btn-xs delete-img-btn" data-id="${img.id}" style="position: absolute; top: 4px; right: 4px; background: rgba(220, 38, 38, 0.9); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; padding: 0;" title="Slett bilde permanent">🗑️</button>
                </div>
                <div style="padding: 0.6rem; display: flex; flex-direction: column; gap: 0.4rem; background: var(--color-bg-subtle); flex: 1; justify-content: space-between;">
                    <div>
                        <div style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${img.title || 'Bilde'}</div>
                        <div style="font-size: 0.7rem; color: var(--color-text-muted);">Opplastet av: ${img.uploader_name || 'Ukjent'}</div>
                    </div>
                    <button type="button" class="toggle-public-btn btn btn-xs" style="width: 100%; font-size: 0.75rem; padding: 0.35rem 0.5rem; justify-content: center; background: ${isPublic ? '#10B981' : 'var(--color-bg-surface)'}; color: ${isPublic ? '#FFFFFF' : 'var(--color-text-muted)'}; border: 1px solid ${isPublic ? '#10B981' : 'var(--color-border)'};">
                        ${isPublic ? '🌐 Vises i galleriet' : '🔒 Kun internt (skjult)'}
                    </button>
                </div>
            `;

            const toggleBtn = card.querySelector('.toggle-public-btn');
            if (toggleBtn) {
                toggleBtn.onclick = async () => {
                    try {
                        const toggleRes = await GalleryAPI.togglePublic(img.id);
                        img.is_public = toggleRes.is_public;
                        const nowPublic = img.is_public == 1;
                        toggleBtn.textContent = nowPublic ? '🌐 Vises i galleriet' : '🔒 Kun internt (skjult)';
                        toggleBtn.style.background = nowPublic ? '#10B981' : 'var(--color-bg-surface)';
                        toggleBtn.style.color = nowPublic ? '#FFFFFF' : 'var(--color-text-muted)';
                        toggleBtn.style.borderColor = nowPublic ? '#10B981' : 'var(--color-border)';
                    } catch (e) {
                        alert('Kunne ikke endre synlighet: ' + e.message);
                    }
                };
            }

            const delBtn = card.querySelector('.delete-img-btn');
            if (delBtn) {
                delBtn.onclick = async () => {
                    if (confirm('Vil du slette dette bildet permanent?')) {
                        try {
                            await GalleryAPI.deleteImage(img.id);
                            card.remove();
                            loadDashboardGallery();
                            alert('Bildet ble slettet.');
                        } catch (err) {
                            alert('Kunne ikke slette bilde: ' + err.message);
                        }
                    }
                };
            }

            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = '<p class="text-center text-error" style="grid-column: 1/-1;">Kunne ikke laste galleri: ' + err.message + '</p>';
    }
}

function setupGalleryManagement() {
    const adminUploadBtn = document.getElementById('admin-upload-gallery-btn');
    if (adminUploadBtn) {
        adminUploadBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async () => {
                if (input.files && input.files[0]) {
                    const title = prompt('Tittel på bildet:', input.files[0].name.split('.')[0]);
                    const formData = new FormData();
                    formData.append('file', input.files[0]);
                    formData.append('title', title || 'Galleri');
                    try {
                        await GalleryAPI.uploadImage(formData);
                        alert('Bildet ble lastet opp til galleriet!');
                        renderAdminGalleryList();
                        loadDashboardGallery();
                    } catch (err) {
                        alert('Kunne ikke laste opp bilde: ' + err.message);
                    }
                }
            };
            input.click();
        };
    }
}

// Hent og vis verksted-status og åpningstider
async function loadWorkshopStatus() {
    const statusTextEl = document.getElementById('workshop-status-text');
    const msgEl = document.getElementById('workshop-message-text');
    const hoursDisplayEl = document.getElementById('workshop-hours-display');

    try {
        const data = await SettingsAPI.getWorkshopStatus();
        currentWorkshopData = data;

        if (statusTextEl) {
            if (data.status === 'open') {
                statusTextEl.innerHTML = '<span style="color: #10B981;">🟢 Åpent verksted</span>';
            } else if (data.status === 'event') {
                statusTextEl.innerHTML = '<span style="color: #F59E0B;">🟡 Pågår arrangement</span>';
            } else {
                statusTextEl.innerHTML = '<span style="color: #EF4444;">🔴 Stengt for øyeblikket</span>';
            }
        }

        if (msgEl) {
            if (data.message && data.message.trim()) {
                msgEl.textContent = `"${data.message}"`;
                msgEl.style.display = 'block';
            } else {
                msgEl.style.display = 'none';
            }
        }

        if (hoursDisplayEl && data.hours) {
            const days = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
            
            // Finn dagens ukedag
            const weekdayIndex = (new Date().getDay() + 6) % 7; // 0=Mandag, 6=Søndag
            const todayName = days[weekdayIndex];

            let html = '';
            days.forEach(day => {
                const hourVal = data.hours[day] || 'Stengt';
                const isToday = day === todayName;
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.15rem 0; ${isToday ? 'font-weight: 700; color: var(--color-primary);' : 'color: var(--color-text-muted);'}">
                        <span>${day}${isToday ? ' <small style="font-size: 0.65rem; background: var(--color-primary); color: white; padding: 1px 4px; border-radius: 4px;">i dag</small>' : ''}</span>
                        <span>${hourVal}</span>
                    </div>
                `;
            });
            hoursDisplayEl.innerHTML = html;
        }
    } catch (e) {
        if (statusTextEl) statusTextEl.textContent = '🟢 Åpent verksted';
    }
}

function populateStatusModal() {
    if (!currentWorkshopData) return;
    const statusSelect = document.getElementById('admin-workshop-status');
    const msgInput = document.getElementById('admin-status-message');

    if (statusSelect) statusSelect.value = currentWorkshopData.status || 'open';
    if (msgInput) msgInput.value = currentWorkshopData.message || '';

    if (currentWorkshopData.hours) {
        document.querySelectorAll('.opening-day-input').forEach(inp => {
            const day = inp.dataset.day;
            if (currentWorkshopData.hours[day]) {
                inp.value = currentWorkshopData.hours[day];
            }
        });
    }
}

function setupStatusManagement() {
    const form = document.getElementById('admin-status-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const status = document.getElementById('admin-workshop-status').value;
            const message = document.getElementById('admin-status-message').value;
            
            const hours = {};
            document.querySelectorAll('.opening-day-input').forEach(inp => {
                hours[inp.dataset.day] = inp.value.trim() || 'Stengt';
            });

            const submitBtn = document.getElementById('save-workshop-status-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Lagrer...';
            }

            try {
                await SettingsAPI.updateWorkshopStatus(status, message, hours);
                alert('Åpningstider og status ble lagret!');
                closeModal('admin-status-modal');
                await loadWorkshopStatus();
            } catch (err) {
                alert('Feil ved lagring: ' + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Lagre åpningstider';
                }
            }
        };
    }
}



function setupNotificationsToggle() {
    const notifWrapper = document.getElementById('notifications-wrapper');
    const notifDropdown = document.getElementById('notifications-dropdown');
    if (notifWrapper && notifDropdown) {
        notifWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', () => {
            notifDropdown.classList.add('hidden');
        });
    }
}

async function setupProfileData() {
    try {
        const authRes = await AuthAPI.getAuthState();
        const profileName = document.getElementById('profile-name');
        const profileRole = document.getElementById('profile-role-text');
        const profileImg = document.getElementById('profile-img');
        const memberDurationEl = document.getElementById('member-duration-value');
        const adminPublishCard = document.getElementById('admin-publish-card');
        const adminTriggerContainer = document.getElementById('admin-trigger-container');

        if (authRes.authenticated && authRes.user) {
            if (authRes.must_accept_tos || authRes.must_change_password) {
                window.location.href = 'login';
                return;
            }
            currentUser = authRes.user;
            if (profileName) profileName.textContent = authRes.user.display_name || authRes.user.email.split('@')[0];
            if (profileRole) profileRole.textContent = authRes.user.role === 'admin' ? 'Administrator' : 'Medlem';
            if (profileImg && authRes.user.photo_url) profileImg.src = authRes.user.photo_url;

            if (authRes.user.member_since && memberDurationEl) {
                const joinDate = new Date(authRes.user.member_since);
                const now = new Date();
                const months = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
                memberDurationEl.textContent = months > 0 ? `${months} mnd` : 'Ny innmeldt';
            }

            if (authRes.user.role === 'admin') {
                if (adminPublishCard) adminPublishCard.classList.remove('hidden');
                if (adminTriggerContainer) adminTriggerContainer.classList.remove('hidden');
            }
        }
    } catch (e) {
        console.warn("Error setting up profile data:", e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMedlemPage);
} else {
    initMedlemPage();
}
