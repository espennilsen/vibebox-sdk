/**
 * useDebounce Hook Tests
 * Tests for value debouncing with delay
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));

    expect(result.current).toBe('test');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time by 500ms
    await vi.advanceTimersByTimeAsync(500);

    // Value should now be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel previous timeout on rapid value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    );

    expect(result.current).toBe('first');

    // Update value multiple times
    rerender({ value: 'second', delay: 500 });
    await vi.advanceTimersByTimeAsync(200);
    rerender({ value: 'third', delay: 500 });
    await vi.advanceTimersByTimeAsync(200);
    rerender({ value: 'fourth', delay: 500 });

    // Value should still be the initial value
    expect(result.current).toBe('first');

    // Fast-forward past the delay
    await vi.advanceTimersByTimeAsync(500);

    // Only the last value should be applied
    expect(result.current).toBe('fourth');
  });

  it('should handle different delay values', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 1000 } }
    );

    rerender({ value: 'updated', delay: 1000 });

    // Should not update after 500ms
    await vi.advanceTimersByTimeAsync(500);
    expect(result.current).toBe('test');

    // Should update after 1000ms
    await vi.advanceTimersByTimeAsync(500);
    expect(result.current).toBe('updated');
  });

  it('should work with different data types', async () => {
    // Test with numbers
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    );

    numberRerender({ value: 42 });
    await vi.advanceTimersByTimeAsync(300);
    expect(numberResult.current).toBe(42);

    // Test with objects
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: { count: 0 } } }
    );

    const newValue = { count: 5 };
    objectRerender({ value: newValue });
    await vi.advanceTimersByTimeAsync(300);
    expect(objectResult.current).toEqual(newValue);

    // Test with arrays
    const { result: arrayResult, rerender: arrayRerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: [1, 2] } }
    );

    const newArray = [3, 4, 5];
    arrayRerender({ value: newArray });
    await vi.advanceTimersByTimeAsync(300);
    expect(arrayResult.current).toEqual(newArray);
  });

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should handle zero delay', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    );

    rerender({ value: 'updated', delay: 0 });
    await vi.advanceTimersByTimeAsync(0);

    expect(result.current).toBe('updated');
  });
});
