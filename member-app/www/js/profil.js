import { AuthAPI, optimizeImageForUpload } from './api-client.js';

export async function initProfilePage() {
    const profileNameEl = document.getElementById('profile-name') || document.getElementById('display-name');
    const profileEmailEl = document.getElementById('profile-email');
    const profileImgEl = document.getElementById('profile-image-preview') || document.getElementById('profile-img');
    const profileRoleEl = document.getElementById('profile-role-text');

    try {
        const authRes = await AuthAPI.getAuthState();
        if (!authRes.authenticated) {
            window.location.href = 'login';
            return;
        }

        const user = authRes.user;
        if (profileNameEl && profileNameEl.tagName === 'INPUT') {
            profileNameEl.value = user.display_name || user.email;
        } else if (profileNameEl) {
            profileNameEl.textContent = user.display_name || user.email;
        }
        if (profileEmailEl) profileEmailEl.value = user.email || '';
        if (profileRoleEl) profileRoleEl.textContent = user.role === 'admin' ? 'Administrator' : 'Medlem';
        if (profileImgEl && user.photo_url) profileImgEl.src = user.photo_url;

        setupProfileForm(user);
    } catch (err) {
        console.error("Profil error:", err);
    }
}

function setupProfileForm(user) {
    const nameInput = document.getElementById('display-name') || document.getElementById('display-name-input');
    const contactEmailInput = document.getElementById('contact-email');
    const phoneInput = document.getElementById('phone');
    const profileForm = document.getElementById('profile-form');
    const avatarInput = document.getElementById('profile-image-upload') || document.getElementById('profile-image-file-input');
    const uploadBtn = document.getElementById('profile-image-upload-button');
    const previewImg = document.getElementById('profile-image-preview') || document.getElementById('profile-img');
    const saveBtn = document.getElementById('profile-save-button');

    if (nameInput) nameInput.value = user.display_name || '';
    if (contactEmailInput) contactEmailInput.value = user.contact_email || '';
    if (phoneInput) phoneInput.value = user.phone || '';

    if (uploadBtn && avatarInput) {
        uploadBtn.onclick = (e) => {
            e.preventDefault();
            avatarInput.click();
        };
    }

    if (avatarInput) {
        avatarInput.onchange = () => {
            if (avatarInput.files && avatarInput.files[0] && previewImg) {
                previewImg.src = URL.createObjectURL(avatarInput.files[0]);
            }
        };
    }

    if (profileForm) {
        profileForm.onsubmit = async (e) => {
            e.preventDefault();
            const newName = nameInput ? nameInput.value.trim() : '';
            const newContactEmail = contactEmailInput ? contactEmailInput.value.trim() : '';
            const newPhone = phoneInput ? phoneInput.value.trim() : '';

            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Lagrer endringer...';
            }

            try {
                if (newName) {
                    await AuthAPI.updateProfile(newName, newPhone, newContactEmail);
                }

                if (avatarInput && avatarInput.files && avatarInput.files[0]) {
                    if (saveBtn) saveBtn.textContent = 'Laster opp bilde...';
                    const optimized = await optimizeImageForUpload(avatarInput.files[0], 1024, 0.85);
                    const formData = new FormData();
                    formData.append('file', optimized);
                    await AuthAPI.uploadAvatar(formData);
                }

                alert('Profilen ble oppdatert!');
                window.location.reload();
            } catch (err) {
                alert('Feil ved oppdatering av profil: ' + err.message);
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Lagre endringer';
                }
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', initProfilePage);