import { EventAPI, GalleryAPI } from './api-client.js';

export async function loadPublicEvents() {
    const eventsContainer = document.getElementById('public-events-container');
    if (!eventsContainer) return;

    try {
        const data = await EventAPI.getEvents();
        const events = (data.events || []).filter(e => e.visibility !== 'internal');
        eventsContainer.innerHTML = '';

        if (events.length === 0) {
            eventsContainer.innerHTML = '<p class="text-center text-muted py-6" style="grid-column: 1/-1;" data-i18n="no_events">Ingen kommende arrangementer for øyeblikket.</p>';
            return;
        }

        events.forEach(event => {
            const card = document.createElement('a');
            card.href = 'hva-skjer';
            card.className = 'kurs-card';
            card.style.textDecoration = 'none';
            card.style.color = 'inherit';

            const imageUrl = event.image_url || '';
            const dateStr = event.date ? new Date(event.date).toLocaleDateString('nb-NO', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric'
            }) : '';

            // Clean description snippet from HTML tags
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = event.description || '';
            const plainDesc = tempDiv.textContent || tempDiv.innerText || '';

            card.innerHTML = `
                ${imageUrl 
                    ? `<img src="${imageUrl}" alt="${event.title}" class="kurs-card-image" style="width: 100%; height: 200px; object-fit: cover;">`
                    : `<div class="kurs-card-image" style="background:var(--color-bg-alt);height:200px;display:flex;align-items:center;justify-content:center;"><span style="color:var(--color-text-muted);">Bilde mangler</span></div>`
                }
                <div class="kurs-card-content" style="padding: 1.25rem;">
                    <h3 style="margin-top: 0; color: var(--color-text-main); font-size: 1.2rem;">${event.title}</h3>
                    <p style="font-size: 0.9rem; color: var(--color-primary); font-weight: 600; margin-bottom: 0.5rem;">
                        📅 ${dateStr} ${event.location ? ' • 📍 ' + event.location : ''}
                    </p>
                    <p style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 0; color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.5;">
                        ${plainDesc}
                    </p>
                </div>
            `;
            eventsContainer.appendChild(card);
        });
    } catch (err) {
        console.error("Feil ved henting av arrangementer:", err);
        eventsContainer.innerHTML = '<p class="text-center text-error py-6" style="grid-column: 1/-1;">Kunne ikke laste arrangementer.</p>';
    }
}

export async function loadHomepageGalleryTeaser() {
    const teaserContainer = document.getElementById('homepage-gallery-teaser');
    if (!teaserContainer) return;

    try {
        const data = await GalleryAPI.getGallery('public');
        const items = data.gallery || [];
        teaserContainer.innerHTML = '';

        if (items.length === 0) {
            teaserContainer.innerHTML = '<p class="text-center text-muted py-6" style="grid-column: 1/-1;">Ingen bilder i galleriet ennå.</p>';
            return;
        }

        // Shuffle array and select 4 pictures so it is always 1 single clean line that scales smoothly
        const shuffled = [...items].sort(() => 0.5 - Math.random());
        const count = Math.min(shuffled.length, 4);
        const selected = shuffled.slice(0, count);

        teaserContainer.style.display = 'grid';
        teaserContainer.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;
        teaserContainer.style.gap = 'clamp(0.5rem, 1.75vw, 1.25rem)';

        selected.forEach(img => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'gallery-item';
            itemDiv.style.cssText = 'position: relative; overflow: hidden; border-radius: var(--radius-md); aspect-ratio: 1/1; cursor: pointer; background: var(--color-bg-subtle); box-shadow: var(--shadow-sm); transition: transform 0.2s ease;';
            
            itemDiv.innerHTML = `
                <img src="${img.image_url}" alt="${img.title || 'Cosplay bilde'}" style="width: 100%; height: 100%; object-fit: cover; display: block;" loading="lazy">
            `;

            itemDiv.addEventListener('mouseenter', () => {
                itemDiv.style.transform = 'scale(1.02)';
            });
            itemDiv.addEventListener('mouseleave', () => {
                itemDiv.style.transform = 'scale(1)';
            });

            itemDiv.onclick = () => {
                openHomepageLightbox(img.image_url);
            };

            teaserContainer.appendChild(itemDiv);
        });
    } catch (err) {
        console.error("Feil ved lasting av gallerismakebit:", err);
        teaserContainer.innerHTML = '<p class="text-center text-error py-6" style="grid-column: 1/-1;">Kunne ikke hente bilder.</p>';
    }
}

function openHomepageLightbox(src) {
    let lightbox = document.getElementById('lightbox');
    let lightboxImg = document.getElementById('lightbox-image');

    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <button id="lightbox-close" class="lightbox-close" aria-label="Lukk">&times;</button>
                <img id="lightbox-image" class="lightbox-image" src="" alt="Større visning">
            </div>
        `;
        document.body.appendChild(lightbox);
        lightboxImg = lightbox.querySelector('#lightbox-image');

        lightbox.onclick = (e) => {
            if (e.target === lightbox || e.target.id === 'lightbox-close') {
                lightbox.classList.remove('active');
                document.body.style.overflow = '';
            }
        };
    }

    if (lightboxImg) lightboxImg.src = src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadPublicEvents();
        loadHomepageGalleryTeaser();
    });
} else {
    loadPublicEvents();
    loadHomepageGalleryTeaser();
}
