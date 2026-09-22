import { GalleryAPI } from './api-client.js';

export async function loadGallery() {
    const galleryGrid = document.getElementById('public-gallery-grid');
    if (!galleryGrid) return;

    setupLightbox();

    try {
        const data = await GalleryAPI.getGallery('public');
        galleryGrid.innerHTML = '';

        if (!data.gallery || data.gallery.length === 0) {
            galleryGrid.innerHTML = '<p class="text-center text-muted" style="column-span: all; grid-column: 1/-1;" data-i18n="no_images">Ingen bilder i galleriet ennå.</p>';
            return;
        }

        data.gallery.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-masonry-item';
            div.innerHTML = `
                <img src="${item.image_url}" alt="${item.title || 'Cosplay bilde'}" loading="lazy">
            `;

            div.onclick = () => {
                openLightbox(item.image_url);
            };

            galleryGrid.appendChild(div);
        });
    } catch (err) {
        console.error("Feil ved lasting av galleri:", err);
        galleryGrid.innerHTML = '<p class="text-center text-error" style="column-span: all; grid-column: 1/-1;">Kunne ikke laste galleriet.</p>';
    }
}

function setupLightbox() {
    const lightbox = document.getElementById('lightbox');
    const closeBtn = document.getElementById('lightbox-close');

    if (lightbox) {
        lightbox.onclick = (e) => {
            if (e.target === lightbox || e.target === closeBtn) {
                closeLightbox();
            }
        };

        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                closeLightbox();
            };
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });
    }
}

function openLightbox(imageUrl) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-image');
    if (lightbox && lightboxImg) {
        lightboxImg.src = imageUrl;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGallery);
} else {
    loadGallery();
}
