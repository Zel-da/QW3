import { createRoot } from "react-dom/client";
import axios from 'axios';
import App from "./App";
import "./index.css";
import { markAppError } from "./lib/cacheReset";

// axios 기본 설정
axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")!).render(<App />);

// 앱 이상 감지 — 캐시 오염·구버전 청크 로드 실패 등
// 감지되면 markAppError로 sessionStorage 플래그 → 배너에서 캐시 삭제 유도
window.addEventListener('error', (e: any) => {
  const msg = e?.message || '';
  const filename = e?.filename || '';
  // Vite 청크 로드 실패 (해시 변경 등)
  if (msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Loading CSS chunk') ||
      (filename.includes('/assets/') && msg.includes('MIME'))) {
    markAppError(`chunk load: ${msg.slice(0, 80)}`);
  }
});
window.addEventListener('unhandledrejection', (e: any) => {
  const msg = e?.reason?.message || String(e?.reason || '');
  if (msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk')) {
    markAppError(`chunk load (promise): ${msg.slice(0, 80)}`);
  }
});

// Service Worker 등록 (프로덕션 환경에서만)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered:', registration.scope);

        // 새 버전 감지 시 사용자에게 알림
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 새 버전 설치됨 - 사용자에게 알림 가능
                console.log('[SW] New version available');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
        markAppError(`SW register failed: ${error?.message ?? error}`);
      });
  });
}
