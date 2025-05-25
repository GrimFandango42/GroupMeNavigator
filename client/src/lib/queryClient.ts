import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Construct an error object that includes the status
    const error: any = new Error(`${res.status}: ${text}`);
    error.status = res.status; // Attach status for easier access
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`[API Request] ${method} ${url}`, data || '');
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // throwIfResNotOk will throw an error for non-ok responses,
    // which will be caught by the catch block below.
    await throwIfResNotOk(res);

    console.log(`[API Response] ${method} ${url} - Status ${res.status}`);
    return res;
  } catch (error: any) {
    // error.message here will include status and text from throwIfResNotOk
    // or a network error message from fetch itself.
    console.error(`[API Error] ${method} ${url} - Error: ${error.message}`);
    throw error; // Re-throw the error to be handled by the caller
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
      queryFn: getQueryFn({ on401: "throw" }),
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
