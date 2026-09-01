import { EventAPI } from './api-client.js';

export async function loadEventsPage() {
    const eventsContainer = document.getElementById('hva-skjer-events-container');
    if (!eventsContainer) return;

    try {
        const data = await EventAPI.getEvents();
        const events = (data.events || []).filter(e => e.visibility !== 'internal');
        eventsContainer.innerHTML = '';

        if (events.length === 0) {
            eventsContainer.innerHTML = '<p class="text-center text-muted py-10" style="grid-column: 1/-1;">Ingen kommende arrangementer for øyeblikket.</p>';
            return;
        }

        events.forEach(event => {
            const card = document.createElement('article');
            card.className = 'kurs-liste-item';

            const imageUrl = event.image_url || '';
            const dateStr = event.date ? new Date(event.date).toLocaleDateString('nb-NO', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            }) : 'Dato ikke satt';

            card.innerHTML = `
                <div class="kurs-liste-item-image-container">
                    ${imageUrl 
                        ? `<img src="${imageUrl}" alt="${event.title}" class="kurs-liste-item-image" style="width: 100%; height: 100%; object-fit: cover;">`
                        : `<div class="kurs-liste-item-image" style="background:var(--color-bg-alt);display:flex;align-items:center;justify-content:center;"><span style="color:var(--color-text-muted);">Intet bilde</span></div>`
                    }
                </div>
                <div class="kurs-liste-item-text">
                    <h2>${event.title}</h2>
                    <p class="text-lg" style="color: var(--color-primary); font-weight: 600; margin-bottom: 0.75rem;">
                        📅 ${dateStr} ${event.location ? '<br>📍 ' + event.location : ''}
                    </p>
                    <div class="text-lg" style="margin-bottom: 1.5rem; word-break: break-word; line-height: 1.6;">
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
