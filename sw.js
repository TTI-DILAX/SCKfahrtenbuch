// SCKR Suite Service Worker - Offline Map Tile Cache
var CACHE = 'sckr-tiles-v1';
var TILE_HOSTS = ['tile.openstreetmap.org', 'basemaps.cartocdn.com'];

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  var isTile = TILE_HOSTS.some(function(h){ return url.indexOf(h) > -1; });
  if(isTile) {
    e.respondWith(
      caches.open(CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if(cached) return cached;
          return fetch(e.request.clone()).then(function(response) {
            if(response.ok) cache.put(e.request, response.clone());
            return response;
          }).catch(function() {
            return new Response('', {status: 404});
          });
        });
      })
    );
  }
});
