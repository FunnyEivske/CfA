import { AuthAPI, MemberAPI, GalleryAPI } from './api-client.js';

document.addEventListener('DOMContentLoaded', () => {
    initMedlemPage();
});

export async function initMedlemPage() {
    setupTabSwitching();
    setupModals();
    setupMobileMenu();
    setupNotificationsToggle();
    setupProfileData();
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
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('hidden');
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    }

    // 1. Administrasjons-knappen (Åpner Hoved-Adminpanelet for Admin)
    const adminControlBtn = document.getElementById('open-admin-control-btn');
    if (adminControlBtn) {
        adminControlBtn.addEventListener('click', () => openModal('admin-control-modal'));
    }

    const closeAdminControlBtn = document.getElementById('close-admin-control-modal');
    if (closeAdminControlBtn) closeAdminControlBtn.addEventListener('click', () => closeModal('admin-control-modal'));
    const closeAdminControlFooter = document.getElementById('close-admin-control-footer');
    if (closeAdminControlFooter) closeAdminControlFooter.addEventListener('click', () => closeModal('admin-control-modal'));

    // Admin-panel underverktøy:
    const adminMembersBtn = document.getElementById('admin-panel-members-btn');
    if (adminMembersBtn) {
        adminMembersBtn.addEventListener('click', () => {
            openModal('admin-members-modal');
            renderAdminMembersList();
        });
    }

    const closeAdminMembersBtn = document.getElementById('close-admin-members-modal');
    if (closeAdminMembersBtn) closeAdminMembersBtn.addEventListener('click', () => closeModal('admin-members-modal'));
    const closeAdminMembersFooter = document.getElementById('close-admin-members-footer');
    if (closeAdminMembersFooter) closeAdminMembersFooter.addEventListener('click', () => closeModal('admin-members-modal'));

    const adminAddUserBtn = document.getElementById('admin-add-user-btn');
    if (adminAddUserBtn) {
        adminAddUserBtn.addEventListener('click', async () => {
            const email = prompt('Skriv inn e-post for nytt medlem:');
            if (!email) return;
            const name = prompt('Skriv inn visningsnavn:', email.split('@')[0]);
            try {
                await AuthAPI.register(email, '123456', name || 'Nytt Medlem');
                alert('Ny bruker opprettet!');
                renderAdminMembersList();
            } catch (err) {
                alert('Kunne ikke opprette bruker: ' + err.message);
            }
        });
    }

    const adminGalleryBtn = document.getElementById('admin-panel-gallery-btn');
    if (adminGalleryBtn) {
        adminGalleryBtn.addEventListener('click', () => openModal('admin-image-modal'));
    }

    const adminStatusBtn = document.getElementById('admin-panel-status-btn');
    if (adminStatusBtn) {
        adminStatusBtn.addEventListener('click', () => openModal('admin-status-modal'));
    }

    // 2. Profile Modal
    const openProfileBtn = document.getElementById('open-profile-modal');
    if (openProfileBtn) openProfileBtn.addEventListener('click', () => openModal('profile-modal'));

    const closeProfileBtn = document.getElementById('close-profile-modal');
    if (closeProfileBtn) closeProfileBtn.addEventListener('click', () => closeModal('profile-modal'));

    const cancelProfileBtn = document.getElementById('cancel-profile-modal');
    if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', () => closeModal('profile-modal'));

    // 3. Post & Event Creation (Leder)
    const newPostBtn = document.getElementById('new-post-btn');
    if (newPostBtn) newPostBtn.addEventListener('click', () => openModal('post-modal'));

    const closePostBtn = document.getElementById('close-post-modal');
    if (closePostBtn) closePostBtn.addEventListener('click', () => closeModal('post-modal'));

    const cancelPostBtn = document.getElementById('cancel-post-modal');
    if (cancelPostBtn) cancelPostBtn.addEventListener('click', () => closeModal('post-modal'));

    const newEventBtn = document.getElementById('new-event-btn');
    if (newEventBtn) newEventBtn.addEventListener('click', () => openModal('event-modal'));

    const closeEventBtn = document.getElementById('close-event-modal');
    if (closeEventBtn) closeEventBtn.addEventListener('click', () => closeModal('event-modal'));

    const cancelEventBtn = document.getElementById('cancel-event-modal');
    if (cancelEventBtn) cancelEventBtn.addEventListener('click', () => closeModal('event-modal'));

    // 4. Documents (Referater, Retningslinjer, Vedtekter) - Synlig for ALLE
    const btnReferater = document.getElementById('btn-referater');
    const btnRetningslinjer = document.getElementById('btn-retningslinjer');
    const btnVedtekter = document.getElementById('btn-vedtekter');
    const docModalTitle = document.getElementById('documents-modal-title');

    if (btnReferater) {
        btnReferater.addEventListener('click', () => {
            if (docModalTitle) docModalTitle.textContent = 'Referater';
            openModal('view-documents-modal');
        });
    }

    if (btnRetningslinjer) {
        btnRetningslinjer.addEventListener('click', () => {
            if (docModalTitle) docModalTitle.textContent = 'Retningslinjer';
            openModal('view-documents-modal');
        });
    }

    if (btnVedtekter) {
        btnVedtekter.addEventListener('click', () => {
            if (docModalTitle) docModalTitle.textContent = 'Vedtekter';
            openModal('view-documents-modal');
        });
    }

    const closeDocBtn = document.getElementById('close-documents-modal');
    if (closeDocBtn) closeDocBtn.addEventListener('click', () => closeModal('view-documents-modal'));
    const closeDocFooter = document.getElementById('close-documents-footer-btn');
    if (closeDocFooter) closeDocFooter.addEventListener('click', () => closeModal('view-documents-modal'));

    // 5. Gallery Upload Modal
    const uploadGalleryBtn = document.getElementById('upload-gallery-btn');
    if (uploadGalleryBtn) uploadGalleryBtn.addEventListener('click', () => openModal('upload-modal'));

    const closeUploadBtn = document.getElementById('close-upload-modal');
    if (closeUploadBtn) closeUploadBtn.addEventListener('click', () => closeModal('upload-modal'));

    const cancelUploadBtn = document.getElementById('cancel-upload-btn');
    if (cancelUploadBtn) cancelUploadBtn.addEventListener('click', () => closeModal('upload-modal'));

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const container = overlay.closest('.modal-container');
            if (container) container.classList.add('hidden');
        });
    });
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
            item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--color-bg-subtle); border-radius: 8px; border: 1px solid var(--color-border);';
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <img src="${m.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.display_name)}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <strong>${m.display_name}</strong>
                        <div style="font-size: 0.8rem; color: var(--color-text-muted);">${m.email}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="badge" style="padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; background: ${m.role === 'admin' ? 'var(--color-primary)' : 'var(--color-border)'}; color: ${m.role === 'admin' ? 'white' : 'var(--color-text-main)'}; font-weight: 600;">
                        ${m.role === 'admin' ? 'Administrator' : 'Medlem'}
                    </span>
                    <button class="btn btn-ghost btn-xs delete-user-btn" data-id="${m.id}" style="color: var(--color-error); cursor: pointer; padding: 0.3rem 0.6rem;">Slett</button>
                </div>
            `;

            const deleteBtn = item.querySelector('.delete-user-btn');
            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    if (confirm(`Vil du slette brukeren ${m.display_name}?`)) {
                        item.remove();
                        alert(`Brukeren ${m.display_name} ble slettet.`);
                    }
                };
            }

            container.appendChild(item);
        });
    } catch (err) {
        container.innerHTML = '<p class="text-center text-error">Kunne ikke laste brukere.</p>';
    }
}

function setupMobileMenu() {
    const mobileBtn = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

function setupNotificationsToggle() {
    const notifWrapper = document.getElementById('notifications-wrapper');
    const notifDropdown = document.getElementById('notifications-dropdown');
    if (notifWrapper && notifDropdown) {
        notifWrapper.addEventListener('click', () => {
            notifDropdown.classList.toggle('hidden');
        });
    }
}

async function setupProfileData() {
    try {
        const authRes = await AuthAPI.getAuthState();
        const profileName = document.getElementById('profile-name');
        const profileRole = document.getElementById('profile-role-text');
        const adminPublishCard = document.getElementById('admin-publish-card');
        const adminTriggerContainer = document.getElementById('admin-trigger-container');

        if (authRes.authenticated && authRes.user) {
            if (profileName) profileName.textContent = authRes.user.display_name || authRes.user.email.split('@')[0];
            if (profileRole) profileRole.textContent = authRes.user.role === 'admin' ? 'Administrator' : 'Medlem';

            if (authRes.user.role === 'admin') {
                if (adminPublishCard) adminPublishCard.classList.remove('hidden');
                if (adminTriggerContainer) adminTriggerContainer.classList.remove('hidden');
            }
        }
    } catch (e) {
        console.warn("Error setting up profile data:", e);
    }
}
