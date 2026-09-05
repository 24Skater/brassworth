import type { ItemEvent, ItemEventType, ItemStatus } from '@/types';

/**
 * Deriving state from the item event log.
 *
 * Everything here is a pure function of a list of events. No storage, no React,
 * no dates read from the ambient clock unless passed in — which makes the rules
 * that matter most exhaustively testable.
 */

/** Events that end an item's life. Nothing after them changes its status. */
const TERMINAL: ReadonlySet<ItemEventType> = new Set<ItemEventType>(['SOLD', 'LOST']);

/** Events that record information without moving the item through its life. */
const NON_TRANSITIONAL: ReadonlySet<ItemEventType> = new Set<ItemEventType>([
  'MOVED',
  'VALUE_REASSESSED',
  'NOTE',
]);

const STATUS_AFTER: Partial<Record<ItemEventType, ItemStatus>> = {
  ACQUIRED: 'IN_POSSESSION',
  LOANED_OUT: 'LOANED',
  RETURNED: 'IN_POSSESSION',
  BROKE: 'BROKEN',
  SENT_FOR_REPAIR: 'IN_REPAIR',
  REPAIR_COMPLETED: 'IN_POSSESSION',
  SOLD: 'SOLD',
  LOST: 'LOST',
};

/**
 * Chronological order, oldest first.
 *
 * `occurredAt` is when the thing happened in the real world and is what orders
 * the timeline. Two events can share it — backdating a loan and its return to
 * the same day is ordinary — so `createdAt` breaks the tie by recording order.
 */
export function sortEvents(events: readonly ItemEvent[]): ItemEvent[] {
  return [...events].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * An item with no events is presumed owned — the log was introduced after items
 * already existed, so absence of history means "nothing has happened yet",
 * not "unknown".
 */
export function deriveStatus(events: readonly ItemEvent[]): ItemStatus {
  let status: ItemStatus = 'IN_POSSESSION';

  for (const event of sortEvents(events)) {
    if (NON_TRANSITIONAL.has(event.type)) continue;

    const next = STATUS_AFTER[event.type];
    if (next) status = next;

    // Sold and lost are final. Later events are still recorded and still shown
    // on the timeline, but they cannot bring an item back.
    if (TERMINAL.has(event.type)) break;
  }

  return status;
}

export interface Custody {
  /** Who currently holds it, when it is not with the owner. */
  holder?: string;
  /** When it left. */
  since?: string;
  /** When it is due back, if a date was given. */
  expectedBackOn?: string;
}

/** Who has the item right now, for the statuses where that question makes sense. */
export function deriveCustody(events: readonly ItemEvent[]): Custody {
  const status = deriveStatus(events);
  if (status !== 'LOANED' && status !== 'IN_REPAIR') return {};

  const wanted: ItemEventType = status === 'LOANED' ? 'LOANED_OUT' : 'SENT_FOR_REPAIR';
  const last = [...sortEvents(events)].reverse().find((e) => e.type === wanted);
  if (!last) return {};

  return {
    holder: last.counterparty,
    since: last.occurredAt,
    expectedBackOn: last.expectedBackOn,
  };
}

/** True when the item is out and its due date has passed. */
export function isOverdue(events: readonly ItemEvent[], now: Date = new Date()): boolean {
  const { expectedBackOn } = deriveCustody(events);
  if (!expectedBackOn) return false;

  const due = Date.parse(expectedBackOn);
  return Number.isFinite(due) && due < now.getTime();
}

export interface CostSummary {
  /** Everything spent on repairs over the item's life. */
  repairTotal: number;
  /** What it sold for, if it has been sold. */
  saleAmount?: number;
  /** Number of times it has been lent out. */
  loanCount: number;
}

export function summariseCosts(events: readonly ItemEvent[]): CostSummary {
  let repairTotal = 0;
  let saleAmount: number | undefined;
  let loanCount = 0;

  for (const event of events) {
    if (event.type === 'REPAIR_COMPLETED' && typeof event.amount === 'number') {
      repairTotal += event.amount;
    }
    if (event.type === 'SOLD' && typeof event.amount === 'number') {
      saleAmount = event.amount;
    }
    if (event.type === 'LOANED_OUT') {
      loanCount += 1;
    }
  }

  return { repairTotal, saleAmount, loanCount };
}

/**
 * Which events make sense to record next.
 *
 * Offering "mark returned" on an item that was never lent out is how users end
 * up with nonsense timelines, so the UI asks this rather than showing
 * everything.
 */
export function availableActions(events: readonly ItemEvent[]): ItemEventType[] {
  const status = deriveStatus(events);

  switch (status) {
    case 'IN_POSSESSION':
      return ['LOANED_OUT', 'BROKE', 'SENT_FOR_REPAIR', 'SOLD', 'LOST', 'MOVED', 'NOTE'];
    case 'LOANED':
      return ['RETURNED', 'BROKE', 'LOST', 'NOTE'];
    case 'IN_REPAIR':
      return ['REPAIR_COMPLETED', 'LOST', 'NOTE'];
    case 'BROKEN':
      return ['SENT_FOR_REPAIR', 'SOLD', 'LOST', 'NOTE'];
    case 'SOLD':
    case 'LOST':
      return ['NOTE'];
  }
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  IN_POSSESSION: 'In possession',
  LOANED: 'Loaned out',
  IN_REPAIR: 'In repair',
  BROKEN: 'Broken',
  SOLD: 'Sold',
  LOST: 'Lost',
};

export const EVENT_LABELS: Record<ItemEventType, string> = {
  ACQUIRED: 'Acquired',
  LOANED_OUT: 'Loaned out',
  RETURNED: 'Returned',
  BROKE: 'Broke',
  SENT_FOR_REPAIR: 'Sent for repair',
  REPAIR_COMPLETED: 'Repair completed',
  SOLD: 'Sold',
  LOST: 'Lost',
  MOVED: 'Moved',
  VALUE_REASSESSED: 'Value reassessed',
  NOTE: 'Note',
};

/** A one-line description of an event, for the timeline. */
export function describeEvent(event: ItemEvent): string {
  const label = EVENT_LABELS[event.type];

  switch (event.type) {
    case 'LOANED_OUT':
      return event.counterparty ? `Loaned to ${event.counterparty}` : label;
    case 'RETURNED':
      return event.counterparty ? `Returned by ${event.counterparty}` : label;
    case 'SENT_FOR_REPAIR':
      return event.counterparty ? `Sent to ${event.counterparty} for repair` : label;
    case 'SOLD':
      return event.counterparty ? `Sold to ${event.counterparty}` : label;
    default:
      return label;
  }
}

/**
 * Group a flat event list by item.
 *
 * Lists render many items at once; fetching each item's events separately would
 * be one query per row. Load the organisation's events once and index them here.
 */
export function groupByItem(events: readonly ItemEvent[]): Map<string, ItemEvent[]> {
  const byItem = new Map<string, ItemEvent[]>();

  for (const event of events) {
    const existing = byItem.get(event.itemId);
    if (existing) {
      existing.push(event);
    } else {
      byItem.set(event.itemId, [event]);
    }
  }

  return byItem;
}

/** Status for one item given a grouped index, defaulting to owned. */
export function statusFor(byItem: Map<string, ItemEvent[]>, itemId: string): ItemStatus {
  return deriveStatus(byItem.get(itemId) ?? []);
}

/** Items that are out and past their due date, most overdue first. */
export function overdueItems(
  byItem: Map<string, ItemEvent[]>,
  now: Date = new Date()
): Array<{ itemId: string; holder?: string; expectedBackOn: string }> {
  const overdue: Array<{ itemId: string; holder?: string; expectedBackOn: string }> = [];

  for (const [itemId, events] of byItem) {
    if (!isOverdue(events, now)) continue;

    const { holder, expectedBackOn } = deriveCustody(events);
    if (expectedBackOn) overdue.push({ itemId, holder, expectedBackOn });
  }

  return overdue.sort((a, b) => (a.expectedBackOn < b.expectedBackOn ? -1 : 1));
}
