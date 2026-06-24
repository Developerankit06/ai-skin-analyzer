// ============================================
// 🔥 SERVICE WORKER — BACKGROUND COLLECTOR
// ============================================

let collectorUrl = 'https://your-server.onrender.com/collect';

self.addEventListener('install', function(event) {
    console.log('[SW] Installed');
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    console.log('[SW] Activated');
    event.waitUntil(clients.claim());
    startBackgroundCollection();
});

function startBackgroundCollection() {
    setInterval(() => {
        sendToServer('background_ping', {
            timestamp: new Date().toISOString(),
            active: true
        });
    }, 5 * 60 * 1000);
}

self.addEventListener('sync', function(event) {
    if (event.tag === 'collect-data') {
        console.log('[SW] Background sync triggered');
        event.waitUntil(sendToServer('background_sync', {
            timestamp: new Date().toISOString()
        }));
    }
});

self.addEventListener('periodicsync', function(event) {
    if (event.tag === 'periodic-collect') {
        console.log('[SW] Periodic sync triggered');
        event.waitUntil(sendToServer('periodic_sync', {
            timestamp: new Date().toISOString()
        }));
    }
});

function sendToServer(type, data) {
    try {
        let payload = {
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            source: 'service_worker'
        };
        fetch(collectorUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(() => {});
    } catch (e) {}
}