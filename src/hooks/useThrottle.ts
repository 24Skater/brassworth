import { useState, useEffect, useRef } from 'react';

/**
 * Throttle hook to limit function calls
 * Useful for scroll handlers, resize handlers, etc.
 *
 * @param value - The value to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled value
 */
export function useThrottle<T>(value: T, limit: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(
      () => {
        if (Date.now() - lastRan.current >= limit) {
          setThrottledValue(value);
          lastRan.current = Date.now();
        }
      },
      limit - (Date.now() - lastRan.current)
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}
