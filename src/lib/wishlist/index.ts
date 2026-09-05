import type {
  Item,
  ItemEvent,
  SavingsContribution,
  WishlistEntry,
  WishlistPriority,
} from '@/types';

/**
 * The pre-purchase half of the product.
 *
 * Pure functions over wishlist entries and their savings log. Nothing in here
 * reads storage or the clock unless it is passed in — the same shape as the
 * lifecycle and valuation rules, and for the same reason: money arithmetic
 * deserves tests that cannot drift.
 */

/** What has been put aside, net of withdrawals. Never below zero. */
export function savedTotal(contributions: readonly SavingsContribution[]): number {
  const total = contributions.reduce(
    (sum, c) => sum + (Number.isFinite(c.amount) ? c.amount : 0),
    0
  );
  return Math.max(0, total);
}

export interface SavingsProgress {
  saved: number;
  target?: number;
  /** Still to find. Undefined when no target has been set. */
  remaining?: number;
  /** 0–100, undefined when no target has been set. Capped at 100. */
  percent?: number;
  funded: boolean;
}

export function progressFor(
  entry: WishlistEntry,
  contributions: readonly SavingsContribution[]
): SavingsProgress {
  const saved = savedTotal(contributions);
  const target = entry.targetPrice;

  if (typeof target !== 'number' || !Number.isFinite(target) || target <= 0) {
    // With no target there is nothing to be a fraction of. Saying "100% of an
    // unknown" would be worse than saying nothing.
    return { saved, funded: false };
  }

  const remaining = Math.max(0, target - saved);

  return {
    saved,
    target,
    remaining,
    percent: Math.min(100, (saved / target) * 100),
    funded: saved >= target,
  };
}

/** Contributions belonging to one entry. */
export function contributionsFor(
  contributions: readonly SavingsContribution[],
  entryId: string
): SavingsContribution[] {
  return contributions.filter((c) => c.wishlistEntryId === entryId);
}

/** Index the savings log by entry, so a list renders in one pass. */
export function groupContributions(
  contributions: readonly SavingsContribution[]
): Map<string, SavingsContribution[]> {
  const byEntry = new Map<string, SavingsContribution[]>();

  for (const contribution of contributions) {
    const existing = byEntry.get(contribution.wishlistEntryId);
    if (existing) existing.push(contribution);
    else byEntry.set(contribution.wishlistEntryId, [contribution]);
  }

  return byEntry;
}

const PRIORITY_ORDER: Record<WishlistPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/**
 * Wanting order.
 *
 * Priority first, then how close it is to being paid for — a high-priority item
 * you have almost saved for should sit above one you have not started. Entries
 * already bought sink to the bottom rather than disappearing, so the list keeps
 * a record of what the saving was for.
 */
export function sortEntries(
  entries: readonly WishlistEntry[],
  byEntry: Map<string, SavingsContribution[]>
): WishlistEntry[] {
  return [...entries].sort((a, b) => {
    if (Boolean(a.purchasedItemId) !== Boolean(b.purchasedItemId)) {
      return a.purchasedItemId ? 1 : -1;
    }

    const priority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priority !== 0) return priority;

    const aProgress = progressFor(a, byEntry.get(a.id) ?? []).percent ?? 0;
    const bProgress = progressFor(b, byEntry.get(b.id) ?? []).percent ?? 0;
    if (aProgress !== bProgress) return bProgress - aProgress;

    return a.name.localeCompare(b.name);
  });
}

/** Entries fully saved for and not yet bought. */
export function readyToBuy(
  entries: readonly WishlistEntry[],
  byEntry: Map<string, SavingsContribution[]>
): WishlistEntry[] {
  return entries.filter(
    (entry) => !entry.purchasedItemId && progressFor(entry, byEntry.get(entry.id) ?? []).funded
  );
}

export interface WishlistTotals {
  count: number;
  /** Entries still to buy. */
  outstanding: number;
  targetTotal: number;
  savedTotal: number;
  remainingTotal: number;
}

export function wishlistTotals(
  entries: readonly WishlistEntry[],
  byEntry: Map<string, SavingsContribution[]>
): WishlistTotals {
  let targetTotal = 0;
  let saved = 0;
  let remaining = 0;
  let outstanding = 0;

  for (const entry of entries) {
    // A bought entry's saving has already been spent; counting it would
    // overstate what is set aside.
    if (entry.purchasedItemId) continue;

    outstanding += 1;
    const progress = progressFor(entry, byEntry.get(entry.id) ?? []);
    targetTotal += progress.target ?? 0;
    saved += progress.saved;
    remaining += progress.remaining ?? 0;
  }

  return {
    count: entries.length,
    outstanding,
    targetTotal,
    savedTotal: saved,
    remainingTotal: remaining,
  };
}

export interface Purchase {
  item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>;
  event: Omit<ItemEvent, 'id' | 'itemId' | 'createdAt'>;
}

/**
 * Turn a wishlist entry into something you own.
 *
 * Carries the name, brand, model and category across, and records what was
 * actually paid as an `ACQUIRED` event rather than only a field — so the item
 * starts life with the same history every other item has, and its age of
 * ownership dates from the purchase rather than from when the row was written.
 */
export function buildPurchase(
  entry: WishlistEntry,
  pricePaid: number | undefined,
  purchasedAt: string
): Purchase {
  return {
    item: {
      organizationId: entry.organizationId,
      name: entry.name,
      brand: entry.brand,
      model: entry.model,
      categoryId: entry.categoryId,
      notes: entry.notes,
      purchaseDate: purchasedAt,
      purchasePrice: pricePaid,
      condition: 'NEW',
      quantity: 1,
      isArchived: false,
      tags: [],
    },
    event: {
      organizationId: entry.organizationId,
      type: 'ACQUIRED',
      occurredAt: purchasedAt,
      amount: pricePaid,
      note: `Bought from the wishlist${entry.url ? ` (${entry.url})` : ''}`,
    },
  };
}

export const PRIORITY_LABELS: Record<WishlistPriority, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};
