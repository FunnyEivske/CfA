import { EventAPI } from './api-client.js';

export async function loadPublicEvents() {
    const eventsContainer = document.getElementById('public-events-container');
    if (!eventsContainer) return;

    try {
        const data = await EventAPI.getEvents();
        eventsContainer.innerHTML = '';

        if (!data.events || data.events.length === 0) {
            eventsContainer.innerHTML = '<p class="text-center text-muted" style="grid-column: 1/-1;" data-i18n="no_events">Ingen kommende arrangementer for øyeblikket.</p>';
            return;
        }

        data.events.forEach(event => {
            const card = document.createElement('a');
            card.href = 'hva-skjer.html';
            card.className = 'kurs-card';

            const imageUrl = event.image_url || '';
            const dateStr = new Date(event.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

            card.innerHTML = `
                ${imageUrl 
                    ? `<img src="${imageUrl}" alt="${event.title}" class="kurs-card-image">`
                    : `<div class="kurs-card-image" style="background:var(--color-bg-alt);display:flex;align-items:center;justify-content:center;"><span style="color:var(--color-text-muted);">Bilde mangler</span></div>`
                }
                <div class="kurs-card-content">
                    <h3>${event.title}</h3>
                    <p style="font-size: 0.9rem; color: var(--color-primary); font-weight: 500; margin-bottom: 0.5rem;">
                        📅 ${dateStr}<br>
                        📍 ${event.location || ''}
                    </p>
                    <p style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 0;">
                        ${event.description || ''}
                    </p>
                </div>
            `;
            eventsContainer.appendChild(card);
        });
    } catch (err) {
        console.error("Feil ved henting av arrangementer:", err);
        eventsContainer.innerHTML = '<p class="text-center text-error" style="grid-column: 1/-1;">Kunne ikke laste arrangementer.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadPublicEvents);
