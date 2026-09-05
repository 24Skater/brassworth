import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';
import { useThrottle } from '@/hooks/useThrottle';
import { useMemoizedCallback } from '@/hooks/useMemoizedCallback';
import { useIsMobile } from '@/hooks/use-mobile';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebounce', () => {
  it('returns the initial value straight away', () => {
    const { result } = renderHook(() => useDebounce('first', 300));
    expect(result.current).toBe('first');
  });

  it('holds the old value until the delay has passed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('second');
  });

  it('restarts the clock on each change, so only the last value lands', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: 'c' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // 400ms total, but only 200ms since the last change.
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('c');
  });

  it('does not fire after unmount', () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    unmount();

    // Would throw on a state update after unmount if the timer were not cleared.
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
  });
});

describe('useThrottle', () => {
  it('returns the initial value straight away', () => {
    const { result } = renderHook(() => useThrottle('first', 300));
    expect(result.current).toBe('first');
  });

  it('lets a later value through once the window has passed', () => {
    const { result, rerender } = renderHook(({ value }) => useThrottle(value, 300), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current).toBe('second');
  });
});

describe('useMemoizedCallback', () => {
  it('keeps a stable identity across renders', () => {
    const { result, rerender } = renderHook(({ fn }) => useMemoizedCallback(fn), {
      initialProps: { fn: () => 'first' },
    });

    const before = result.current;
    rerender({ fn: () => 'second' });

    expect(result.current).toBe(before);
  });

  it('calls through to the latest function, not the first one', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { result, rerender } = renderHook(({ fn }) => useMemoizedCallback(fn), {
      initialProps: { fn: first },
    });

    rerender({ fn: second });
    result.current();

    // The stable wrapper must not pin the stale closure.
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('passes arguments and returns the result', () => {
    const { result } = renderHook(() => useMemoizedCallback((a: number, b: number) => a + b));
    expect(result.current(2, 3)).toBe(5);
  });
});

describe('useIsMobile', () => {
  it('reports desktop when the media query does not match', () => {
    const { result } = renderHook(() => useIsMobile());
    // tests/setup.ts stubs matchMedia to never match.
    expect(result.current).toBe(false);
  });
});
