// 서비스 워커: 오프라인 지원 + 앱 셸 캐시.
// 전략: 같은 출처 GET은 network-first(온라인이면 최신, 오프라인이면 캐시).
// → 헬스장에서 신호 없어도 동작하고, 온라인일 땐 항상 최신 코드를 받음(캐시 정체 방지).
const CACHE = 'workout-planner-v2';
const SHELL = [
  './',
  'index.html',
  'css/styles.css',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'js/app.js', 'js/store.js', 'js/engine.js', 'js/adjust.js', 'js/exercises.js',
  'js/templates.js', 'js/core-util.js', 'js/util.js', 'js/ai.js', 'js/inbody.js',
  'js/recommend.js', 'js/trend.js', 'js/sync.js',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // API(POST 등)는 그대로 통과
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 외부(anthropic 등)는 통과

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match('index.html')))
  );
});
