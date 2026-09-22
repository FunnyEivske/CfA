import { AuthAPI, MemberAPI, GalleryAPI, ContactAPI, registerServiceWorker } from './api-client.js';

export let authState = {
    user: null,
    role: null
};

function detectAndHandleStandalone() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
        document.body.classList.add('pwa-standalone');
        const path = window.location.pathname;
        const isHome = path === '/' || path.endsWith('/index.html') || path.endsWith('/index');
        if (isHome) {
            window.location.replace('app-start.html');
        }
    }
}

// UI Initialization
export async function initApp() {
    detectAndHandleStandalone();
    registerServiceWorker();
    setupPwaInstallPrompt();
    setupAuthUI();
    setupLoginForm();
    setupContactForms();
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
    const logoutBtns = document.querySelectorAll('#logout-button, #dropdown-logout-button');
    const memberLink = document.getElementById('member-link');
    const profileLink = document.getElementById('profile-link');

    const mobileLoginLink = document.getElementById('mobile-login-link');
    const mobileLogoutBtns = document.querySelectorAll('#mobile-logout-button');
    const mobileMemberLink = document.getElementById('mobile-member-link');

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (user) {
        if (loginLink) loginLink.classList.add('hidden');
        logoutBtns.forEach(btn => {
            btn.classList.remove('hidden');
            btn.onclick = async () => {
                await AuthAPI.logout();
                window.location.href = isStandalone ? 'login' : '/';
            };
        });
        if (memberLink) {
            memberLink.classList.remove('hidden');
            memberLink.style.display = '';
        }
        if (profileLink) profileLink.classList.remove('hidden');

        if (mobileLoginLink) mobileLoginLink.classList.add('hidden');
        mobileLogoutBtns.forEach(btn => {
            btn.classList.remove('hidden');
            btn.onclick = async () => {
                await AuthAPI.logout();
                window.location.href = isStandalone ? 'login' : '/';
            };
        });
        if (mobileMemberLink) {
            mobileMemberLink.classList.remove('hidden');
            mobileMemberLink.style.display = '';
        }
    } else {
        if (loginLink) loginLink.classList.remove('hidden');
        logoutBtns.forEach(btn => btn.classList.add('hidden'));
        if (memberLink) memberLink.classList.add('hidden');
        if (profileLink) profileLink.classList.add('hidden');

        if (mobileLoginLink) mobileLoginLink.classList.remove('hidden');
        mobileLogoutBtns.forEach(btn => btn.classList.add('hidden'));
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

    const forgotBtn = document.getElementById('forgot-password-btn');
    if (forgotBtn) {
        forgotBtn.onclick = () => {
            const msg = 'Brukerkontoer i Cosplay for Alle administreres av styret.\n\nHvis du har glemt passordet ditt, eller ikke har mottatt et midlertidig passord, vennligst send en e-post til:\nkontakt@cosplayforalle.no\n\nså hjelper styret deg med å tilbakestille kontoen.';
            if (typeof showCustomAlert === 'function') {
                showCustomAlert(msg);
            } else {
                alert(msg);
            }
        };
    }

    if (loginForm) {
        const submitBtn = document.getElementById('login-submit-btn') || loginForm.querySelector('button[type="submit"]');

        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('login-email') || loginForm.email;
            const passwordInput = document.getElementById('login-password') || loginForm.password;
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';
            
            if (errorEl) {
                errorEl.textContent = '';
                errorEl.style.display = 'none';
            }

            if (!email || !password) {
                if (errorEl) {
                    errorEl.textContent = 'Vennligst fyll ut både e-postadresse og passord.';
                    errorEl.style.display = 'block';
                }
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Logger inn...';
            }

            try {
                const res = await AuthAPI.login(email, password);
                if (res.success) {
                    handlePostLoginFlow(res);
                }
            } catch (err) {
                if (errorEl) {
                    const is401 = err.message && (err.message.includes('401') || err.message.toLowerCase().includes('feil'));
                    errorEl.textContent = is401 
                        ? 'Feil e-postadresse eller passord. Hvis du nylig ble opprettet som medlem, sjekk at du bruker det midlertidige passordet du fikk av styret.' 
                        : 'Kunne ikke logge inn: ' + err.message;
                    errorEl.style.display = 'block';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Logg inn';
                }
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

function setupContactForms() {
    const contactForms = [
        { formId: 'contact-form', statusId: 'contact-status', btnId: 'contact-submit-btn' },
        { formId: 'event-suggest-form', statusId: 'event-suggest-status', btnId: 'event-suggest-submit-btn' }
    ];

    contactForms.forEach(({ formId, statusId, btnId }) => {
        const form = document.getElementById(formId);
        if (!form) return;

        const statusEl = document.getElementById(statusId);
        const submitBtn = document.getElementById(btnId) || form.querySelector('button[type="submit"]');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = (form.name?.value || '').trim();
            const email = (form.email?.value || '').trim();
            const message = (form.message?.value || '').trim();
            const website = (form.website?.value || '').trim();

            if (!name || !email || !message) {
                if (statusEl) {
                    statusEl.innerHTML = '<div class="form-error">Vennligst fyll ut alle feltene.</div>';
                }
                return;
            }

            const origBtnText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = document.documentElement.lang === 'en' ? 'Sending message...' : 'Sender melding...';
            }
            if (statusEl) {
                statusEl.innerHTML = '';
            }

            try {
                const res = await ContactAPI.sendMessage(name, email, message, website);
                if (res && res.success) {
                    form.reset();
                    if (statusEl) {
                        const successText = document.documentElement.lang === 'en'
                            ? 'Thank you for your message! We have received your inquiry and will reply as soon as possible via email.'
                            : 'Takk for meldingen din! Vi har mottatt henvendelsen og svarer deg så snart vi kan på e-post.';
                        statusEl.innerHTML = `<div class="form-success">${successText}</div>`;
                    }
                } else {
                    throw new Error((res && res.error) || 'Kunne ikke sende meldingen');
                }
            } catch (err) {
                console.error('Contact form submission error:', err);
                if (statusEl) {
                    const errorText = document.documentElement.lang === 'en'
                        ? (err.message || 'An error occurred while sending. Please try again or email us directly at contact@cosplayforalle.no.')
                        : (err.message || 'Det oppsto en feil under sending. Vennligst prøv igjen, eller send en e-post direkte til kontakt@cosplayforalle.no.');
                    statusEl.innerHTML = `<div class="form-error">${errorText}</div>`;
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = origBtnText;
                }
            }
        });
    });
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

// ----------------------------------------------------
// PWA Mobil Installasjons-banner & Veiledning
// ----------------------------------------------------
let deferredPwaPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    checkAndShowInstallBanner();
});

function setupPwaInstallPrompt() {
    checkAndShowInstallBanner();
}

function checkAndShowInstallBanner() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    // Kun på mobil eller nettbrett
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Sjekk om brukeren har lukket banneret nylig (14 dagers pause)
    const dismissedUntil = localStorage.getItem('pwa_install_banner_dismissed_until');
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
        return;
    }

    // Ikke vis på selve /app eller /app-start
    const path = window.location.pathname;
    if (path.includes('app.html') || path.includes('app-start.html') || path.endsWith('/app')) {
        return;
    }

    if (document.getElementById('pwa-mobile-install-banner')) return;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    const banner = document.createElement('div');
    banner.id = 'pwa-mobile-install-banner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
        <div class="pwa-banner-header">
            <div class="pwa-banner-info">
                <img src="Media/Logo/icon-192.png" alt="App ikon" class="pwa-banner-icon">
                <div>
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--color-text-main);">Installer appen</h4>
                    <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--color-text-muted);">Få rask tilgang og varsler på hjemskjermen</p>
                </div>
            </div>
        </div>
        <div class="pwa-banner-actions">
            <button type="button" class="pwa-banner-btn-close" id="pwa-dismiss-btn">Ikke nå</button>
            <button type="button" class="pwa-banner-btn-install" id="pwa-install-action-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                ${isIos ? 'Vis hvordan' : 'Installer nå'}
            </button>
        </div>
    `;

    document.body.appendChild(banner);

    const dismissBtn = document.getElementById('pwa-dismiss-btn');
    if (dismissBtn) {
        dismissBtn.onclick = () => {
            banner.remove();
            // Pause visning i 14 dager
            localStorage.setItem('pwa_install_banner_dismissed_until', Date.now() + 14 * 24 * 60 * 60 * 1000);
        };
    }

    const actionBtn = document.getElementById('pwa-install-action-btn');
    if (actionBtn) {
        actionBtn.onclick = async () => {
            if (isIos) {
                showIosInstallModal();
            } else if (deferredPwaPrompt) {
                deferredPwaPrompt.prompt();
                const choice = await deferredPwaPrompt.userChoice;
                if (choice.outcome === 'accepted') {
                    banner.remove();
                }
                deferredPwaPrompt = null;
            } else {
                window.location.href = 'app';
            }
        };
    }
}

function showIosInstallModal() {
    if (document.getElementById('pwa-ios-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'pwa-ios-modal';
    modal.className = 'pwa-ios-modal';
    modal.innerHTML = `
        <div class="pwa-ios-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                <h4 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--color-text-main);">Installer på iPhone</h4>
                <button type="button" id="close-ios-modal-btn" style="background: none; border: none; font-size: 1.25rem; color: var(--color-text-muted); cursor: pointer; padding: 0.2rem;">✕</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.88rem; color: var(--color-text-main);">
                <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                    <div style="background: var(--color-primary); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; flex-shrink: 0; margin-top: 1px;">1</div>
                    <div>Trykk på <strong>Del-knappen</strong> nederst i Safari (firkanten med pil opp).</div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                    <div style="background: var(--color-primary); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; flex-shrink: 0; margin-top: 1px;">2</div>
                    <div>Bla litt ned og velg <strong>«Legg til på Hjem-skjerm»</strong>.</div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                    <div style="background: var(--color-primary); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; flex-shrink: 0; margin-top: 1px;">3</div>
                    <div>Trykk <strong>«Legg til»</strong> øverst til høyre. Nå finner du appen på hjemskjermen!</div>
                </div>
            </div>
            <button type="button" id="ok-ios-modal-btn" class="button button-primary" style="width: 100%; margin-top: 1.25rem; justify-content: center; padding: 0.7rem;">
                Den er grei!
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('close-ios-modal-btn').onclick = close;
    document.getElementById('ok-ios-modal-btn').onclick = close;
    modal.onclick = (e) => {
        if (e.target === modal) close();
    };
}


