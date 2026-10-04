const CACHE = 'nicu-proc-v27';
const FILES = ['./', './index.html', './brain.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './badge-print-letter.pdf', './badge-cards.pdf', './booklet-print-letter.pdf', './booklet-pages.pdf', './guide2-print-letter.pdf', './guide2-pages.pdf'];
// Install: download fresh copies (skip the browser's HTTP cache) so a new version never picks up old files.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, {cache: 'reload'})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function withTimeout(ms, p) {
  return new Promise((ok, fail) => { const t = setTimeout(() => fail(new Error('timeout')), ms);
    p.then(v => { clearTimeout(t); ok(v); }, err => { clearTimeout(t); fail(err); }); });
}
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin !== location.origin) return;
  const isPage = r.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    // Pages: try the internet first (3-second limit) so updates show right away; fall back to the saved copy offline.
    e.respondWith(withTimeout(3000, fetch(r, {cache: 'no-store'})).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); return res;
    }).catch(() => caches.match(r, {ignoreSearch: true}).then(hit => hit || caches.match('./index.html'))));
    return;
  }
  // Everything else (icons, PDFs): saved copy first; each new version re-downloads them at install.
  e.respondWith(caches.match(r, {ignoreSearch: true}).then(hit => hit || fetch(r).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); return res;
  })));
});
