// Provides a real IndexedDB implementation in jsdom, which has none.
// Must be imported before any module that touches indexedDB (Dexie, rateLimiter).
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * jsdom has no CanvasRenderingContext2D geometry types, and pdfjs-dist reaches
 * for them at import time. Anything importing the receipt parser — which is
 * most of the Items page — would otherwise fail to load at all.
 *
 * These are inert stand-ins: the PDF paths they belong to are not what these
 * tests exercise.
 */
class StubDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  multiply() {
    return this;
  }
  translate() {
    return this;
  }
  scale() {
    return this;
  }
  inverse() {
    return this;
  }
}

if (!('DOMMatrix' in globalThis)) {
  (globalThis as Record<string, unknown>).DOMMatrix = StubDOMMatrix;
}
if (!('Path2D' in globalThis)) {
  (globalThis as Record<string, unknown>).Path2D = class {};
}
if (!('ImageData' in globalThis)) {
  (globalThis as Record<string, unknown>).ImageData = class {
    constructor(
      readonly width = 0,
      readonly height = 0
    ) {}
  };
}

/**
 * Radix primitives call pointer-capture APIs and scrollIntoView that jsdom does
 * not implement. Without these, opening a Select in a test silently does
 * nothing and the options never appear.
 */
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom ships no IntersectionObserver. Components that lazy-load on scroll ask
// for one at mount, so give them a stub that reports the element as visible
// straight away — in a test there is no viewport to scroll.
class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element): void {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as IntersectionObserver
    );
  }

  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

globalThis.IntersectionObserver =
  TestIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage with the full Storage surface (key/length included, which
// the previous mock omitted).
function createStorageMock(): Storage {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: createStorageMock(),
});

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: createStorageMock(),
});

// Isolate every test: the previous setup never reset storage, so state leaked
// between tests and made failures order-dependent.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // Fresh IndexedDB per test.
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
