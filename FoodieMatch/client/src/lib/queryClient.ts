import { QueryClient, QueryFunction } from "@tanstack/react-query";

// CSRF 토큰 캐시
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * CSRF 토큰을 가져옵니다. 캐시된 토큰이 있으면 재사용합니다.
 */
async function getCsrfToken(): Promise<string> {
  // 이미 토큰이 있으면 반환
  if (csrfToken) {
    return csrfToken;
  }

  // 이미 요청 중이면 해당 Promise 반환 (중복 요청 방지)
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // 새로운 토큰 요청
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
 * CSRF 토큰을 초기화합니다 (로그아웃 시 호출)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
  csrfTokenPromise = null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // 401 인증 만료 시 로그인 페이지로 리다이렉트
    if (res.status === 401) {
      const currentPath = window.location.pathname;
      // 로그인 페이지가 아닌 경우에만 리다이렉트
      if (currentPath !== '/login' && currentPath !== '/register') {
        console.warn('Session expired, redirecting to login...');
        // 현재 경로 저장 (로그인 후 돌아오기 위해)
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        window.location.href = '/login';
        return;
      }
      throw new Error('401: 인증이 필요합니다');
    }

    // CSRF 토큰 오류 시 토큰 갱신 후 재시도할 수 있도록 초기화
    if (res.status === 403) {
      const text = await res.text();
      if (text.includes('csrf') || text.includes('CSRF')) {
        clearCsrfToken();
      }
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // 상태 변경 요청(POST, PUT, DELETE, PATCH)에 CSRF 토큰 추가
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
    try {
      const token = await getCsrfToken();
      headers["X-CSRF-Token"] = token;
    } catch (error) {
      console.warn('CSRF token not available, proceeding without it');
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false, // 비활성화: 불필요한 재요청 방지
      staleTime: 10 * 60 * 1000, // 10분 후 stale (Compute 절약)
      gcTime: 15 * 60 * 1000, // 15분 후 가비지 컬렉션
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
