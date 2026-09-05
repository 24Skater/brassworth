import { describe, it, expect } from 'vitest';
import {
  alertFor,
  alertsFor,
  groupObservations,
  priceStats,
  sortObservations,
  trend,
} from '@/lib/prices';
import type { PriceObservation, WishlistEntry } from '@/types';

let seq = 0;

function observation(
  wishlistEntryId: string,
  amount: number,
  observedAt = '2024-01-01T00:00:00.000Z'
): PriceObservation {
  seq += 1;
  return {
    id: `p${seq}`,
    wishlistEntryId,
    organizationId: 'org-1',
    amount,
    observedAt,
    source: 'MANUAL',
    createdAt: `2024-01-01T00:00:${String(seq % 60).padStart(2, '0')}.000Z`,
  };
}

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

describe('sortObservations', () => {
  it('orders oldest first', () => {
    const later = observation('w', 10, '2024-06-01T00:00:00.000Z');
    const earlier = observation('w', 20, '2024-01-01T00:00:00.000Z');

    expect(sortObservations([later, earlier]).map((o) => o.amount)).toEqual([20, 10]);
  });

  it('does not mutate its input', () => {
    const rows = [
      observation('w', 10, '2024-06-01T00:00:00.000Z'),
      observation('w', 20, '2024-01-01T00:00:00.000Z'),
    ];
    const before = rows.map((r) => r.id);

    sortObservations(rows);

    expect(rows.map((r) => r.id)).toEqual(before);
  });
});

describe('priceStats', () => {
  it('is empty with no observations', () => {
    expect(priceStats([])).toEqual({ count: 0 });
  });

  it('reports latest, lowest and highest', () => {
    const rows = [
      observation('w', 300, '2024-01-01T00:00:00.000Z'),
      observation('w', 180, '2024-02-01T00:00:00.000Z'),
      observation('w', 250, '2024-03-01T00:00:00.000Z'),
    ];

    const stats = priceStats(rows);
    expect(stats.latest?.amount).toBe(250);
    expect(stats.lowest?.amount).toBe(180);
    expect(stats.highest?.amount).toBe(300);
    expect(stats.count).toBe(3);
  });

  it('ignores unusable amounts rather than reporting nonsense', () => {
    const rows = [observation('w', 100), observation('w', NaN), observation('w', -5)];
    expect(priceStats(rows).count).toBe(1);
    expect(priceStats(rows).lowest?.amount).toBe(100);
  });
});

describe('trend', () => {
  it('is undefined until there are two observations', () => {
    expect(trend([])).toBeUndefined();
    expect(trend([observation('w', 100)])).toBeUndefined();
  });

  it('reports a fall, a rise and no change', () => {
    const base = '2024-01-01T00:00:00.000Z';
    const later = '2024-02-01T00:00:00.000Z';

    expect(trend([observation('w', 200, base), observation('w', 150, later)])).toBe('DOWN');
    expect(trend([observation('w', 150, base), observation('w', 200, later)])).toBe('UP');
    expect(trend([observation('w', 150, base), observation('w', 150, later)])).toBe('FLAT');
  });

  it('compares the two most recent, not the first and last', () => {
    const rows = [
      observation('w', 100, '2024-01-01T00:00:00.000Z'),
      observation('w', 300, '2024-02-01T00:00:00.000Z'),
      observation('w', 250, '2024-03-01T00:00:00.000Z'),
    ];

    // Overall it is up from 100, but the last move was down.
    expect(trend(rows)).toBe('DOWN');
  });
});

describe('alertFor', () => {
  it('does not alert without a target', () => {
    // Alerting on "it moved a bit" would train people to ignore it.
    expect(alertFor(entry(), [observation('w', 10)])).toBeNull();
  });

  it('does not alert while the price is above the target', () => {
    const subject = entry({ targetPrice: 200 });
    expect(alertFor(subject, [observation(subject.id, 250)])).toBeNull();
  });

  it('alerts once the latest price reaches the target', () => {
    const subject = entry({ targetPrice: 200 });
    const alert = alertFor(subject, [observation(subject.id, 200)]);

    expect(alert).toMatchObject({ belowTarget: true, amount: 200, saving: 0 });
  });

  it('reports the saving against the target', () => {
    const subject = entry({ targetPrice: 200 });
    expect(alertFor(subject, [observation(subject.id, 150)])?.saving).toBe(50);
  });

  it('uses the latest price, not the lowest ever seen', () => {
    const subject = entry({ targetPrice: 200 });
    const rows = [
      observation(subject.id, 150, '2024-01-01T00:00:00.000Z'),
      observation(subject.id, 260, '2024-02-01T00:00:00.000Z'),
    ];

    // It was cheap once; it is not cheap now.
    expect(alertFor(subject, rows)).toBeNull();
  });

  it('says when the current price is also the cheapest ever', () => {
    const subject = entry({ targetPrice: 300 });
    const cheapestNow = [
      observation(subject.id, 250, '2024-01-01T00:00:00.000Z'),
      observation(subject.id, 180, '2024-02-01T00:00:00.000Z'),
    ];
    expect(alertFor(subject, cheapestNow)?.isLowestEver).toBe(true);

    const cheaperBefore = [
      observation(subject.id, 150, '2024-01-01T00:00:00.000Z'),
      observation(subject.id, 200, '2024-02-01T00:00:00.000Z'),
    ];
    expect(alertFor(subject, cheaperBefore)?.isLowestEver).toBe(false);
  });

  it('never alerts on something already bought', () => {
    const subject = entry({ targetPrice: 200, purchasedItemId: 'item-1' });
    expect(alertFor(subject, [observation(subject.id, 50)])).toBeNull();
  });
});

describe('alertsFor', () => {
  it('is empty when nothing is below its target', () => {
    const subject = entry({ targetPrice: 100 });
    const byEntry = groupObservations([observation(subject.id, 200)]);

    expect(alertsFor([subject], byEntry)).toHaveLength(0);
  });

  it('lists the biggest saving first', () => {
    const small = entry({ name: 'Small', targetPrice: 100 });
    const big = entry({ name: 'Big', targetPrice: 1000 });

    const byEntry = groupObservations([observation(small.id, 90), observation(big.id, 500)]);

    expect(alertsFor([small, big], byEntry).map((a) => a.entry.name)).toEqual(['Big', 'Small']);
  });

  it('skips entries with no observations at all', () => {
    const watched = entry({ targetPrice: 100 });
    const unwatched = entry({ targetPrice: 100 });
    const byEntry = groupObservations([observation(watched.id, 50)]);

    expect(alertsFor([watched, unwatched], byEntry)).toHaveLength(1);
  });
});

describe('groupObservations', () => {
  it('indexes by entry', () => {
    const byEntry = groupObservations([
      observation('a', 10),
      observation('b', 20),
      observation('a', 30),
    ]);

    expect(byEntry.get('a')).toHaveLength(2);
    expect(byEntry.get('b')).toHaveLength(1);
    expect(byEntry.get('missing')).toBeUndefined();
  });
});
