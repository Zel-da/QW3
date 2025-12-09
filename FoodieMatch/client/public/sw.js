/**
 * Service Worker for Safety Platform PWA
 * - 정적 자산 캐싱
 * - 오프라인 폴백
 * - 네트워크 우선 전략 (API)
 * - 캐시 우선 전략 (정적 파일)
 */

const CACHE_NAME = 'safety-platform-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// 정적 자산 (앱 셸) - 항상 캐싱
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// API 경로 패턴 (캐싱하지 않음)
const API_PATTERNS = ['/api/'];

// 캐시 제외 패턴
const NO_CACHE_PATTERNS = [
  '/api/',
  'chrome-extension://',
  'sockjs-node',
  '__vite',
  'hot-update',
];

/**
 * 설치 이벤트 - 정적 자산 캐싱
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

/**
 * 활성화 이벤트 - 오래된 캐시 정리
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== STATIC_CACHE &&
                     name !== DYNAMIC_CACHE &&
                     name !== CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Old caches cleared');
        return self.clients.claim();
      })
  );
});

/**
 * 요청이 캐싱 제외 대상인지 확인
 */
function shouldSkipCache(url) {
  return NO_CACHE_PATTERNS.some((pattern) => url.includes(pattern));
}

/**
 * 요청이 API 호출인지 확인
 */
function isApiRequest(url) {
  return API_PATTERNS.some((pattern) => url.includes(pattern));
}

/**
 * 요청이 정적 자산인지 확인
 */
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some((ext) => url.endsWith(ext));
}

/**
 * 페치 이벤트 - 네트워크 요청 가로채기
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // 캐싱 제외 대상은 그냥 통과
  if (shouldSkipCache(url)) {
    return;
  }

  // API 요청: 네트워크 우선 (오프라인 시 실패)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // API 요청 실패 시 오프라인 응답
          return new Response(
            JSON.stringify({
              message: '오프라인 상태입니다. 인터넷 연결을 확인해주세요.',
              offline: true
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // 정적 자산: 캐시 우선, 없으면 네트워크
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // 캐시 히트 - 백그라운드에서 업데이트
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(DYNAMIC_CACHE)
                    .then((cache) => cache.put(request, networkResponse.clone()));
                }
              })
              .catch(() => {}); // 네트워크 실패 무시
            return cachedResponse;
          }

          // 캐시 미스 - 네트워크에서 가져오기
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
              return networkResponse;
            });
        })
    );
    return;
  }

  // HTML 페이지: 네트워크 우선, 실패 시 캐시 (SPA)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // 성공 응답은 캐싱
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시된 index.html 반환 (SPA 라우팅)
        return caches.match('/index.html')
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // 캐시도 없으면 오프라인 페이지
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>오프라인</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h1>오프라인 상태</h1><p>인터넷 연결을 확인해주세요.</p></div></body></html>',
              {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              }
            );
          });
      })
  );
});

/**
 * 메시지 이벤트 - 클라이언트와 통신
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

/**
 * 백그라운드 동기화 (향후 오프라인 TBM 저장 용)
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-tbm-drafts') {
    event.waitUntil(
      // IndexedDB에서 동기화 대기 중인 데이터 처리
      // 이 기능은 offlineStorage.ts와 연동됨
      Promise.resolve()
    );
  }
});

console.log('[SW] Service Worker loaded');
