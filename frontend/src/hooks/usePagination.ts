/**
 * usePagination Hook - VibeBox Frontend
 * Custom hook for managing pagination state
 */

import { useState, useCallback } from 'react';

/**
 * Options for configuring pagination behavior
 */
export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

/**
 * Return type for usePagination hook
 */
export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotalPages: (totalPages: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  reset: () => void;
}

/**
 * Hook for managing pagination state
 *
 * Provides a complete pagination state manager with page navigation helpers.
 *
 * @param options - Optional pagination configuration
 * @param options.initialPage - Starting page number (default: 1)
 * @param options.initialPageSize - Items per page (default: 20)
 * @returns Pagination state and navigation functions
 * @public
 *
 * @example
 * ```tsx
 * const { page, pageSize, totalPages, setTotalPages, nextPage, previousPage } = usePagination({
 *   initialPage: 1,
 *   initialPageSize: 10
 * });
 *
 * // After fetching data
 * setTotalPages(Math.ceil(totalItems / pageSize));
 * ```
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialPage = 1, initialPageSize = 20 } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(1);

  const nextPage = useCallback(() => {
    setPage((current) => Math.min(current + 1, totalPages));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setPage((current) => Math.max(current - 1, 1));
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSize(initialPageSize);
    setTotalPages(1);
  }, [initialPage, initialPageSize]);

  return {
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    setTotalPages,
    nextPage,
    previousPage,
    reset,
  };
}
