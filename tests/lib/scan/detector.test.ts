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
  it('falls back when the browser has a detector that cannot read QR', async () => {
    // A constructor that exists but does not support the format reads to a
    // user as a camera that simply never works.
    const construct = vi.fn();
    class Fake {
      constructor(options: unknown) {
        construct(options);
      }
      static getSupportedFormats() {
        return Promise.resolve(['ean_13']);
      }
    }
    (globalThis as Record<string, unknown>).BarcodeDetector = Fake;

    const detector = await resolveDetector();

    expect(construct).not.toHaveBeenCalled();
    expect(typeof detector.detect).toBe('function');
  });

  it('uses the native detector when it reports QR support', async () => {
    const construct = vi.fn();
    class Fake {
      constructor(options: unknown) {
        construct(options);
      }
      static getSupportedFormats() {
        return Promise.resolve(['qr_code', 'ean_13']);
      }
    }
    (globalThis as Record<string, unknown>).BarcodeDetector = Fake;

    await resolveDetector();

    expect(construct).toHaveBeenCalledWith({ formats: ['qr_code'] });
  });
});
