import type { DepreciationMethod, Item, ItemEvent } from '@/types';
import { sortEvents, summariseCosts } from '@/lib/lifecycle';

/**
 * What an item is worth now, how long you have owned it, and what it has cost.
 *
 * Pure functions of an item, its event log and a clock passed in. No storage,
 * no React, no ambient `new Date()` in the maths — which is what makes the
 * money arithmetic exhaustively testable.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 365.2425 / 12;

export interface Acquisition {
  /** When it was acquired, if known. */
  at?: string;
  /** What was paid, if known. */
  price?: number;
}

/**
 * Where an item came from.
 *
 * The `ACQUIRED` event wins when there is one, because the log is the source of
 * truth for history. Most items predate the log, so the fields on the item
 * itself are the fallback rather than the exception.
 */
export function resolveAcquisition(item: Item, events: readonly ItemEvent[] = []): Acquisition {
  const acquired = sortEvents(events).find((e) => e.type === 'ACQUIRED');

  return {
    at: acquired?.occurredAt ?? item.purchaseDate,
    price: acquired?.amount ?? item.purchasePrice,
  };
}

/** Whole and fractional months between two instants. Negative dates clamp to 0. */
export function monthsBetween(from: string | undefined, now: Date = new Date()): number {
  if (!from) return 0;

  const start = Date.parse(from);
  if (!Number.isFinite(start)) return 0;

  const elapsedDays = (now.getTime() - start) / MS_PER_DAY;
  // A purchase date in the future means zero ownership, not negative value.
  return Math.max(0, elapsedDays / DAYS_PER_MONTH);
}

/**
 * Whole calendar months between two instants.
 *
 * Separate from `monthsBetween`, which averages month length for continuous
 * depreciation maths. Averaging makes exactly one year come out as 11.99
 * months, so an anniversary would display as "11 months" — calendar arithmetic
 * is what a person expects when reading how long they have owned something.
 */
export function calendarMonthsBetween(from: string | undefined, now: Date = new Date()): number {
  if (!from) return 0;

  const start = new Date(from);
  if (!Number.isFinite(start.getTime())) return 0;

  let months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth());

  // Not yet reached the day-of-month, so the final month is incomplete.
  if (now.getUTCDate() < start.getUTCDate()) months -= 1;

  return Math.max(0, months);
}

/** Human-facing age, e.g. "2 years, 3 months". */
export function describeAge(from: string | undefined, now: Date = new Date()): string | undefined {
  if (!from || !Number.isFinite(Date.parse(from))) return undefined;

  const months = calendarMonthsBetween(from, now);
  const years = Math.floor(months / 12);
  const remainder = months % 12;

  if (months < 1) return 'Less than a month';

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (remainder > 0) parts.push(`${remainder} month${remainder === 1 ? '' : 's'}`);

  return parts.join(', ');
}

/**
 * Straight-line depreciation: the item loses an equal share of its depreciable
 * value each month until it reaches salvage, then stops.
 */
export function straightLineValue(
  price: number,
  elapsedMonths: number,
  usefulLifeMonths: number,
  salvageValue = 0
): number {
  const salvage = Math.min(Math.max(salvageValue, 0), price);
  if (usefulLifeMonths <= 0) return salvage;

  const depreciable = price - salvage;
  const fractionUsed = Math.min(1, Math.max(0, elapsedMonths) / usefulLifeMonths);

  return salvage + depreciable * (1 - fractionUsed);
}

/**
 * Declining balance: the item loses a fixed percentage of its *remaining* value
 * each year. Closer to how tools and electronics actually hold value — most of
 * the loss happens early.
 */
export function decliningBalanceValue(
  price: number,
  elapsedMonths: number,
  ratePerYear: number,
  salvageValue = 0
): number {
  const salvage = Math.min(Math.max(salvageValue, 0), price);
  const rate = Math.min(Math.max(ratePerYear, 0), 1);

  if (rate === 0) return price;
  if (rate === 1) return salvage;

  const years = Math.max(0, elapsedMonths) / 12;
  const remaining = price * Math.pow(1 - rate, years);

  return Math.max(salvage, remaining);
}

/**
 * The item's estimated value today.
 *
 * Returns undefined rather than zero when there is nothing to go on — an
 * unknown value and a worthless item are different claims, and showing "$0.00"
 * for the former is a lie.
 */
export function currentValue(
  item: Item,
  events: readonly ItemEvent[] = [],
  now: Date = new Date()
): number | undefined {
  const method: DepreciationMethod = item.depreciationMethod ?? 'NONE';

  if (method === 'MANUAL') {
    return item.currentEstimatedValue;
  }

  const { at, price } = resolveAcquisition(item, events);
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    return item.currentEstimatedValue;
  }

  if (method === 'NONE') {
    return item.currentEstimatedValue ?? price;
  }

  const elapsedMonths = monthsBetween(at, now);

  if (method === 'STRAIGHT_LINE') {
    const life = item.usefulLifeMonths;
    if (!life || life <= 0) return price;
    return straightLineValue(price, elapsedMonths, life, item.salvageValue);
  }

  const rate = item.declineRatePerYear;
  if (rate === undefined || rate <= 0) return price;
  return decliningBalanceValue(price, elapsedMonths, rate, item.salvageValue);
}

export interface OwnershipCost {
  /** What it cost to buy. */
  purchase: number;
  /** Everything spent on repairs since. */
  repairs: number;
  /** Purchase plus repairs. */
  total: number;
  /** Total less anything recovered by selling it. */
  net: number;
  /** Net cost per month of ownership, once there is a month to divide by. */
  perMonth?: number;
}

/**
 * What owning this thing has actually cost.
 *
 * Purchase plus every repair, less whatever selling it recovered. Divided by
 * time owned, this is the number that tells you whether the expensive tool was
 * the cheap one.
 */
export function costOfOwnership(
  item: Item,
  events: readonly ItemEvent[] = [],
  now: Date = new Date()
): OwnershipCost {
  const { at, price } = resolveAcquisition(item, events);
  const { repairTotal, saleAmount } = summariseCosts(events);

  const purchase = typeof price === 'number' && Number.isFinite(price) ? price : 0;
  const total = purchase + repairTotal;
  const net = total - (saleAmount ?? 0);

  const months = monthsBetween(at, now);
  const perMonth = months >= 1 ? net / months : undefined;

  return { purchase, repairs: repairTotal, total, net, perMonth };
}

/** Sum of estimated current value across many items. */
export function totalCurrentValue(
  items: readonly Item[],
  eventsByItem: Map<string, ItemEvent[]>,
  now: Date = new Date()
): number {
  return items.reduce(
    (sum, item) => sum + (currentValue(item, eventsByItem.get(item.id), now) ?? 0),
    0
  );
}

export const DEPRECIATION_LABELS: Record<DepreciationMethod, string> = {
  NONE: 'No depreciation',
  STRAIGHT_LINE: 'Straight line',
  DECLINING_BALANCE: 'Declining balance',
  MANUAL: 'Set manually',
};
