import { QueryClient } from "@tanstack/react-query";

/**
 * Shared React Query client.
 * Defaults are tuned for a dashboard-style app (data changes moderately
 * often, we don't want to hammer the API on every window focus).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000), // 1s, 2s, capped at 8s
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
