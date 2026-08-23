import { AuthAPI } from './api-client.js';

export async function initProfilePage() {
    const profileNameEl = document.getElementById('profile-name');
    const profileEmailEl = document.getElementById('profile-email');
    const profileImgEl = document.getElementById('profile-img');
    const profileRoleEl = document.getElementById('profile-role-text');

    try {
        const authRes = await AuthAPI.getAuthState();
        if (!authRes.authenticated) {
            window.location.href = 'login.html';
            return;
        }

        const user = authRes.user;
        if (profileNameEl) profileNameEl.textContent = user.display_name || user.email;
        if (profileEmailEl) profileEmailEl.textContent = user.email;
        if (profileRoleEl) profileRoleEl.textContent = user.role === 'admin' ? 'Administrator' : 'Medlem';
        if (profileImgEl && user.photo_url) profileImgEl.src = user.photo_url;

        setupProfileForm(user);
    } catch (err) {
        console.error("Profil error:", err);
    }
}

function setupProfileForm(user) {
    const nameInput = document.getElementById('display-name-input');
    const profileForm = document.getElementById('profile-form');
    const avatarInput = document.getElementById('profile-image-file-input');

    if (nameInput) nameInput.value = user.display_name || '';

    if (profileForm) {
        profileForm.onsubmit = async (e) => {
            e.preventDefault();
            const newName = nameInput ? nameInput.value.trim() : '';
            try {
                if (newName) {
                    await AuthAPI.updateProfile(newName);
                }

                if (avatarInput && avatarInput.files[0]) {
                    const formData = new FormData();
                    formData.append('file', avatarInput.files[0]);
                    await AuthAPI.uploadAvatar(formData);
                }

                alert('Profilen ble oppdatert!');
                window.location.reload();
            } catch (err) {
                alert('Feil ved oppdatering av profil: ' + err.message);
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', initProfilePage);