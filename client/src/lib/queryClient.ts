import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCsrfToken, setCsrfToken } from "./csrf";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      // Try to get more detailed error from response body
      const text = await res.text();
      if (text) {
        errorMessage = text;
      }
    } catch (e) {
      console.error("Failed to parse error response body:", e);
    }
    
    console.error(`API Response Error: ${res.status} ${errorMessage}`);
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data);

  try {
    const headers: Record<string, string> = {};
    const upperMethod = method.toUpperCase();
    const requiresCsrf = !["GET", "HEAD", "OPTIONS"].includes(upperMethod);

    if (data !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (requiresCsrf) {
      const token = getCsrfToken();
      if (token) {
        headers["X-CSRF-Token"] = token;
      }
    }

    const res = await fetch(url, {
      method,
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log(`API Response: ${res.status} ${res.statusText}`);
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request Error: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export function getQueryFn<T>({
  on401: unauthorizedBehavior,
}: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  return async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      setCsrfToken(null);
      return null;
    }

    await throwIfResNotOk(res);
    const payload = await res.json();

    if (payload && typeof payload === "object" && "csrfToken" in payload) {
      const csrfToken = (payload as { csrfToken?: string }).csrfToken ?? null;
      setCsrfToken(csrfToken);

      if (Object.prototype.hasOwnProperty.call(payload, "user")) {
        return (payload as { user: T }).user;
      }
    }

    return payload as T;
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // Změněno z "throw" na "returnNull" pro všechny dotazy
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
