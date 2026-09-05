// Provides a real IndexedDB implementation in jsdom, which has none.
// Must be imported before any module that touches indexedDB (Dexie, rateLimiter).
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

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
