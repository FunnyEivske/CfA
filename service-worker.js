// service-worker.js - Cosplay for alle (CfA)
// Minimalistisk, batterivennlig Service Worker for Web Push

const CACHE_NAME = 'cfa-pwa-v1';

self.addEventListener('install', (event) => {
    // Aktiver ny service worker umiddelbart
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Ta kontroll over alle åpne klienter straks
    event.waitUntil(self.clients.claim());
});

// Passiv push-lytter via nettleserens native Push API (ingen polling, null unødig batteribruk)
self.addEventListener('push', (event) => {
    let payload = {
        title: 'Cosplay for alle',
        body: 'Ny oppdatering tilgjengelig!',
        icon: '/Media/Logo/icon-192.png',
        badge: '/Media/Logo/icon-192.png',
        data: {
            url: '/medlem'
        }
    };

    if (event.data) {
        try {
            const data = event.data.json();
            payload.title = data.title || payload.title;
            payload.body = data.body || payload.body;
            if (data.icon) payload.icon = data.icon;
            if (data.badge) payload.badge = data.badge;
            if (data.url) payload.data.url = data.url;
            if (data.tag) payload.tag = data.tag;
        } catch (e) {
            // Hvis payload er ren tekst
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag || 'cfa-notification',
        renotify: true,
        data: payload.data,
        vibrate: [100, 50, 100]
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

// Håndtering av klikk på varsel
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/medlem';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Sjekk om appen allerede er åpen i et vindu/fane
            for (const client of clientList) {
                if ('focus' in client) {
                    if (client.url && client.url.includes('/medlem')) {
                        return client.focus();
                    }
                }
            }
            // Hvis ikke åpen, åpne nytt vindu
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
