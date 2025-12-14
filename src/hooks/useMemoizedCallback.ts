import { useCallback, useRef } from 'react';

/**
 * Memoized callback hook that maintains referential equality
 * Similar to useCallback but with automatic dependency tracking
 *
 * @param callback - The callback function
 * @returns Memoized callback
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);

  // Update ref when callback changes
  callbackRef.current = callback;

  // Return stable function reference
  return useCallback(
    ((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }) as T,
    []
  );
}
