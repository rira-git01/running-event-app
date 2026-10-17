/* オフライン用の Service Worker。
   ・自分のサイト内のファイルだけをキャッシュする（天気・大会情報など外部への通信には一切関与しない）
   ・アプリを更新したら CACHE_VERSION を変える（古いキャッシュは自動で消える）
   ・ページはオンラインなら最新を取得し、取れないときだけ保存済みを使う */
const CACHE_VERSION = 'running-event-app-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // 外部への通信はそのまま通す
  if (url.pathname.endsWith('/events.json')) return; // 大会リストは常に最新を取りにいく（キャッシュしない）
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, copy)); } return res; })));
});
