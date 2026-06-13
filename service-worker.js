// =====================================================================
// Service Worker v2.0 — スービック ゴルフナビ オフライン対応
// =====================================================================
const APP_CACHE = 'subic-golf-app-v2';
const TILE_CACHE = 'subic-golf-tiles-v2';

// アプリ本体：インストール時に必ずキャッシュ
const APP_SHELL = [
  './',
  './index.html',
  './holes_complete.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js'
];

// インストール：アプリシェルを保存
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(APP_CACHE)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// 有効化：古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== APP_CACHE && k !== TILE_CACHE)
        .map(k => caches.delete(k))
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
            if (resp.ok) cache.put(e.request, resp.clone());
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

// メッセージ受信：タイル一括キャッシュ
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'CACHE_TILES') {
    const urls = e.data.urls;
    caches.open(TILE_CACHE).then(async cache => {
      let done = 0;
      for (const url of urls) {
        try {
          const req = new Request(url, { mode: 'no-cors' });
          const resp = await fetch(req);
          await cache.put(req, resp);
        } catch(err) {}
        done++;
        if (done % 20 === 0 || done === urls.length) {
          e.source.postMessage({ type: 'CACHE_PROGRESS', done, total: urls.length });
        }
      }
      e.source.postMessage({ type: 'CACHE_DONE', total: urls.length });
    });
  }
});
