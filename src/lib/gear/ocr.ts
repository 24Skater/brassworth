import { createWorker } from 'tesseract.js';
import { parseDataPlate, type DataPlateReading } from './dataPlate';

/**
 * Reading a data plate from a photograph.
 *
 * The OCR half, kept apart from the parsing half so that `dataPlate.ts` stays
 * pure and testable without a browser or a 10 MB language model. This file is
 * the only part that needs either.
 */

export interface DataPlateOcr {
  read(file: File, knownBrands: readonly string[]): Promise<DataPlateReading>;
}

/**
 * Tesseract, which the app already ships for receipts.
 *
 * The worker is created per read and terminated in a `finally`. It holds a
 * WebAssembly instance and the trained data for the language, and leaking one
 * per scan would be a real memory problem on the phone-in-the-garage case this
 * feature exists for.
 */
export class TesseractDataPlateOcr implements DataPlateOcr {
  async read(file: File, knownBrands: readonly string[]): Promise<DataPlateReading> {
    const worker = await createWorker('eng');

    try {
      const {
        data: { text },
      } = await worker.recognize(file);
      return parseDataPlate(text, knownBrands);
    } finally {
      await worker.terminate();
    }
  }
}
