import { QueryClient, QueryFunction } from "@tanstack/react-query";

let csrfToken: string | null = null;

if (typeof window !== "undefined") {
  csrfToken = window.localStorage.getItem("csrfToken");
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      window.localStorage.setItem("csrfToken", token);
    } else {
      window.localStorage.removeItem("csrfToken");
    }
  }
}

export function getCsrfToken() {
  return csrfToken;
}

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

type ApiRequestArgs =
  | [method: string, url: string, data?: unknown | undefined]
  | [url: string, method: string, data?: unknown | undefined];

export async function apiRequest(...args: ApiRequestArgs): Promise<Response> {
  let method = args[0];
  let url = args[1];
  let data = args[2];

  if (args[0].startsWith("/")) {
    url = args[0];
    method = args[1];
    data = args[2];
  }

  method = method.toUpperCase();

  console.log(`API Request: ${method} ${url}`, data);

  try {
    const headers: Record<string, string> = {};

    if (data !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
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
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
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
