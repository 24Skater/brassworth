import { describe, it, expect } from 'vitest';
import {
  calendarMonthsBetween,
  costOfOwnership,
  currentValue,
  decliningBalanceValue,
  describeAge,
  monthsBetween,
  resolveAcquisition,
  straightLineValue,
  totalCurrentValue,
} from '@/lib/valuation';
import { groupByItem } from '@/lib/lifecycle';
import type { Item, ItemEvent, ItemEventType } from '@/types';

const NOW = new Date('2024-01-01T00:00:00.000Z');

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    organizationId: 'org-1',
    name: 'Cordless Drill',
    condition: 'GOOD',
    quantity: 1,
    isArchived: false,
    tags: [],
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

let seq = 0;
function event(type: ItemEventType, occurredAt: string, extra: Partial<ItemEvent> = {}): ItemEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    itemId: 'item-1',
    organizationId: 'org-1',
    type,
    occurredAt,
    createdAt: `2020-01-01T00:00:${String(seq % 60).padStart(2, '0')}.000Z`,
    ...extra,
  };
}

describe('resolveAcquisition', () => {
  it('falls back to the fields on the item', () => {
    const result = resolveAcquisition(
      item({ purchaseDate: '2022-06-01T00:00:00.000Z', purchasePrice: 249 })
    );

    expect(result).toEqual({ at: '2022-06-01T00:00:00.000Z', price: 249 });
  });

  it('prefers the ACQUIRED event, because the log is the source of truth', () => {
    const events = [event('ACQUIRED', '2021-01-01T00:00:00.000Z', { amount: 199 })];

    const result = resolveAcquisition(
      item({ purchaseDate: '2022-06-01T00:00:00.000Z', purchasePrice: 249 }),
      events
    );

    expect(result).toEqual({ at: '2021-01-01T00:00:00.000Z', price: 199 });
  });

  it('is empty when nothing is known', () => {
    expect(resolveAcquisition(item())).toEqual({ at: undefined, price: undefined });
  });
});

describe('monthsBetween', () => {
  it('is zero without a date', () => {
    expect(monthsBetween(undefined, NOW)).toBe(0);
  });

  it('is zero for an unparseable date', () => {
    expect(monthsBetween('not a date', NOW)).toBe(0);
  });

  it('counts roughly a year as twelve months', () => {
    expect(monthsBetween('2023-01-01T00:00:00.000Z', NOW)).toBeCloseTo(12, 1);
  });

  it('clamps a future purchase date to zero rather than going negative', () => {
    expect(monthsBetween('2030-01-01T00:00:00.000Z', NOW)).toBe(0);
  });
});

describe('describeAge', () => {
  it('is undefined without a date', () => {
    expect(describeAge(undefined, NOW)).toBeUndefined();
  });

  it('describes a part-month', () => {
    expect(describeAge('2023-12-20T00:00:00.000Z', NOW)).toBe('Less than a month');
  });

  it('describes months alone', () => {
    expect(describeAge('2023-08-01T00:00:00.000Z', NOW)).toBe('5 months');
  });

  it('describes years and months', () => {
    expect(describeAge('2021-10-01T00:00:00.000Z', NOW)).toBe('2 years, 3 months');
  });

  it('uses the singular for one year', () => {
    expect(describeAge('2023-01-01T00:00:00.000Z', NOW)).toBe('1 year');
  });

  it('reads an exact anniversary as a whole year, not 11 months', () => {
    // Averaging month length puts one year at 11.99 months; calendar
    // arithmetic is what a person expects to see here.
    expect(describeAge('2020-01-01T00:00:00.000Z', NOW)).toBe('4 years');
  });
});

describe('calendarMonthsBetween', () => {
  it('counts an exact year as twelve months', () => {
    expect(calendarMonthsBetween('2023-01-01T00:00:00.000Z', NOW)).toBe(12);
  });

  it('does not count an incomplete final month', () => {
    expect(calendarMonthsBetween('2023-12-15T00:00:00.000Z', NOW)).toBe(0);
  });

  it('clamps a future date to zero', () => {
    expect(calendarMonthsBetween('2030-01-01T00:00:00.000Z', NOW)).toBe(0);
  });
});

describe('straightLineValue', () => {
  it('is full price on day one', () => {
    expect(straightLineValue(1200, 0, 60)).toBe(1200);
  });

  it('loses an equal share each month', () => {
    // Half of a five-year life.
    expect(straightLineValue(1200, 30, 60)).toBe(600);
  });

  it('reaches zero at the end of its life', () => {
    expect(straightLineValue(1200, 60, 60)).toBe(0);
  });

  it('does not go below zero once past its life', () => {
    expect(straightLineValue(1200, 120, 60)).toBe(0);
  });

  it('stops at the salvage floor', () => {
    expect(straightLineValue(1200, 60, 60, 200)).toBe(200);
    expect(straightLineValue(1200, 30, 60, 200)).toBe(700);
  });

  it('treats a zero-length life as immediately depreciated', () => {
    expect(straightLineValue(1200, 5, 0, 100)).toBe(100);
  });

  it('will not let salvage exceed the purchase price', () => {
    expect(straightLineValue(100, 60, 60, 500)).toBe(100);
  });
});

describe('decliningBalanceValue', () => {
  it('is full price on day one', () => {
    expect(decliningBalanceValue(1000, 0, 0.2)).toBe(1000);
  });

  it('loses a share of the remaining value each year', () => {
    expect(decliningBalanceValue(1000, 12, 0.2)).toBeCloseTo(800, 6);
    expect(decliningBalanceValue(1000, 24, 0.2)).toBeCloseTo(640, 6);
    expect(decliningBalanceValue(1000, 36, 0.2)).toBeCloseTo(512, 6);
  });

  it('never quite reaches zero', () => {
    expect(decliningBalanceValue(1000, 1200, 0.2)).toBeGreaterThan(0);
  });

  it('stops at the salvage floor', () => {
    expect(decliningBalanceValue(1000, 240, 0.5, 50)).toBe(50);
  });

  it('holds value when the rate is zero', () => {
    expect(decliningBalanceValue(1000, 120, 0)).toBe(1000);
  });

  it('drops straight to salvage when the rate is total', () => {
    expect(decliningBalanceValue(1000, 12, 1, 25)).toBe(25);
  });

  it('clamps a nonsensical rate above one', () => {
    expect(decliningBalanceValue(1000, 12, 5, 10)).toBe(10);
  });
});

describe('currentValue', () => {
  it('is undefined when nothing is known — an unknown value is not zero', () => {
    expect(currentValue(item(), [], NOW)).toBeUndefined();
  });

  it('returns the purchase price when no method is set', () => {
    const subject = item({ purchasePrice: 249, purchaseDate: '2020-01-01T00:00:00.000Z' });
    expect(currentValue(subject, [], NOW)).toBe(249);
  });

  it('prefers a manual estimate when no method is set', () => {
    const subject = item({ purchasePrice: 249, currentEstimatedValue: 120 });
    expect(currentValue(subject, [], NOW)).toBe(120);
  });

  it('uses the manual figure when the method is MANUAL', () => {
    const subject = item({
      purchasePrice: 249,
      purchaseDate: '2020-01-01T00:00:00.000Z',
      depreciationMethod: 'MANUAL',
      currentEstimatedValue: 75,
    });

    expect(currentValue(subject, [], NOW)).toBe(75);
  });

  it('depreciates straight line from the purchase date', () => {
    const subject = item({
      purchasePrice: 1200,
      purchaseDate: '2021-01-01T00:00:00.000Z',
      depreciationMethod: 'STRAIGHT_LINE',
      usefulLifeMonths: 60,
    });

    // Three of five years elapsed, so two fifths of value remain.
    expect(currentValue(subject, [], NOW)).toBeCloseTo(480, 0);
  });

  it('depreciates declining balance from the purchase date', () => {
    const subject = item({
      purchasePrice: 1000,
      purchaseDate: '2022-01-01T00:00:00.000Z',
      depreciationMethod: 'DECLINING_BALANCE',
      declineRatePerYear: 0.2,
    });

    expect(currentValue(subject, [], NOW)).toBeCloseTo(640, 0);
  });

  it('depreciates from the ACQUIRED event when there is one', () => {
    const subject = item({
      purchaseDate: '2023-01-01T00:00:00.000Z',
      depreciationMethod: 'STRAIGHT_LINE',
      usefulLifeMonths: 24,
    });
    const events = [event('ACQUIRED', '2022-01-01T00:00:00.000Z', { amount: 240 })];

    // Two years of a two-year life, so fully depreciated.
    expect(currentValue(subject, events, NOW)).toBeCloseTo(0, 0);
  });

  it('falls back to the purchase price when straight line has no useful life', () => {
    const subject = item({
      purchasePrice: 500,
      purchaseDate: '2020-01-01T00:00:00.000Z',
      depreciationMethod: 'STRAIGHT_LINE',
    });

    expect(currentValue(subject, [], NOW)).toBe(500);
  });

  it('ignores a negative purchase price', () => {
    const subject = item({ purchasePrice: -50, currentEstimatedValue: 10 });
    expect(currentValue(subject, [], NOW)).toBe(10);
  });
});

describe('costOfOwnership', () => {
  it('is all zeroes for an item with no history', () => {
    const cost = costOfOwnership(item(), [], NOW);
    expect(cost).toMatchObject({ purchase: 0, repairs: 0, total: 0, net: 0 });
  });

  it('adds repairs to the purchase price', () => {
    const subject = item({ purchasePrice: 249, purchaseDate: '2022-01-01T00:00:00.000Z' });
    const events = [
      event('REPAIR_COMPLETED', '2022-06-01T00:00:00.000Z', { amount: 40 }),
      event('REPAIR_COMPLETED', '2023-06-01T00:00:00.000Z', { amount: 25 }),
    ];

    const cost = costOfOwnership(subject, events, NOW);
    expect(cost.purchase).toBe(249);
    expect(cost.repairs).toBe(65);
    expect(cost.total).toBe(314);
  });

  it('subtracts what selling it recovered', () => {
    const subject = item({ purchasePrice: 249, purchaseDate: '2022-01-01T00:00:00.000Z' });
    const events = [
      event('REPAIR_COMPLETED', '2022-06-01T00:00:00.000Z', { amount: 40 }),
      event('SOLD', '2023-06-01T00:00:00.000Z', { amount: 180 }),
    ];

    expect(costOfOwnership(subject, events, NOW).net).toBe(109);
  });

  it('divides net cost by months owned', () => {
    const subject = item({ purchasePrice: 1200, purchaseDate: '2023-01-01T00:00:00.000Z' });

    const cost = costOfOwnership(subject, [], NOW);
    expect(cost.perMonth).toBeCloseTo(100, 0);
  });

  it('omits a monthly figure before a month has passed', () => {
    const subject = item({ purchasePrice: 1200, purchaseDate: '2023-12-25T00:00:00.000Z' });
    expect(costOfOwnership(subject, [], NOW).perMonth).toBeUndefined();
  });
});

describe('totalCurrentValue', () => {
  it('is zero for no items', () => {
    expect(totalCurrentValue([], new Map(), NOW)).toBe(0);
  });

  it('sums across items, skipping unknowns', () => {
    const items = [
      item({ id: 'a', purchasePrice: 100 }),
      item({ id: 'b', purchasePrice: 250 }),
      item({ id: 'c' }), // unknown value contributes nothing
    ];

    expect(totalCurrentValue(items, new Map(), NOW)).toBe(350);
  });

  it('uses each item own events', () => {
    const items = [
      item({
        id: 'a',
        depreciationMethod: 'STRAIGHT_LINE',
        usefulLifeMonths: 24,
        purchaseDate: '2023-01-01T00:00:00.000Z',
      }),
    ];
    const byItem = groupByItem([
      { ...event('ACQUIRED', '2023-01-01T00:00:00.000Z', { amount: 240 }), itemId: 'a' },
    ]);

    // One year of a two-year life: half remains.
    expect(totalCurrentValue(items, byItem, NOW)).toBeCloseTo(120, 0);
  });
});
