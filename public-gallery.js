import { GalleryAPI } from './api-client.js';

export async function loadGallery() {
    const galleryGrid = document.getElementById('public-gallery-grid');
    if (!galleryGrid) return;

    try {
        const data = await GalleryAPI.getGallery();
        galleryGrid.innerHTML = '';

        if (!data.gallery || data.gallery.length === 0) {
            galleryGrid.innerHTML = '<p class="text-center text-muted" style="grid-column: 1/-1;" data-i18n="no_images">Ingen bilder i galleriet ennå.</p>';
            return;
        }

        data.gallery.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `
                <img src="${item.image_url}" alt="${item.title || 'Galleri Bilde'}" style="width: 100%; height: 250px; object-fit: cover; border-radius: var(--radius-md); cursor: pointer;">
                ${item.title ? `<p style="text-align: center; margin-top: 0.5rem; font-size: 0.9rem;">${item.title}</p>` : ''}
            `;
            galleryGrid.appendChild(div);
        });
    } catch (err) {
        console.error("Feil ved laste galleri:", err);
        galleryGrid.innerHTML = '<p class="text-center text-error" style="grid-column: 1/-1;">Kunne ikke laste galleriet.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadGallery);
