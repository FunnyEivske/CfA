import { AuthAPI, MemberAPI, GalleryAPI } from './api-client.js';

export let authState = {
    user: null,
    role: null
};

// UI Initialization
export async function initApp() {
    setupAuthUI();
    setupLoginForm();
    setupMembersList();
    setupGalleryUpload();
    setupMobileMenu();
}

async function setupAuthUI() {
    try {
        const res = await AuthAPI.getAuthState();
        if (res.authenticated) {
            authState.user = res.user;
            authState.role = res.user.role;
            updateHeaderUI(res.user);
        } else {
            updateHeaderUI(null);
        }
    } catch (e) {
        console.warn("Could not fetch auth state:", e);
        updateHeaderUI(null);
    }
}

function updateHeaderUI(user) {
    const loginLink = document.getElementById('login-link');
    const logoutBtn = document.getElementById('logout-button');
    const memberLink = document.getElementById('member-link');
    const profileLink = document.getElementById('profile-link');

    if (user) {
        if (loginLink) loginLink.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
            logoutBtn.onclick = async () => {
                await AuthAPI.logout();
                window.location.href = 'index.html';
            };
        }
        if (memberLink) memberLink.style.display = 'inline-block';
        if (profileLink) profileLink.style.display = 'inline-block';
    } else {
        if (loginLink) loginLink.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (memberLink) memberLink.style.display = 'none';
        if (profileLink) profileLink.style.display = 'none';
    }
}

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorEl = document.getElementById('login-error');

    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('login-email') || loginForm.email;
            const passwordInput = document.getElementById('login-password') || loginForm.password;
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';
            if (errorEl) errorEl.textContent = '';

            try {
                const res = await AuthAPI.login(email, password);
                if (res.success) {
                    window.location.href = 'medlem.html';
                }
            } catch (err) {
                if (errorEl) errorEl.textContent = 'Feil ved innlogging: ' + err.message;
            }
        };
    }

    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value.trim();
            const name = registerForm.name.value.trim();
            if (errorEl) errorEl.textContent = '';

            try {
                const res = await AuthAPI.register(email, password, name);
                if (res.success) {
                    window.location.href = 'medlem.html';
                }
            } catch (err) {
                if (errorEl) errorEl.textContent = 'Feil ved registrering: ' + err.message;
            }
        };
    }
}

async function setupMembersList() {
    const membersContainer = document.getElementById('sidebar-members-list') || document.getElementById('members-grid');
    if (!membersContainer) return;

    try {
        const data = await MemberAPI.getMembers();
        membersContainer.innerHTML = '';

        if (!data.members || data.members.length === 0) {
            membersContainer.innerHTML = '<p class="text-center text-muted">Ingen medlemmer ennå.</p>';
            return;
        }

        data.members.forEach(member => {
            const card = document.createElement('div');
            card.className = 'member-card';
            card.style.cssText = 'display: flex; align-items: center; gap: 0.8rem; padding: 0.5rem; border-bottom: 1px solid var(--color-border, #eee);';
            card.innerHTML = `
                ${member.photo_url 
                    ? `<img src="${member.photo_url}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`
                    : `<div style="width: 40px; height: 40px; border-radius: 50%; background: #ccc; display: flex; align-items: center; justify-content: center; font-weight: bold;">${member.display_name[0]}</div>`
                }
                <div>
                    <strong>${member.display_name}</strong>
                    <div style="font-size: 0.8rem; color: #666;">${member.role === 'admin' ? 'Administrator' : 'Medlem'}</div>
                </div>
            `;
            membersContainer.appendChild(card);
        });
    } catch (err) {
        console.error("Feil ved laste medlemmer:", err);
    }
}

function setupGalleryUpload() {
    const form = document.getElementById('upload-form');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('upload-files-input');
        if (!fileInput || !fileInput.files[0]) {
            alert('Velg et bilde først.');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        const titleInput = document.getElementById('upload-title-input');
        if (titleInput) formData.append('title', titleInput.value);

        try {
            await GalleryAPI.uploadImage(formData);
            alert('Bilde ble lastet opp!');
            window.location.reload();
        } catch (err) {
            alert('Opplasting feilet: ' + err.message);
        }
    };
}

function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-button');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        btn.onclick = () => {
            menu.classList.toggle('hidden');
        };
    }
}

document.addEventListener('DOMContentLoaded', initApp);
