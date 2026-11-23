// SCKR Fahrtenbuch Service Worker
// 1) App-Start offline: index.html wird zwischengespeichert.
//    Seitenaufrufe: zuerst Netz (max. 4 s, damit Updates sofort ankommen), sonst Cache.
// 2) Kartenkacheln: Cache mit Obergrenze.
var APP = 'sckr-app-v2';
var TILES = 'sckr-tiles-v1';
var TILE_HOSTS = ['tile.openstreetmap.org', 'basemaps.cartocdn.com'];
var TILE_MAX = 3000;
var SHELL = ['./', './index.html'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(APP).then(function(c) {
      return Promise.all(SHELL.map(function(u) { return c.add(u).catch(function() {}); }));
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== APP && k !== TILES; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

function timeout(ms) { return new Promise(function(_, rej) { setTimeout(function() { rej(new Error('timeout')); }, ms); }); }

function trimTiles(cache) {
  return cache.keys().then(function(keys) {
    if (keys.length <= TILE_MAX) return;
    return Promise.all(keys.slice(0, keys.length - TILE_MAX).map(function(k) { return cache.delete(k); }));
  });
}

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = req.url;

  // App-Seite: Netz zuerst, Cache als Rückfall
  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.race([fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }), timeout(4000)]).then(function(res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(APP).then(function(c) { c.put('./index.html', copy); });
          return res;
        }
        // z. B. 404 während eines Umzugs: lieber die zwischengespeicherte App zeigen
        return caches.open(APP).then(function(c) { return c.match('./index.html'); }).then(function(hit) { return hit || res; });
      }).catch(function() {
        return caches.open(APP).then(function(c) {
          return c.match('./index.html')
            .then(function(hit) { return hit || c.match('./'); })
            .then(function(hit) { return hit || fetch(req); });
        });
      })
    );
    return;
  }

  // Kartenkacheln: Cache zuerst
  if (TILE_HOSTS.some(function(h) { return url.indexOf(h) > -1; })) {
    e.respondWith(
      caches.open(TILES).then(function(cache) {
        return cache.match(req).then(function(cached) {
          if (cached) return cached;
          return fetch(req.clone()).then(function(response) {
            if (response.ok) { cache.put(req, response.clone()).then(function() { return trimTiles(cache); }); }
            return response;
          }).catch(function() { return new Response('', { status: 404 }); });
        });
      })
    );
  }
});
