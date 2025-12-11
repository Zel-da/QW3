import { createRoot } from "react-dom/client";
import axios from 'axios';
import App from "./App";
import "./index.css";

// CSRF 토큰 캐시
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = fetch('/api/csrf-token', {
    credentials: 'include',
  })
    .then(res => res.json())
    .then(data => {
      csrfToken = data.token;
      csrfTokenPromise = null;
      return data.token;
    })
    .catch(err => {
      csrfTokenPromise = null;
      console.error('Failed to fetch CSRF token:', err);
      throw err;
    });

  return csrfTokenPromise;
}

// axios 기본 설정
axios.defaults.withCredentials = true;

// CSRF 토큰 인터셉터 (모든 axios 인스턴스에 적용)
axios.interceptors.request.use(
  async (config) => {
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
      try {
        const token = await getCsrfToken();
        config.headers['X-CSRF-Token'] = token;
      } catch (error) {
        console.warn('CSRF token not available, proceeding without it');
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 403 에러 시 CSRF 토큰 초기화
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const text = error.response?.data;
      if (typeof text === 'string' && (text.includes('csrf') || text.includes('CSRF'))) {
        csrfToken = null;
        csrfTokenPromise = null;
      }
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById("root")!).render(<App />);

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
      });
  });
}
