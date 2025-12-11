import axios from 'axios';

// Use relative path to use the same host and port as the frontend
// This works with Vite's proxy and Replit's environment
const API_BASE_URL = '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// CSRF 토큰 캐시
let csrfToken = null;
let csrfTokenPromise = null;

/**
 * CSRF 토큰을 가져옵니다. 캐시된 토큰이 있으면 재사용합니다.
 */
async function getCsrfToken() {
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

/**
 * CSRF 토큰을 초기화합니다
 */
export function clearCsrfToken() {
  csrfToken = null;
  csrfTokenPromise = null;
}

// CSRF 토큰을 요청 헤더에 자동으로 추가하는 인터셉터
apiClient.interceptors.request.use(
  async (config) => {
    // POST, PUT, DELETE, PATCH 요청에만 CSRF 토큰 추가
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      try {
        const token = await getCsrfToken();
        config.headers['X-CSRF-Token'] = token;
      } catch (error) {
        console.warn('CSRF token not available, proceeding without it');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 403 에러 시 CSRF 토큰 초기화
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const text = error.response?.data;
      if (typeof text === 'string' && (text.includes('csrf') || text.includes('CSRF'))) {
        clearCsrfToken();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;