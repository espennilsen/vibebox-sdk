/**
 * useDebounce Hook - VibeBox Frontend
 * Custom hook to debounce values (useful for search inputs)
 */

import { useState, useEffect } from 'react';

/**
 * Hook to debounce a value with a delay
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
