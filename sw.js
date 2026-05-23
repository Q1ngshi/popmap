const CACHE_NAME = 'popmap-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './share.html',
  './css/style.css',
  './js/config.js',
  './js/app.js',
  './js/tsp-worker.js',
  './manifest.json'
];

// Install: 预缓存关键资源 + images/*.png
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).then(() => {
        return fetch('./images/').then(response => response.text()).then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const links = doc.querySelectorAll('a');
          const pngFiles = [];
          links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.endsWith('.png')) {
              pngFiles.push('./images/' + href);
            }
          });
          return cache.addAll(pngFiles).catch(() => {});
        }).catch(() => {});
      });
    })
  );
  self.skipWaiting();
});

// Activate: 清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache First 策略
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // CDN 资源（Cesium / LZString）走 Network First
  if (
    url.hostname.includes('cesium.com') ||
    url.hostname.includes('unpkg.com')
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 其他资源：Cache First + 离线回退
  event.respondWith(cacheFirst(event.request));
});

function cacheFirst(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      return response;
    }).catch(() => {
      if (request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    });
  });
}

function networkFirst(request) {
  return fetch(request).then(response => {
    if (response && response.status === 200) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
    }
    return response;
  }).catch(() => {
    return caches.match(request);
  });
}