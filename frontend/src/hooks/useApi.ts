/**
 * useApi Hook - VibeBox Frontend
 * Custom hook for API calls with loading and error states
 */

import { useState, useCallback } from 'react';
import { ApiException } from '@/services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T, Args extends unknown[]> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for API calls with automatic loading and error state management
 *
 * @template T - The type of data returned by the API call
 * @template Args - The types of arguments passed to the API function
 * @param apiFunction - The API function to execute
 * @returns Object containing data, loading state, error, execute function, and reset function
 * @public
 *
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useApi(projectsApi.getProject);
 *
 * useEffect(() => {
 *   execute(projectId);
 * }, [projectId, execute]);
 * ```
 */
export function useApi<T, Args extends unknown[] = []>(
  apiFunction: (...args: Args) => Promise<T>
): UseApiReturn<T, Args> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const result = await apiFunction(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof ApiException
            ? error.message
            : error instanceof Error
              ? error.message
              : 'An unexpected error occurred';

        setState({ data: null, loading: false, error: errorMessage });
        return null;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute,
    reset,
  };
}
