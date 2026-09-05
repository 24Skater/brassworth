import type { PriceObservation, WishlistEntry } from '@/types';

/**
 * Reading a price history.
 *
 * Pure functions over observations. The series is the point: a single latest
 * price cannot answer "is this actually a good deal or just what it always
 * costs", which is the question a price alert is really being asked.
 */

/** Oldest first. Ties break on recording order so the result is stable. */
export function sortObservations(observations: readonly PriceObservation[]): PriceObservation[] {
  return [...observations].sort((a, b) => {
    if (a.observedAt !== b.observedAt) return a.observedAt < b.observedAt ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function groupObservations(
  observations: readonly PriceObservation[]
): Map<string, PriceObservation[]> {
  const byEntry = new Map<string, PriceObservation[]>();

  for (const observation of observations) {
    const existing = byEntry.get(observation.wishlistEntryId);
    if (existing) existing.push(observation);
    else byEntry.set(observation.wishlistEntryId, [observation]);
  }

  return byEntry;
}

export interface PriceStats {
  latest?: PriceObservation;
  lowest?: PriceObservation;
  highest?: PriceObservation;
  count: number;
}

export function priceStats(observations: readonly PriceObservation[]): PriceStats {
  const usable = observations.filter((o) => Number.isFinite(o.amount) && o.amount >= 0);
  if (usable.length === 0) return { count: 0 };

  const ordered = sortObservations(usable);
  const first = ordered[0] as PriceObservation;

  let lowest = first;
  let highest = first;

  for (const observation of ordered) {
    if (observation.amount < lowest.amount) lowest = observation;
    if (observation.amount > highest.amount) highest = observation;
  }

  return { latest: ordered[ordered.length - 1], lowest, highest, count: ordered.length };
}

export type PriceTrend = 'DOWN' | 'UP' | 'FLAT';

/** Direction of the last move. Undefined until there are two observations. */
export function trend(observations: readonly PriceObservation[]): PriceTrend | undefined {
  const ordered = sortObservations(observations.filter((o) => Number.isFinite(o.amount)));
  if (ordered.length < 2) return undefined;

  const latest = ordered[ordered.length - 1] as PriceObservation;
  const previous = ordered[ordered.length - 2] as PriceObservation;

  if (latest.amount < previous.amount) return 'DOWN';
  if (latest.amount > previous.amount) return 'UP';
  return 'FLAT';
}

export interface PriceAlert {
  belowTarget: boolean;
  amount: number;
  target: number;
  saving: number;
  /** True when this is also the cheapest it has ever been seen. */
  isLowestEver: boolean;
  observedAt: string;
}

/**
 * Whether the latest price is worth telling somebody about.
 *
 * Only fires against an explicit target. Alerting on "it went down a bit" would
 * train people to ignore it, which is worse than not alerting at all. An entry
 * already bought never alerts.
 */
export function alertFor(
  entry: WishlistEntry,
  observations: readonly PriceObservation[]
): PriceAlert | null {
  const target = entry.targetPrice;
  if (typeof target !== 'number' || !Number.isFinite(target) || target <= 0) return null;
  if (entry.purchasedItemId) return null;

  const { latest, lowest } = priceStats(observations);
  if (!latest || latest.amount > target) return null;

  return {
    belowTarget: true,
    amount: latest.amount,
    target,
    saving: target - latest.amount,
    isLowestEver: lowest ? latest.amount <= lowest.amount : true,
    observedAt: latest.observedAt,
  };
}

/** Every entry currently below its target, biggest saving first. */
export function alertsFor(
  entries: readonly WishlistEntry[],
  byEntry: Map<string, PriceObservation[]>
): Array<{ entry: WishlistEntry; alert: PriceAlert }> {
  const alerts: Array<{ entry: WishlistEntry; alert: PriceAlert }> = [];

  for (const entry of entries) {
    const alert = alertFor(entry, byEntry.get(entry.id) ?? []);
    if (alert) alerts.push({ entry, alert });
  }

  return alerts.sort((a, b) => b.alert.saving - a.alert.saving);
}
