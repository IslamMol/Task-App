const CACHE = 'put-v3';
const FILES = [
  './index.html', './manifest.json', './icon.png',
  './src/app.js', './src/auth.js', './src/compass.js', './src/entries.js',
  './src/nav.js', './src/stats.js', './src/theme.js', './src/state.js',
  './src/constants.js',
  './src/services/supabase.js',
  './src/utils/date.js', './src/utils/dom.js',
  './src/db/indexeddb.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
