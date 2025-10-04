/**
 * usePagination Hook Tests
 * Tests for pagination state management and navigation
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '@/hooks/usePagination';

describe('usePagination', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(1);
  });

  it('should initialize with custom values', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 2, initialPageSize: 10 })
    );

    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(10);
  });

  it('should set page', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);
  });

  it('should set page size', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPageSize(50);
    });

    expect(result.current.pageSize).toBe(50);
  });

  it('should set total pages', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setTotalPages(10);
    });

    expect(result.current.totalPages).toBe(10);
  });

  it('should navigate to next page', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setTotalPages(5);
    });

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(3);
  });

  it('should not navigate beyond total pages', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setTotalPages(3);
      result.current.setPage(3);
    });

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(3);
  });

  it('should navigate to previous page', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPage(3);
    });

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.page).toBe(2);

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.page).toBe(1);
  });

  it('should not navigate before page 1', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(1);

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.page).toBe(1);
  });

  it('should reset to initial values', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 2, initialPageSize: 10 })
    );

    act(() => {
      result.current.setPage(5);
      result.current.setPageSize(50);
      result.current.setTotalPages(10);
    });

    expect(result.current.page).toBe(5);
    expect(result.current.pageSize).toBe(50);
    expect(result.current.totalPages).toBe(10);

    act(() => {
      result.current.reset();
    });

    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(1);
  });

  it('should handle complete pagination flow', () => {
    const { result } = renderHook(() => usePagination({ initialPageSize: 10 }));

    // Simulate fetching data
    act(() => {
      const totalItems = 95;
      const totalPages = Math.ceil(totalItems / result.current.pageSize);
      result.current.setTotalPages(totalPages); // 10 pages
    });

    expect(result.current.totalPages).toBe(10);
    expect(result.current.page).toBe(1);

    // Navigate through pages
    act(() => {
      result.current.nextPage();
      result.current.nextPage();
      result.current.nextPage();
    });

    expect(result.current.page).toBe(4);

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.page).toBe(3);

    // Jump to specific page
    act(() => {
      result.current.setPage(7);
    });

    expect(result.current.page).toBe(7);

    // Try to go beyond total pages
    act(() => {
      result.current.setPage(15);
      result.current.nextPage();
    });

    expect(result.current.page).toBe(10);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(1);
  });

  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => usePagination());

    const initialNextPage = result.current.nextPage;
    const initialPreviousPage = result.current.previousPage;
    const initialReset = result.current.reset;

    rerender();

    expect(result.current.nextPage).toBe(initialNextPage);
    expect(result.current.previousPage).toBe(initialPreviousPage);
    expect(result.current.reset).toBe(initialReset);
  });
});
