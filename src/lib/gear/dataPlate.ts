import type { GearProfile } from '@/types';
import { normaliseBrand } from './index';

/**
 * Reading a data plate.
 *
 * The rating plate riveted to a tool carries the three things worth typing and
 * hardest to type: make, model and serial number. Serial numbers in particular
 * are long, meaningless, and printed small — exactly the input people get wrong
 * and then never notice, because nothing checks it until an insurance claim.
 *
 * OCR itself is already in the app for receipts (Tesseract). This file is only
 * the parser: text in, three fields out, pure and testable without a browser.
 */

export interface DataPlateReading {
  brand?: string;
  model?: string;
  serialNumber?: string;
  /** Always present. A bad read is inspectable rather than mysterious. */
  rawText: string;
}

/**
 * Label spellings, longest first.
 *
 * Order matters: `serial number` has to be tried before `serial`, or the
 * shorter label matches and leaves `number` sitting in the value.
 *
 * `cat no` is here because catalogue number is what several makes print where
 * everyone else prints a model, and to a user they are the same field — it is
 * the string they will search for.
 */
const MODEL_LABELS = [
  'model number',
  'model no',
  'model',
  'catalogue no',
  'catalog no',
  'cat no',
  'cat',
  'mod',
];

const SERIAL_LABELS = ['serial number', 'serial no', 'serial', 'ser no', 's/n', 'sn'];

/** Every label, used to know where one field's value ends and the next begins. */
const ALL_LABELS = [...MODEL_LABELS, ...SERIAL_LABELS, 'type', 'made in'];

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A label as it might actually be printed.
 *
 * Plates punctuate labels however they like — `MODEL NO`, `MODEL NO.` and
 * `CAT. NO.` are one label with three spellings, and OCR adds its own noise on
 * top. Matching the words with a tolerant gap between them handles all of it
 * without listing every variant by hand.
 */
function labelPattern(label: string): string {
  return label.split(/\s+/).map(escapeForRegex).join('[\\s.:#=-]*');
}

/**
 * The value following a label.
 *
 * A value runs until the next label starts, which is what makes
 * `MODEL DCD791 S/N 2019A0012` read as two fields on one line rather than one
 * field with the rest of the line glued to it.
 */
function valueAfterLabel(text: string, labels: readonly string[]): string | undefined {
  const stop = ALL_LABELS.map(labelPattern).join('|');

  for (const label of labels) {
    // Word boundaries on both sides: `SN` must not match inside `DESNORKEL`.
    const pattern = new RegExp(
      `(?:^|[^a-z0-9])${labelPattern(label)}(?![a-z0-9])\\s*[:.#=-]*\\s*` +
        `([a-z0-9][a-z0-9/-]*(?:\\s+[a-z0-9][a-z0-9/-]*)*?)` +
        `(?=\\s*(?:$|[\\n\\r]|(?:[^a-z0-9]|^)(?:${stop})(?![a-z0-9])))`,
      'i'
    );

    const match = pattern.exec(text);
    const value = match?.[1]?.trim().replace(/[.,;:]+$/, '');
    if (value) return value;
  }

  return undefined;
}

/**
 * The brand, matched against the catalogue's own list.
 *
 * Only known brands are returned. The tempting alternative — treat the first
 * prominent line as the maker — reliably yields `MADE IN CHINA`, `WARNING` or
 * `INDUSTRIAL TOOL CO.`, and a confidently wrong brand is worse than a blank
 * one the user fills in. It is the same call the roadmap makes about
 * MARKET_COMPARABLE: a number that looks authoritative and is invented.
 *
 * The list is passed in rather than hardcoded, because brand is data. Adding
 * Festool is adding a catalogue row, not editing this file.
 */
function brandFrom(text: string, knownBrands: readonly string[]): string | undefined {
  const folded = normaliseBrand(text);
  if (!folded) return undefined;

  // Longest first, so `Milwaukee` wins over a shorter name contained in it.
  const candidates = [...knownBrands].sort(
    (a, b) => normaliseBrand(b).length - normaliseBrand(a).length
  );

  for (const brand of candidates) {
    const key = normaliseBrand(brand);
    if (key && folded.includes(key)) return brand;
  }

  return undefined;
}

/** Parse the text of a rating plate into the fields worth keeping. */
export function parseDataPlate(text: string, knownBrands: readonly string[]): DataPlateReading {
  const reading: DataPlateReading = { rawText: text };

  const brand = brandFrom(text, knownBrands);
  if (brand) reading.brand = brand;

  const model = valueAfterLabel(text, MODEL_LABELS);
  if (model) reading.model = model;

  const serialNumber = valueAfterLabel(text, SERIAL_LABELS);
  if (serialNumber) reading.serialNumber = serialNumber;

  return reading;
}

/**
 * The distinct brands a catalogue knows, spelled as the catalogue spells them.
 *
 * Feeds the plate reader, so what it can recognise grows with the catalogue and
 * with whatever the user has added themselves.
 */
export function brandsFrom(profiles: readonly GearProfile[]): string[] {
  const byKey = new Map<string, string>();

  for (const profile of profiles) {
    const key = normaliseBrand(profile.brand);
    if (key && !byKey.has(key)) byKey.set(key, profile.brand);
  }

  return [...byKey.values()];
}
