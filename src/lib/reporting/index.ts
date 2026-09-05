import type { Category, Item, ItemEvent, Location } from '@/types';
import { costOfOwnership, currentValue, resolveAcquisition } from '@/lib/valuation';
import { deriveStatus } from '@/lib/lifecycle';

/**
 * Aggregating a collection into the numbers worth looking at.
 *
 * Pure functions over items, their events and a clock. The same breakdown
 * machinery serves category, location and brand, because those differ only in
 * how a row is keyed — brand in particular is a field, not an architecture,
 * which is why tools, IT gear and AV gear report identically.
 */

export interface Breakdown {
  /** The group label, already resolved for display. */
  key: string;
  count: number;
  /** Total paid across the group. */
  purchaseTotal: number;
  /** Total estimated worth today. */
  currentTotal: number;
}

/** Items whose value should count toward a total. Sold and lost ones should not. */
export function isHeld(item: Item, events: readonly ItemEvent[] = []): boolean {
  if (item.isArchived) return false;
  const status = deriveStatus(events);
  return status !== 'SOLD' && status !== 'LOST';
}

function summarise(
  items: readonly Item[],
  eventsByItem: Map<string, ItemEvent[]>,
  keyOf: (item: Item) => string,
  now: Date
): Breakdown[] {
  const groups = new Map<string, Breakdown>();

  for (const item of items) {
    const events = eventsByItem.get(item.id) ?? [];
    const key = keyOf(item);

    const existing = groups.get(key) ?? {
      key,
      count: 0,
      purchaseTotal: 0,
      currentTotal: 0,
    };

    existing.count += 1;
    existing.purchaseTotal += resolveAcquisition(item, events).price ?? 0;
    existing.currentTotal += currentValue(item, events, now) ?? 0;

    groups.set(key, existing);
  }

  // Most valuable first — the point of a breakdown is what to look at.
  return [...groups.values()].sort((a, b) => b.currentTotal - a.currentTotal || b.count - a.count);
}

/** Held items only, so sold gear stops inflating the totals. */
export function heldItems(items: readonly Item[], eventsByItem: Map<string, ItemEvent[]>): Item[] {
  return items.filter((item) => isHeld(item, eventsByItem.get(item.id)));
}

export function byBrand(
  items: readonly Item[],
  eventsByItem: Map<string, ItemEvent[]>,
  now: Date = new Date()
): Breakdown[] {
  return summarise(items, eventsByItem, (item) => item.brand?.trim() || 'No brand', now);
}

export function byCategory(
  items: readonly Item[],
  eventsByItem: Map<string, ItemEvent[]>,
  categories: readonly Category[],
  now: Date = new Date()
): Breakdown[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return summarise(
    items,
    eventsByItem,
    (item) => (item.categoryId && names.get(item.categoryId)) || 'Uncategorised',
    now
  );
}

export function byLocation(
  items: readonly Item[],
  eventsByItem: Map<string, ItemEvent[]>,
  locations: readonly Location[],
  now: Date = new Date()
): Breakdown[] {
  const names = new Map(locations.map((l) => [l.id, l.name]));
  return summarise(
    items,
    eventsByItem,
    (item) => (item.locationId && names.get(item.locationId)) || 'No location',
    now
  );
}

export interface PortfolioTotals {
  count: number;
  purchaseTotal: number;
  currentTotal: number;
  repairTotal: number;
  /** Realised from anything sold. */
  saleTotal: number;
  /** currentTotal minus purchaseTotal — negative means the collection has depreciated. */
  changeInValue: number;
}

export function portfolioTotals(
  items: readonly Item[],
  eventsByItem: Map<string, ItemEvent[]>,
  now: Date = new Date()
): PortfolioTotals {
  let purchaseTotal = 0;
  let currentTotal = 0;
  let repairTotal = 0;
  let saleTotal = 0;
  let count = 0;

  for (const item of items) {
    const events = eventsByItem.get(item.id) ?? [];
    const cost = costOfOwnership(item, events, now);

    repairTotal += cost.repairs;

    const status = deriveStatus(events);
    if (status === 'SOLD') {
      // A sold item contributes what it fetched, not a current value it no
      // longer has.
      saleTotal += cost.total - cost.net;
      continue;
    }
    if (status === 'LOST' || item.isArchived) continue;

    count += 1;
    purchaseTotal += resolveAcquisition(item, events).price ?? 0;
    currentTotal += currentValue(item, events, now) ?? 0;
  }

  return {
    count,
    purchaseTotal,
    currentTotal,
    repairTotal,
    saleTotal,
    changeInValue: currentTotal - purchaseTotal,
  };
}

export interface ReportRow {
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  category: string;
  location: string;
  condition: string;
  status: string;
  quantity: number;
  purchaseDate: string;
  purchasePrice: string;
  currentValue: string;
  repairSpend: string;
}

/**
 * One flat row per item, for an insurance claim or a tax schedule.
 *
 * Deliberately verbose: a claims adjuster wants serial numbers and dates, not a
 * summary. Numbers are emitted as fixed-decimal strings so a spreadsheet cannot
 * quietly reformat them.
 */
export function buildReport(
  items: readonly Item[],
  eventsByItem: Map<string, ItemEvent[]>,
  categories: readonly Category[],
  locations: readonly Location[],
  now: Date = new Date()
): ReportRow[] {
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const locationNames = new Map(locations.map((l) => [l.id, l.name]));

  return items.map((item) => {
    const events = eventsByItem.get(item.id) ?? [];
    const acquisition = resolveAcquisition(item, events);
    const cost = costOfOwnership(item, events, now);
    const value = currentValue(item, events, now);

    return {
      name: item.name,
      brand: item.brand ?? '',
      model: item.model ?? '',
      serialNumber: item.serialNumber ?? '',
      category: (item.categoryId && categoryNames.get(item.categoryId)) || '',
      location: (item.locationId && locationNames.get(item.locationId)) || '',
      condition: item.condition,
      status: deriveStatus(events),
      quantity: item.quantity,
      purchaseDate: acquisition.at ? acquisition.at.split('T')[0]! : '',
      purchasePrice: acquisition.price !== undefined ? acquisition.price.toFixed(2) : '',
      currentValue: value !== undefined ? value.toFixed(2) : '',
      repairSpend: cost.repairs > 0 ? cost.repairs.toFixed(2) : '',
    };
  });
}

const REPORT_HEADERS: Array<[keyof ReportRow, string]> = [
  ['name', 'Item'],
  ['brand', 'Brand'],
  ['model', 'Model'],
  ['serialNumber', 'Serial number'],
  ['category', 'Category'],
  ['location', 'Location'],
  ['condition', 'Condition'],
  ['status', 'Status'],
  ['quantity', 'Quantity'],
  ['purchaseDate', 'Purchase date'],
  ['purchasePrice', 'Purchase price'],
  ['currentValue', 'Current value'],
  ['repairSpend', 'Repair spend'],
];

/** RFC 4180 escaping: quote anything containing a comma, quote or newline. */
function escapeCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function reportToCsv(rows: readonly ReportRow[]): string {
  const header = REPORT_HEADERS.map(([, label]) => escapeCell(label)).join(',');
  const body = rows.map((row) => REPORT_HEADERS.map(([key]) => escapeCell(row[key])).join(','));

  return [header, ...body].join('\r\n');
}

/** e.g. brassworth-report-2026-09-05.csv */
export function reportFileName(date = new Date()): string {
  return `brassworth-report-${date.toISOString().split('T')[0]}.csv`;
}
