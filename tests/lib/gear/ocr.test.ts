import { describe, it, expect, vi, beforeEach } from 'vitest';

const recognize = vi.fn();
const terminate = vi.fn();
const createWorker = vi.fn();

vi.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => createWorker(...args),
}));

const { TesseractDataPlateOcr } = await import('@/lib/gear/ocr');

/**
 * The OCR wrapper's contract, with Tesseract mocked.
 *
 * Not a test of Tesseract — a test that the worker is created, used and, above
 * all, *terminated*. A worker holds a WebAssembly instance and the trained data
 * for the language; leaking one per scan is a real memory problem on the
 * phone-in-the-garage case this feature exists for, and leaking one on the
 * error path is the version of that bug nobody notices.
 */

function plate(): File {
  return new File(['plate'], 'plate.jpg', { type: 'image/jpeg' });
}

describe('TesseractDataPlateOcr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createWorker.mockResolvedValue({ recognize, terminate });
    recognize.mockResolvedValue({ data: { text: 'MODEL DCD791' } });
  });

  it('loads the English language model', async () => {
    await new TesseractDataPlateOcr().read(plate(), []);
    expect(createWorker).toHaveBeenCalledWith('eng');
  });

  it('parses the recognised text into plate fields', async () => {
    recognize.mockResolvedValue({
      data: { text: 'DEWALT\nCAT NO. DCD791\nSERIAL NO. 2019-45-A0012' },
    });

    const reading = await new TesseractDataPlateOcr().read(plate(), ['DeWalt']);

    expect(reading).toMatchObject({
      brand: 'DeWalt',
      model: 'DCD791',
      serialNumber: '2019-45-A0012',
    });
  });

  it('recognises only the brands it was given', async () => {
    recognize.mockResolvedValue({ data: { text: 'DEWALT MODEL DCD791' } });
    const reading = await new TesseractDataPlateOcr().read(plate(), ['Makita']);
    expect(reading.brand).toBeUndefined();
  });

  it('terminates the worker after a successful read', async () => {
    await new TesseractDataPlateOcr().read(plate(), []);
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('terminates the worker even when recognition throws', async () => {
    recognize.mockRejectedValue(new Error('bad image'));

    await expect(new TesseractDataPlateOcr().read(plate(), [])).rejects.toThrow('bad image');
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('keeps the raw text, so a bad read can be inspected', async () => {
    recognize.mockResolvedValue({ data: { text: '~~~ blurry ~~~' } });
    const reading = await new TesseractDataPlateOcr().read(plate(), []);
    expect(reading.rawText).toBe('~~~ blurry ~~~');
  });
});
