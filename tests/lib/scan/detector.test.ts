import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNativeDetectorAvailable, resolveDetector } from '@/lib/scan/detector';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).BarcodeDetector;
  vi.restoreAllMocks();
});

describe('isNativeDetectorAvailable', () => {
  it('is false when the browser has no BarcodeDetector', () => {
    expect(isNativeDetectorAvailable()).toBe(false);
  });

  it('is true when the browser has one', () => {
    (globalThis as Record<string, unknown>).BarcodeDetector = class {};
    expect(isNativeDetectorAvailable()).toBe(true);
  });
});

describe('resolveDetector', () => {
  it('uses the native detector when the browser has one', async () => {
    const construct = vi.fn();
    (globalThis as Record<string, unknown>).BarcodeDetector = class {
      constructor(options: unknown) {
        construct(options);
      }
    };

    await resolveDetector();

    expect(construct).toHaveBeenCalledWith({ formats: ['qr_code'] });
  });

  it('falls back to the ponyfill and still detects', async () => {
    const detector = await resolveDetector();

    expect(typeof detector.detect).toBe('function');
  });
});
