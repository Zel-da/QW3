import { createRoot } from "react-dom/client";
import axios from 'axios';
import App from "./App";
import "./index.css";

// axios 기본 설정
axios.defaults.withCredentials = true;

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
