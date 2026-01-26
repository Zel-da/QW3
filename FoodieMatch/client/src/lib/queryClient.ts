import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
