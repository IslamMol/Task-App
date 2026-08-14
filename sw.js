// Service Worker — отвечает ТОЛЬКО за доступность самого приложения
// (frontend-файлы) без сети. Данные пользователя (Supabase) — вне
// его зоны ответственности, этим занимается src/db/sync.js.
//
// Версионирование: при любом изменении списка файлов ниже — подними
// номер в CACHE. Старые версии кэша удаляются сами при активации новой.

const CACHE = 'put-v12';

// "Скелет" приложения — всё, что нужно, чтобы открыть его без интернета.
// Внешние библиотеки (Supabase JS, Dexie) кэшируются тоже — иначе первый
// офлайн-запуск после установки страницы сломается на их загрузке.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './src/app.js',
  './src/dashboard.js',
  './src/auth.js',
  './src/compass.js',
  './src/entries.js',
  './src/nav.js',
  './src/stats.js',
  './src/theme.js',
  './src/state.js',
  './src/constants.js',
  './src/i18n.js',
  './src/personalization.js',
  './src/services/supabase.js',
  './src/utils/date.js',
  './src/utils/dom.js',
  './src/db/indexeddb.js',
  './src/db/sync.js',
  './src/pages/calendar.js',
  './src/pages/settings.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.min.js',
];

self.addEventListener('install', e => {
  // Новая версия сразу становится "ожидающей активации" без задержки —
  // вместе с clients.claim() ниже это чинит типичный баг PWA, когда после
  // обновления кода нужно закрывать и открывать приложение по два раза.
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isSupabaseRequest(url){
  return url.includes('.supabase.co');
}

self.addEventListener('fetch', e => {
  const { request } = e;
  if(request.method !== 'GET') return;

  // Supabase — никогда не кэшируем и не перехватываем. Данные, чтения,
  // запись, вход — всё это должно идти напрямую в сеть (а если сети нет,
  // за офлайн-поведение тут отвечает Sync Manager, не этот файл).
  if(isSupabaseRequest(request.url)) return;

  e.respondWith(
    caches.match(request).then(cached => {
      if(cached) return cached;
      return fetch(request).catch(() => {
        // Сети нет и в кэше не нашлось — если это переход по адресу
        // (открытие самого приложения), лучше показать закэшированный
        // index.html, чем пустой экран ошибки браузера.
        if(request.mode === 'navigate'){
          return caches.match('./index.html');
        }
      });
    })
  );
});
