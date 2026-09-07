/**
 * Resolving a barcode detector.
 *
 * Chrome on Android ships BarcodeDetector; Safari does not. Rather than always
 * carrying a WASM decoder, the platform one is used where it exists and the
 * ponyfill is imported only when it is missing — so the common case never
 * parses or executes it, and the uncommon one still works.
 *
 * Note it is a separate chunk, not a smaller download: the service worker
 * precaches every chunk, so an installed app fetches the decoder once whether
 * or not the browser will ever need it.
 */

export interface DetectedCode {
  rawValue: string;
}

export interface Detector {
  detect(source: CanvasImageSource): Promise<DetectedCode[]>;
}

const FORMATS = ['qr_code'] as const;

/** Whether the browser can decode without a download. */
export function isNativeDetectorAvailable(): boolean {
  return typeof (globalThis as Record<string, unknown>).BarcodeDetector === 'function';
}

/**
 * Whether a native detector can actually read the format we print.
 *
 * The constructor existing is not the same as the format being supported —
 * a browser can expose BarcodeDetector, construct without complaint, and then
 * simply never match anything, which reads as a camera that does not work
 * rather than as an unsupported browser.
 */
async function nativeSupportsQr(): Promise<boolean> {
  const Native = (globalThis as Record<string, unknown>).BarcodeDetector as {
    getSupportedFormats?: () => Promise<string[]>;
  };
  if (typeof Native.getSupportedFormats !== 'function') return true;
  try {
    return (await Native.getSupportedFormats()).includes('qr_code');
  } catch {
    return false;
  }
}

/** A detector, native where possible and downloaded where not. */
export async function resolveDetector(): Promise<Detector> {
  if (isNativeDetectorAvailable() && (await nativeSupportsQr())) {
    const Native = (globalThis as Record<string, unknown>).BarcodeDetector as new (options: {
      formats: readonly string[];
    }) => Detector;
    return new Native({ formats: FORMATS });
  }

  const { BarcodeDetector } = await import('barcode-detector/ponyfill');
  return new BarcodeDetector({ formats: [...FORMATS] }) as unknown as Detector;
}
