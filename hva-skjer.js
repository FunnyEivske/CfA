import { EventAPI } from './api-client.js';

export async function loadEventsPage() {
    const eventsContainer = document.getElementById('hva-skjer-events-container');
    if (!eventsContainer) return;

    try {
        const data = await EventAPI.getEvents();
        eventsContainer.innerHTML = '';

        if (!data.events || data.events.length === 0) {
            eventsContainer.innerHTML = '<p class="text-center text-muted" style="grid-column: 1/-1;">Ingen kommende arrangementer for øyeblikket.</p>';
            return;
        }

        data.events.forEach(event => {
            const card = document.createElement('article');
            card.className = 'kurs-liste-item';

            const imageUrl = event.image_url || '';
            const dateStr = new Date(event.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

            card.innerHTML = `
                <div class="kurs-liste-item-image-container">
                    ${imageUrl 
                        ? `<img src="${imageUrl}" alt="${event.title}" class="kurs-liste-item-image">`
                        : `<div class="kurs-liste-item-image" style="background:var(--color-bg-alt);display:flex;align-items:center;justify-content:center;"><span style="color:var(--color-text-muted);">Intet bilde</span></div>`
                    }
                </div>
                <div class="kurs-liste-item-text">
                    <h2>${event.title}</h2>
                    <p class="text-lg" style="color: var(--color-primary); font-weight: 500;">
                        📅 ${dateStr}<br>
                        📍 ${event.location || ''}
                    </p>
                    <div class="text-lg" style="margin-bottom: 1.5rem; word-break: break-word;">
                        ${event.description || ''}
                    </div>
                </div>
            `;
            eventsContainer.appendChild(card);
        });
    } catch (err) {
        console.error("Feil ved henting av arrangementer:", err);
        eventsContainer.innerHTML = '<p class="text-center text-error" style="grid-column: 1/-1;">Kunne ikke laste arrangementer.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadEventsPage);
