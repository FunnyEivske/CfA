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

            // Sjekk om innlogget bruker må godta vilkår eller endre passord på login-siden
            const isLoginPage = window.location.pathname.includes('login') || window.location.pathname.endsWith('/login.html') || window.location.pathname.endsWith('/login');
            if (isLoginPage && (res.must_accept_tos || res.must_change_password)) {
                handlePostLoginFlow(res);
            }
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

    const mobileLoginLink = document.getElementById('mobile-login-link');
    const mobileLogoutBtn = document.getElementById('mobile-logout-button');
    const mobileMemberLink = document.getElementById('mobile-member-link');

    if (user) {
        if (loginLink) loginLink.classList.add('hidden');
        if (logoutBtn) {
            logoutBtn.classList.remove('hidden');
            logoutBtn.onclick = async () => {
                await AuthAPI.logout();
                window.location.href = '/';
            };
        }
        if (memberLink) {
            memberLink.classList.remove('hidden');
            memberLink.style.display = '';
        }
        if (profileLink) profileLink.classList.remove('hidden');

        if (mobileLoginLink) mobileLoginLink.classList.add('hidden');
        if (mobileLogoutBtn) {
            mobileLogoutBtn.classList.remove('hidden');
            mobileLogoutBtn.onclick = async () => {
                await AuthAPI.logout();
                window.location.href = '/';
            };
        }
        if (mobileMemberLink) {
            mobileMemberLink.classList.remove('hidden');
            mobileMemberLink.style.display = '';
        }
    } else {
        if (loginLink) loginLink.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (memberLink) memberLink.classList.add('hidden');
        if (profileLink) profileLink.classList.add('hidden');

        if (mobileLoginLink) mobileLoginLink.classList.remove('hidden');
        if (mobileLogoutBtn) mobileLogoutBtn.classList.add('hidden');
        if (mobileMemberLink) mobileMemberLink.classList.add('hidden');
    }
}


// Password Visibility Toggle Logic
export function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const container = btn.closest('div');
            if (!container) return;
            const input = container.querySelector('input');
            if (!input) return;

            const eyeIcon = btn.querySelector('.eye-icon');
            const eyeOffIcon = btn.querySelector('.eye-off-icon');

            if (input.type === 'password') {
                input.type = 'text';
                if (eyeIcon) eyeIcon.classList.add('hidden');
                if (eyeOffIcon) eyeOffIcon.classList.remove('hidden');
            } else {
                input.type = 'password';
                if (eyeIcon) eyeIcon.classList.remove('hidden');
                if (eyeOffIcon) eyeOffIcon.classList.add('hidden');
            }
        };
    });
}

function setupLoginForm() {
    setupPasswordToggles();
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
                    handlePostLoginFlow(res);
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
                    window.location.href = 'medlem';
                }
            } catch (err) {
                if (errorEl) errorEl.textContent = 'Feil ved registrering: ' + err.message;
            }
        };
    }
}

function handlePostLoginFlow(res) {
    if (res.must_accept_tos) {
        showTosModal(res);
        return;
    }

    if (res.must_change_password) {
        showForcePasswordModal();
        return;
    }

    window.location.href = 'medlem';
}

function showTosModal(loginRes) {
    const tosModal = document.getElementById('tos-modal');
    const tosCheckbox = document.getElementById('tos-checkbox');
    const acceptBtn = document.getElementById('accept-tos-btn');
    const declineBtn = document.getElementById('decline-tos-btn');

    if (!tosModal) {
        if (loginRes.must_change_password) {
            showForcePasswordModal();
        } else {
            window.location.href = 'medlem';
        }
        return;
    }

    tosModal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    if (tosCheckbox && acceptBtn) {
        tosCheckbox.checked = false;
        acceptBtn.disabled = true;

        tosCheckbox.onchange = () => {
            acceptBtn.disabled = !tosCheckbox.checked;
        };

        acceptBtn.onclick = async () => {
            acceptBtn.disabled = true;
            acceptBtn.textContent = 'Godkjenner...';
            try {
                await AuthAPI.acceptTos();
                tosModal.classList.add('hidden');
                
                if (loginRes.must_change_password) {
                    showForcePasswordModal();
                } else {
                    document.body.classList.remove('modal-open');
                    window.location.href = 'medlem';
                }
            } catch (err) {
                alert('Kunne ikke lagre godkjenning: ' + err.message);
                acceptBtn.disabled = false;
                acceptBtn.textContent = 'Jeg godtar og vil fortsette';
            }
        };
    }

    if (declineBtn) {
        declineBtn.onclick = async () => {
            if (confirm('Hvis du ikke godtar brukervilkårene kan du ikke benytte tjenesten, og du vil bli logget ut.')) {
                await AuthAPI.logout();
                window.location.reload();
            }
        };
    }
}

function showForcePasswordModal() {
    const forceModal = document.getElementById('force-password-modal');
    if (forceModal) {
        forceModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        setupForcePasswordForm();
    } else {
        window.location.href = 'medlem';
    }
}

function setupForcePasswordForm() {
    const forceForm = document.getElementById('force-password-form');
    const forceError = document.getElementById('force-password-error');
    const saveBtn = document.getElementById('save-new-password-btn');

    if (forceForm) {
        forceForm.onsubmit = async (e) => {
            e.preventDefault();
            const p1 = document.getElementById('new-password').value.trim();
            const p2 = document.getElementById('confirm-new-password').value.trim();

            if (forceError) forceError.textContent = '';

            if (p1.length < 6) {
                if (forceError) forceError.textContent = 'Passordet må være på minst 6 tegn.';
                return;
            }

            if (p1 !== p2) {
                if (forceError) forceError.textContent = 'Passordene er ikke like. Vennligst skriv dem inn på nytt.';
                return;
            }

            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Lagrer nytt passord...';
            }

            try {
                await AuthAPI.changePassword(p1);
                alert('Ditt nye passord er lagret! Velkommen til Cosplay for alle.');
                document.body.classList.remove('modal-open');
                window.location.href = 'medlem';
            } catch (err) {
                if (forceError) forceError.textContent = 'Kunne ikke endre passord: ' + err.message;
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Lagre passord og fortsett';
                }
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
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
            document.body.classList.toggle('modal-open', menu.classList.contains('show'));
        };

        menu.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('click', () => {
                menu.classList.remove('show');
                document.body.classList.remove('modal-open');
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('show')) {
                menu.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

