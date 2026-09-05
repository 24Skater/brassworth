import { describe, it, expect } from 'vitest';
import { parseDataPlate, brandsFrom } from '@/lib/gear/dataPlate';
import type { GearProfile } from '@/types';

const BRANDS = ['DeWalt', 'Milwaukee', 'Makita', 'Ryobi', 'Festool', 'Cisco', '3M'];

describe('parseDataPlate — model', () => {
  it('reads a MODEL label', () => {
    expect(parseDataPlate('MODEL DCD791', BRANDS).model).toBe('DCD791');
  });

  it('reads a colon-separated model', () => {
    expect(parseDataPlate('Model: SG350-28', BRANDS).model).toBe('SG350-28');
  });

  it('reads MODEL NO. with a full stop', () => {
    expect(parseDataPlate('MODEL NO. XPH12Z', BRANDS).model).toBe('XPH12Z');
  });

  it('reads a catalogue number, which is what some brands print instead', () => {
    expect(parseDataPlate('CAT. NO. 2804-20', BRANDS).model).toBe('2804-20');
  });

  it('does not mistake TYPE for the model', () => {
    expect(parseDataPlate('TYPE 1', BRANDS).model).toBeUndefined();
  });

  it('stops at the next label on the same line', () => {
    const read = parseDataPlate('MODEL DCD791 S/N 2019A0012', BRANDS);
    expect(read.model).toBe('DCD791');
    expect(read.serialNumber).toBe('2019A0012');
  });
});

describe('parseDataPlate — serial', () => {
  it('reads S/N', () => {
    expect(parseDataPlate('S/N DNI2140A1B2', BRANDS).serialNumber).toBe('DNI2140A1B2');
  });

  it('reads SERIAL NO.', () => {
    expect(parseDataPlate('SERIAL NO. G54A0123', BRANDS).serialNumber).toBe('G54A0123');
  });

  it('reads a bare SN label', () => {
    expect(parseDataPlate('SN: 123456789', BRANDS).serialNumber).toBe('123456789');
  });

  it('does not read SN out of the middle of a word', () => {
    expect(parseDataPlate('DESNORKEL 4471', BRANDS).serialNumber).toBeUndefined();
  });
});

describe('parseDataPlate — brand', () => {
  it('recognises a known brand anywhere on the plate', () => {
    expect(parseDataPlate('DEWALT\nINDUSTRIAL TOOL CO.\nMODEL DCD791', BRANDS).brand).toBe(
      'DeWalt'
    );
  });

  it('returns the brand spelled as the catalogue spells it, not as OCR read it', () => {
    expect(parseDataPlate('MILWAUKEE ELECTRIC TOOL', BRANDS).brand).toBe('Milwaukee');
  });

  it('matches a brand written with spacing OCR introduced', () => {
    expect(parseDataPlate('DE WALT', BRANDS).brand).toBe('DeWalt');
  });

  it('reports no brand rather than guessing one off an unlabelled line', () => {
    const read = parseDataPlate('ACME POWER CO.\nMADE IN CHINA\nMODEL AP-100', BRANDS);
    expect(read.brand).toBeUndefined();
    expect(read.model).toBe('AP-100');
  });

  it('never returns MADE IN CHINA as a brand', () => {
    expect(parseDataPlate('MADE IN CHINA', BRANDS).brand).toBeUndefined();
  });

  it('prefers the longer brand when one name contains another', () => {
    expect(parseDataPlate('MILWAUKEE', ['Milwaukee', 'Wauke']).brand).toBe('Milwaukee');
  });
});

describe('parseDataPlate — whole plates', () => {
  it('reads a cordless drill plate', () => {
    const text = [
      'DEWALT',
      'INDUSTRIAL TOOL CO.',
      'CAT NO. DCD791',
      'TYPE 1',
      'SERIAL NO. 2019-45-A0012',
      '20V MAX',
      'MADE IN CHINA',
    ].join('\n');

    expect(parseDataPlate(text, BRANDS)).toMatchObject({
      brand: 'DeWalt',
      model: 'DCD791',
      serialNumber: '2019-45-A0012',
    });
  });

  it('reads a network switch plate', () => {
    const text = ['Cisco Systems, Inc.', 'Model: SG350-28', 'S/N: DNI2140A1B2', '110-240V'].join(
      '\n'
    );

    expect(parseDataPlate(text, BRANDS)).toMatchObject({
      brand: 'Cisco',
      model: 'SG350-28',
      serialNumber: 'DNI2140A1B2',
    });
  });

  it('keeps the raw text so a bad read can be inspected', () => {
    expect(parseDataPlate('MODEL X', BRANDS).rawText).toBe('MODEL X');
  });

  it('returns nothing but the raw text for a plate it cannot read', () => {
    const read = parseDataPlate('~~~ blurry ~~~', BRANDS);
    expect(read.brand).toBeUndefined();
    expect(read.model).toBeUndefined();
    expect(read.serialNumber).toBeUndefined();
  });

  it('handles empty input without throwing', () => {
    expect(parseDataPlate('', BRANDS).rawText).toBe('');
  });

  it('works with no brand list at all, finding the labelled fields', () => {
    expect(parseDataPlate('MODEL DCD791', []).model).toBe('DCD791');
  });
});

describe('brandsFrom', () => {
  function profile(brand: string, model: string): GearProfile {
    return {
      id: `${brand}-${model}`,
      brand,
      model,
      specs: [],
      source: 'CATALOGUE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }

  it('collects the distinct brands the catalogue knows', () => {
    const brands = brandsFrom([
      profile('DeWalt', 'A'),
      profile('DeWalt', 'B'),
      profile('Makita', 'C'),
    ]);
    expect(brands.sort()).toEqual(['DeWalt', 'Makita']);
  });

  it('treats differently-cased spellings as one brand', () => {
    expect(brandsFrom([profile('DeWalt', 'A'), profile('DEWALT', 'B')])).toHaveLength(1);
  });

  it('is empty for an empty catalogue', () => {
    expect(brandsFrom([])).toEqual([]);
  });
});
