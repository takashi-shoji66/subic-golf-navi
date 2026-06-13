// =====================================================================
// Service Worker - オフラインキャッシュ制御
// =====================================================================
const APP_CACHE = 'subic-golf-app-v1';
const TILE_CACHE = 'subic-golf-tiles-v1';

// アプリ本体（シェル）：インストール時に必ずキャッシュ
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './holes.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

// インストール：アプリシェルを保存
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(APP_CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// 有効化：古いキャッシュを掃除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== APP_CACHE && k !== TILE_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// フェッチ戦略
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // 地図タイル：cache-first（保存済みならオフラインでも表示）
  if (url.includes('arcgisonline.com') || url.includes('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(e.request).then(hit => {
          if (hit) return hit;
          return fetch(e.request).then(resp => {
            cache.put(e.request, resp.clone());
            return resp;
          }).catch(() => hit);
        })
      )
    );
    return;
  }

  // アプリシェル：cache-first
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});
