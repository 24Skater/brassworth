import { describe, it, expect } from 'vitest';
import {
  availableActions,
  deriveCustody,
  deriveStatus,
  describeEvent,
  isOverdue,
  groupByItem,
  overdueItems,
  sortEvents,
  statusFor,
  summariseCosts,
} from '@/lib/lifecycle';
import type { ItemEvent, ItemEventType } from '@/types';

let seq = 0;

function event(type: ItemEventType, occurredAt: string, extra: Partial<ItemEvent> = {}): ItemEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    itemId: 'item-1',
    organizationId: 'org-1',
    type,
    occurredAt,
    createdAt: `2020-01-01T00:00:${String(seq).padStart(2, '0')}.000Z`,
    ...extra,
  };
}

describe('sortEvents', () => {
  it('orders by when things happened, not when they were recorded', () => {
    const late = event('NOTE', '2024-06-01T00:00:00.000Z');
    const early = event('NOTE', '2024-01-01T00:00:00.000Z');

    expect(sortEvents([late, early]).map((e) => e.occurredAt)).toEqual([
      '2024-01-01T00:00:00.000Z',
      '2024-06-01T00:00:00.000Z',
    ]);
  });

  it('breaks ties on the same day by recording order', () => {
    const sameDay = '2024-03-01T00:00:00.000Z';
    const loaned = event('LOANED_OUT', sameDay);
    const returned = event('RETURNED', sameDay);

    // Both backdated to one day; createdAt decides which came first.
    expect(sortEvents([returned, loaned]).map((e) => e.type)).toEqual(['LOANED_OUT', 'RETURNED']);
  });

  it('does not mutate its input', () => {
    const events = [
      event('NOTE', '2024-06-01T00:00:00.000Z'),
      event('NOTE', '2024-01-01T00:00:00.000Z'),
    ];
    const before = events.map((e) => e.id);

    sortEvents(events);

    expect(events.map((e) => e.id)).toEqual(before);
  });
});

describe('deriveStatus', () => {
  it('presumes an item with no history is owned', () => {
    expect(deriveStatus([])).toBe('IN_POSSESSION');
  });

  it('follows a loan out and back', () => {
    const loaned = [event('LOANED_OUT', '2024-01-01T00:00:00.000Z')];
    expect(deriveStatus(loaned)).toBe('LOANED');

    const returned = [...loaned, event('RETURNED', '2024-02-01T00:00:00.000Z')];
    expect(deriveStatus(returned)).toBe('IN_POSSESSION');
  });

  it('follows the repair cycle', () => {
    const events = [
      event('BROKE', '2024-01-01T00:00:00.000Z'),
      event('SENT_FOR_REPAIR', '2024-01-05T00:00:00.000Z'),
    ];
    expect(deriveStatus(events)).toBe('IN_REPAIR');

    expect(deriveStatus([...events, event('REPAIR_COMPLETED', '2024-02-01T00:00:00.000Z')])).toBe(
      'IN_POSSESSION'
    );
  });

  it('uses the real-world order, not the order events were added', () => {
    // Return recorded first, but dated before the loan.
    const events = [
      event('RETURNED', '2024-02-01T00:00:00.000Z'),
      event('LOANED_OUT', '2024-03-01T00:00:00.000Z'),
    ];

    expect(deriveStatus(events)).toBe('LOANED');
  });

  it('treats SOLD as final', () => {
    const events = [
      event('SOLD', '2024-01-01T00:00:00.000Z', { amount: 180 }),
      event('LOANED_OUT', '2024-06-01T00:00:00.000Z'),
    ];

    expect(deriveStatus(events)).toBe('SOLD');
  });

  it('treats LOST as final', () => {
    const events = [
      event('LOST', '2024-01-01T00:00:00.000Z'),
      event('RETURNED', '2024-06-01T00:00:00.000Z'),
    ];

    expect(deriveStatus(events)).toBe('LOST');
  });

  it('ignores events that only record information', () => {
    const events = [
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z'),
      event('MOVED', '2024-02-01T00:00:00.000Z'),
      event('NOTE', '2024-03-01T00:00:00.000Z'),
      event('VALUE_REASSESSED', '2024-04-01T00:00:00.000Z', { amount: 90 }),
    ];

    expect(deriveStatus(events)).toBe('LOANED');
  });

  it('handles a full life from acquisition to sale', () => {
    const events = [
      event('ACQUIRED', '2020-01-01T00:00:00.000Z', { amount: 249 }),
      event('LOANED_OUT', '2021-03-01T00:00:00.000Z', { counterparty: 'Dave' }),
      event('RETURNED', '2021-04-01T00:00:00.000Z'),
      event('BROKE', '2022-01-01T00:00:00.000Z'),
      event('SENT_FOR_REPAIR', '2022-01-10T00:00:00.000Z'),
      event('REPAIR_COMPLETED', '2022-02-01T00:00:00.000Z', { amount: 40 }),
      event('SOLD', '2024-03-01T00:00:00.000Z', { amount: 180 }),
    ];

    expect(deriveStatus(events)).toBe('SOLD');
  });
});

describe('deriveCustody', () => {
  it('is empty when the item is to hand', () => {
    expect(deriveCustody([])).toEqual({});
  });

  it('reports who has a loaned item and when it is due', () => {
    const events = [
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', {
        counterparty: 'Dave',
        expectedBackOn: '2024-02-01T00:00:00.000Z',
      }),
    ];

    expect(deriveCustody(events)).toEqual({
      holder: 'Dave',
      since: '2024-01-01T00:00:00.000Z',
      expectedBackOn: '2024-02-01T00:00:00.000Z',
    });
  });

  it('reports the repairer while an item is away', () => {
    const events = [
      event('SENT_FOR_REPAIR', '2024-01-01T00:00:00.000Z', { counterparty: 'Milwaukee Service' }),
    ];

    expect(deriveCustody(events).holder).toBe('Milwaukee Service');
  });

  it('uses the most recent loan when an item has been lent repeatedly', () => {
    const events = [
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', { counterparty: 'Dave' }),
      event('RETURNED', '2024-02-01T00:00:00.000Z'),
      event('LOANED_OUT', '2024-03-01T00:00:00.000Z', { counterparty: 'Sam' }),
    ];

    expect(deriveCustody(events).holder).toBe('Sam');
  });

  it('clears once the item comes back', () => {
    const events = [
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', { counterparty: 'Dave' }),
      event('RETURNED', '2024-02-01T00:00:00.000Z'),
    ];

    expect(deriveCustody(events)).toEqual({});
  });
});

describe('isOverdue', () => {
  const now = new Date('2024-06-01T00:00:00.000Z');

  it('is false when nothing is out', () => {
    expect(isOverdue([], now)).toBe(false);
  });

  it('is false when no return date was given', () => {
    const events = [event('LOANED_OUT', '2024-01-01T00:00:00.000Z', { counterparty: 'Dave' })];
    expect(isOverdue(events, now)).toBe(false);
  });

  it('is true once the due date has passed', () => {
    const events = [
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', {
        expectedBackOn: '2024-02-01T00:00:00.000Z',
      }),
    ];

    expect(isOverdue(events, now)).toBe(true);
  });

  it('is false while the due date is still ahead', () => {
    const events = [
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', {
        expectedBackOn: '2024-12-01T00:00:00.000Z',
      }),
    ];

    expect(isOverdue(events, now)).toBe(false);
  });

  it('is false once a late item has been returned', () => {
    const events = [
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', {
        expectedBackOn: '2024-02-01T00:00:00.000Z',
      }),
      event('RETURNED', '2024-03-01T00:00:00.000Z'),
    ];

    expect(isOverdue(events, now)).toBe(false);
  });
});

describe('summariseCosts', () => {
  it('is zeroed for an item with no history', () => {
    expect(summariseCosts([])).toEqual({ repairTotal: 0, saleAmount: undefined, loanCount: 0 });
  });

  it('totals repair spend across several repairs', () => {
    const events = [
      event('REPAIR_COMPLETED', '2024-01-01T00:00:00.000Z', { amount: 40 }),
      event('REPAIR_COMPLETED', '2024-06-01T00:00:00.000Z', { amount: 25.5 }),
    ];

    expect(summariseCosts(events).repairTotal).toBe(65.5);
  });

  it('records the sale price and counts loans', () => {
    const events = [
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z'),
      event('RETURNED', '2024-02-01T00:00:00.000Z'),
      event('LOANED_OUT', '2024-03-01T00:00:00.000Z'),
      event('RETURNED', '2024-04-01T00:00:00.000Z'),
      event('SOLD', '2024-05-01T00:00:00.000Z', { amount: 180 }),
    ];

    const summary = summariseCosts(events);
    expect(summary.saleAmount).toBe(180);
    expect(summary.loanCount).toBe(2);
  });

  it('ignores repairs recorded without a cost', () => {
    const events = [event('REPAIR_COMPLETED', '2024-01-01T00:00:00.000Z')];
    expect(summariseCosts(events).repairTotal).toBe(0);
  });
});

describe('availableActions', () => {
  it('does not offer a return on an item that was never lent', () => {
    expect(availableActions([])).not.toContain('RETURNED');
  });

  it('offers a return only while the item is out', () => {
    const events = [event('LOANED_OUT', '2024-01-01T00:00:00.000Z')];
    expect(availableActions(events)).toContain('RETURNED');
  });

  it('does not offer a second loan on an item already lent out', () => {
    const events = [event('LOANED_OUT', '2024-01-01T00:00:00.000Z')];
    expect(availableActions(events)).not.toContain('LOANED_OUT');
  });

  it('offers repair completion only while in repair', () => {
    const events = [event('SENT_FOR_REPAIR', '2024-01-01T00:00:00.000Z')];
    expect(availableActions(events)).toEqual(['REPAIR_COMPLETED', 'LOST', 'NOTE']);
  });

  it('leaves only notes once an item is sold', () => {
    const events = [event('SOLD', '2024-01-01T00:00:00.000Z')];
    expect(availableActions(events)).toEqual(['NOTE']);
  });
});

describe('describeEvent', () => {
  it('names the counterparty when there is one', () => {
    expect(
      describeEvent(event('LOANED_OUT', '2024-01-01T00:00:00.000Z', { counterparty: 'Dave' }))
    ).toBe('Loaned to Dave');
  });

  it('falls back to the plain label when there is not', () => {
    expect(describeEvent(event('LOANED_OUT', '2024-01-01T00:00:00.000Z'))).toBe('Loaned out');
  });
});

describe('groupByItem', () => {
  it('indexes events by their item', () => {
    const events = [
      event('NOTE', '2024-01-01T00:00:00.000Z', { itemId: 'a' }),
      event('NOTE', '2024-01-02T00:00:00.000Z', { itemId: 'b' }),
      event('NOTE', '2024-01-03T00:00:00.000Z', { itemId: 'a' }),
    ];

    const byItem = groupByItem(events);
    expect(byItem.get('a')).toHaveLength(2);
    expect(byItem.get('b')).toHaveLength(1);
    expect(byItem.get('missing')).toBeUndefined();
  });

  it('returns an empty index for no events', () => {
    expect(groupByItem([]).size).toBe(0);
  });
});

describe('statusFor', () => {
  it('defaults to owned for an item with no events', () => {
    expect(statusFor(new Map(), 'unknown')).toBe('IN_POSSESSION');
  });

  it('derives from that item only', () => {
    const byItem = groupByItem([
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', { itemId: 'a' }),
      event('SOLD', '2024-01-01T00:00:00.000Z', { itemId: 'b' }),
    ]);

    expect(statusFor(byItem, 'a')).toBe('LOANED');
    expect(statusFor(byItem, 'b')).toBe('SOLD');
  });
});

describe('overdueItems', () => {
  const now = new Date('2024-06-01T00:00:00.000Z');

  it('is empty when nothing is out', () => {
    expect(overdueItems(groupByItem([]), now)).toEqual([]);
  });

  it('lists only items past their due date', () => {
    const byItem = groupByItem([
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', {
        itemId: 'late',
        counterparty: 'Dave',
        expectedBackOn: '2024-02-01T00:00:00.000Z',
      }),
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', {
        itemId: 'not-yet',
        expectedBackOn: '2024-12-01T00:00:00.000Z',
      }),
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', { itemId: 'no-date' }),
    ]);

    const overdue = overdueItems(byItem, now);
    expect(overdue).toHaveLength(1);
    expect(overdue[0]?.itemId).toBe('late');
    expect(overdue[0]?.holder).toBe('Dave');
  });

  it('sorts most overdue first', () => {
    const byItem = groupByItem([
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', {
        itemId: 'recent',
        expectedBackOn: '2024-05-01T00:00:00.000Z',
      }),
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', {
        itemId: 'ancient',
        expectedBackOn: '2024-02-01T00:00:00.000Z',
      }),
    ]);

    expect(overdueItems(byItem, now).map((o) => o.itemId)).toEqual(['ancient', 'recent']);
  });

  it('excludes items that have come back', () => {
    const byItem = groupByItem([
      event('LOANED_OUT', '2024-01-01T00:00:00.000Z', {
        itemId: 'returned',
        expectedBackOn: '2024-02-01T00:00:00.000Z',
      }),
      event('RETURNED', '2024-03-01T00:00:00.000Z', { itemId: 'returned' }),
    ]);

    expect(overdueItems(byItem, now)).toEqual([]);
  });
});
