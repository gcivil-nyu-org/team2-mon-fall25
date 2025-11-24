// --- useDebounce.ts ---
import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value. The returned value only updates after
 * the input value stops changing for the specified delay.
 * @param value The value to debounce (e.g., the raw input text).
 * @param delay The delay in milliseconds (e.g., 300).
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update debouncedValue after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // If 'value' changes before the delay, clear the old timer and start a new one
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Rerun effect only if value or delay changes

  return debouncedValue;
}