/**
 * usePagination Hook - VibeBox Frontend
 * Custom hook for managing pagination state
 */

import { useState, useCallback } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationReturn {
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
