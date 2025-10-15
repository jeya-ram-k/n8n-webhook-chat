/// <reference lib="webworker" />

// FIX: Removed the redundant declaration of `self` which was causing a redeclaration error.
// The `/// <reference lib="webworker" />` directive already provides the correct typings for the service worker global scope.

const CACHE_NAME = 'n8n-webhook-chat-cache-v1';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/icon.svg',
  '/manifest.json'
];

const CDN_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://aistudiocdn.com/react@^19.2.0',
    'https://aistudiocdn.com/react-dom@^19.2.0',
    'https://aistudiocdn.com/react@^19.2.0/',
    'https://aistudiocdn.com/react-dom@^19.2.0/',
    'https://esm.sh/react-markdown@9?bundle',
    'https://esm.sh/remark-gfm@4?bundle'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('Opened cache and caching core assets.');
      
      // Cache core assets with regular requests
      const coreAssetsPromise = cache.addAll(CORE_ASSETS).catch(error => {
          console.error('Failed to cache one or more core assets:', error);
      });

      // Cache CDN assets with no-cors requests to handle opaque responses
      const cdnAssetsPromises = Promise.all(
          CDN_ASSETS.map(url => {
              return fetch(url, { mode: 'no-cors' })
                  .then(response => cache.put(url, response))
                  .catch(err => console.warn(`Failed to cache CDN asset: ${url}`, err));
          })
      );
      
      await Promise.all([coreAssetsPromise, cdnAssetsPromises]);
      console.log('All specified assets cached.');
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        
        // Don't cache API calls
        if (!event.request.url.includes('/webhook/')) {
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }

        return networkResponse;
      }).catch(error => {
        console.error('Fetch failed; network request failed.', error);
        // A real app might return a custom offline fallback page here
        // For now, we let the browser handle the error.
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
