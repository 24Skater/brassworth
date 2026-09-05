import { describe, it, expect } from 'vitest';
import {
  buildPurchase,
  contributionsFor,
  groupContributions,
  progressFor,
  readyToBuy,
  savedTotal,
  sortEntries,
  wishlistTotals,
} from '@/lib/wishlist';
import type { SavingsContribution, WishlistEntry, WishlistPriority } from '@/types';

let seq = 0;

function entry(overrides: Partial<WishlistEntry> = {}): WishlistEntry {
  seq += 1;
  return {
    id: `w${seq}`,
    organizationId: 'org-1',
    name: `Wish ${seq}`,
    priority: 'MEDIUM',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function contribution(
  wishlistEntryId: string,
  amount: number,
  occurredAt = '2024-01-01T00:00:00.000Z'
): SavingsContribution {
  seq += 1;
  return {
    id: `c${seq}`,
    wishlistEntryId,
    organizationId: 'org-1',
    amount,
    occurredAt,
    createdAt: occurredAt,
  };
}

describe('savedTotal', () => {
  it('is zero with nothing put aside', () => {
    expect(savedTotal([])).toBe(0);
  });

  it('adds contributions up', () => {
    expect(savedTotal([contribution('w', 50), contribution('w', 25.5)])).toBe(75.5);
  });

  it('treats a negative amount as a withdrawal', () => {
    expect(savedTotal([contribution('w', 100), contribution('w', -30)])).toBe(70);
  });

  it('never reports a negative balance', () => {
    // Taking out more than went in is a data error, not a debt to display.
    expect(savedTotal([contribution('w', 20), contribution('w', -50)])).toBe(0);
  });

  it('ignores a non-finite amount rather than poisoning the total', () => {
    expect(savedTotal([contribution('w', 40), contribution('w', NaN)])).toBe(40);
  });
});

describe('progressFor', () => {
  it('reports savings but no fraction when there is no target', () => {
    const progress = progressFor(entry(), [contribution('w', 40)]);

    expect(progress.saved).toBe(40);
    // 100% of an unknown would be worse than saying nothing.
    expect(progress.percent).toBeUndefined();
    expect(progress.remaining).toBeUndefined();
    expect(progress.funded).toBe(false);
  });

  it('computes percent and remaining against a target', () => {
    const subject = entry({ targetPrice: 200 });
    const progress = progressFor(subject, [contribution(subject.id, 50)]);

    expect(progress.percent).toBe(25);
    expect(progress.remaining).toBe(150);
    expect(progress.funded).toBe(false);
  });

  it('is funded once savings reach the target', () => {
    const subject = entry({ targetPrice: 200 });
    expect(progressFor(subject, [contribution(subject.id, 200)]).funded).toBe(true);
  });

  it('caps percent at 100 and remaining at zero when oversaved', () => {
    const subject = entry({ targetPrice: 100 });
    const progress = progressFor(subject, [contribution(subject.id, 250)]);

    expect(progress.percent).toBe(100);
    expect(progress.remaining).toBe(0);
    expect(progress.saved).toBe(250);
  });

  it('ignores a zero or negative target', () => {
    expect(progressFor(entry({ targetPrice: 0 }), []).percent).toBeUndefined();
    expect(progressFor(entry({ targetPrice: -5 }), []).percent).toBeUndefined();
  });
});

describe('contributionsFor and groupContributions', () => {
  it('picks out one entry contributions', () => {
    const rows = [contribution('a', 10), contribution('b', 20), contribution('a', 30)];
    expect(contributionsFor(rows, 'a')).toHaveLength(2);
  });

  it('indexes by entry', () => {
    const byEntry = groupContributions([
      contribution('a', 10),
      contribution('b', 20),
      contribution('a', 5),
    ]);

    expect(byEntry.get('a')).toHaveLength(2);
    expect(byEntry.get('b')).toHaveLength(1);
    expect(byEntry.get('missing')).toBeUndefined();
  });
});

describe('sortEntries', () => {
  const byPriority = (priority: WishlistPriority, name: string) =>
    entry({ priority, name, targetPrice: 100 });

  it('puts high priority first', () => {
    const low = byPriority('LOW', 'Low');
    const high = byPriority('HIGH', 'High');
    const medium = byPriority('MEDIUM', 'Medium');

    expect(sortEntries([low, medium, high], new Map()).map((e) => e.name)).toEqual([
      'High',
      'Medium',
      'Low',
    ]);
  });

  it('puts the closest to funded first within a priority', () => {
    const nearlyThere = byPriority('HIGH', 'Nearly');
    const barelyStarted = byPriority('HIGH', 'Barely');

    const byEntry = groupContributions([
      contribution(nearlyThere.id, 90),
      contribution(barelyStarted.id, 5),
    ]);

    expect(sortEntries([barelyStarted, nearlyThere], byEntry).map((e) => e.name)).toEqual([
      'Nearly',
      'Barely',
    ]);
  });

  it('sinks bought entries to the bottom without hiding them', () => {
    const bought = entry({ name: 'Bought', priority: 'HIGH', purchasedItemId: 'item-1' });
    const wanted = entry({ name: 'Wanted', priority: 'LOW' });

    expect(sortEntries([bought, wanted], new Map()).map((e) => e.name)).toEqual([
      'Wanted',
      'Bought',
    ]);
  });

  it('falls back to name so the order is stable', () => {
    const b = entry({ name: 'Beta', priority: 'MEDIUM' });
    const a = entry({ name: 'Alpha', priority: 'MEDIUM' });

    expect(sortEntries([b, a], new Map()).map((e) => e.name)).toEqual(['Alpha', 'Beta']);
  });

  it('does not mutate its input', () => {
    const entries = [byPriority('LOW', 'Low'), byPriority('HIGH', 'High')];
    const before = entries.map((e) => e.name);

    sortEntries(entries, new Map());

    expect(entries.map((e) => e.name)).toEqual(before);
  });
});

describe('readyToBuy', () => {
  it('lists what is fully saved for and not yet bought', () => {
    const funded = entry({ name: 'Funded', targetPrice: 100 });
    const partial = entry({ name: 'Partial', targetPrice: 100 });
    const alreadyBought = entry({ name: 'Bought', targetPrice: 100, purchasedItemId: 'item-1' });

    const byEntry = groupContributions([
      contribution(funded.id, 100),
      contribution(partial.id, 40),
      contribution(alreadyBought.id, 100),
    ]);

    expect(readyToBuy([funded, partial, alreadyBought], byEntry).map((e) => e.name)).toEqual([
      'Funded',
    ]);
  });

  it('never reports an entry with no target as ready', () => {
    const noTarget = entry();
    const byEntry = groupContributions([contribution(noTarget.id, 500)]);

    expect(readyToBuy([noTarget], byEntry)).toHaveLength(0);
  });
});

describe('wishlistTotals', () => {
  it('is empty for an empty list', () => {
    expect(wishlistTotals([], new Map())).toMatchObject({
      count: 0,
      outstanding: 0,
      savedTotal: 0,
    });
  });

  it('totals targets, savings and what is left', () => {
    const a = entry({ targetPrice: 200 });
    const b = entry({ targetPrice: 100 });
    const byEntry = groupContributions([contribution(a.id, 50), contribution(b.id, 25)]);

    expect(wishlistTotals([a, b], byEntry)).toMatchObject({
      outstanding: 2,
      targetTotal: 300,
      savedTotal: 75,
      remainingTotal: 225,
    });
  });

  it('excludes bought entries, whose savings have already been spent', () => {
    const wanted = entry({ targetPrice: 200 });
    const bought = entry({ targetPrice: 500, purchasedItemId: 'item-1' });
    const byEntry = groupContributions([contribution(wanted.id, 50), contribution(bought.id, 500)]);

    const totals = wishlistTotals([wanted, bought], byEntry);
    expect(totals.count).toBe(2);
    expect(totals.outstanding).toBe(1);
    expect(totals.savedTotal).toBe(50);
    expect(totals.targetTotal).toBe(200);
  });
});

describe('buildPurchase', () => {
  const source = entry({
    name: 'Cordless Drill',
    brand: 'Milwaukee',
    model: 'M18',
    categoryId: 'cat-1',
    targetPrice: 249,
    url: 'https://example.com/drill',
    notes: 'The brushless one',
  });

  it('carries the identifying detail across', () => {
    const { item } = buildPurchase(source, 199, '2024-06-01T00:00:00.000Z');

    expect(item).toMatchObject({
      name: 'Cordless Drill',
      brand: 'Milwaukee',
      model: 'M18',
      categoryId: 'cat-1',
      notes: 'The brushless one',
      condition: 'NEW',
      quantity: 1,
      isArchived: false,
    });
  });

  it('records what was actually paid, not the target', () => {
    const { item, event } = buildPurchase(source, 199, '2024-06-01T00:00:00.000Z');

    expect(item.purchasePrice).toBe(199);
    expect(event.amount).toBe(199);
  });

  it('dates ownership from the purchase, not from when the row was written', () => {
    const { item, event } = buildPurchase(source, 199, '2020-03-15T00:00:00.000Z');

    expect(item.purchaseDate).toBe('2020-03-15T00:00:00.000Z');
    expect(event.occurredAt).toBe('2020-03-15T00:00:00.000Z');
  });

  it('produces an ACQUIRED event, so the item starts with a history', () => {
    const { event } = buildPurchase(source, 199, '2024-06-01T00:00:00.000Z');

    expect(event.type).toBe('ACQUIRED');
    expect(event.note).toContain('wishlist');
    expect(event.note).toContain('https://example.com/drill');
  });

  it('copes with an unknown price', () => {
    const { item, event } = buildPurchase(source, undefined, '2024-06-01T00:00:00.000Z');

    expect(item.purchasePrice).toBeUndefined();
    expect(event.amount).toBeUndefined();
  });

  it('omits the source from the note when there was no link', () => {
    const { event } = buildPurchase(entry({ name: 'Plain' }), 10, '2024-06-01T00:00:00.000Z');
    expect(event.note).toBe('Bought from the wishlist');
  });
});
