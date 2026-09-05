import { describe, it, expect } from 'vitest';
import {
  buildReport,
  byBrand,
  byCategory,
  byLocation,
  heldItems,
  isHeld,
  portfolioTotals,
  reportFileName,
  reportToCsv,
} from '@/lib/reporting';
import { groupByItem } from '@/lib/lifecycle';
import type { Category, Item, ItemEvent, ItemEventType, Location } from '@/types';

const NOW = new Date('2024-01-01T00:00:00.000Z');

function item(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    organizationId: 'org-1',
    name: `Item ${id}`,
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
function event(
  itemId: string,
  type: ItemEventType,
  occurredAt: string,
  extra: Partial<ItemEvent> = {}
): ItemEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    itemId,
    organizationId: 'org-1',
    type,
    occurredAt,
    createdAt: `2020-01-01T00:00:${String(seq % 60).padStart(2, '0')}.000Z`,
    ...extra,
  };
}

const categories: Category[] = [
  { id: 'c1', organizationId: 'org-1', name: 'Power Tools' },
  { id: 'c2', organizationId: 'org-1', name: 'Networking' },
];

const locations: Location[] = [
  { id: 'l1', organizationId: 'org-1', name: 'Garage' },
  { id: 'l2', organizationId: 'org-1', name: 'Office' },
];

describe('isHeld', () => {
  it('counts an ordinary owned item', () => {
    expect(isHeld(item('a'))).toBe(true);
  });

  it('excludes archived items', () => {
    expect(isHeld(item('a', { isArchived: true }))).toBe(false);
  });

  it('excludes sold items', () => {
    const events = [event('a', 'SOLD', '2023-01-01T00:00:00.000Z', { amount: 100 })];
    expect(isHeld(item('a'), events)).toBe(false);
  });

  it('excludes lost items', () => {
    expect(isHeld(item('a'), [event('a', 'LOST', '2023-01-01T00:00:00.000Z')])).toBe(false);
  });

  it('still counts a loaned item — it is out, not gone', () => {
    const events = [event('a', 'LOANED_OUT', '2023-01-01T00:00:00.000Z')];
    expect(isHeld(item('a'), events)).toBe(true);
  });
});

describe('heldItems', () => {
  it('drops sold and archived items', () => {
    const items = [item('keep'), item('sold'), item('archived', { isArchived: true })];
    const byItem = groupByItem([event('sold', 'SOLD', '2023-01-01T00:00:00.000Z')]);

    expect(heldItems(items, byItem).map((i) => i.id)).toEqual(['keep']);
  });
});

describe('byBrand', () => {
  it('groups and totals by brand', () => {
    const items = [
      item('a', { brand: 'Milwaukee', purchasePrice: 200 }),
      item('b', { brand: 'Milwaukee', purchasePrice: 150 }),
      item('c', { brand: 'DeWalt', purchasePrice: 100 }),
    ];

    const result = byBrand(items, new Map(), NOW);

    expect(result[0]).toMatchObject({ key: 'Milwaukee', count: 2, purchaseTotal: 350 });
    expect(result[1]).toMatchObject({ key: 'DeWalt', count: 1, purchaseTotal: 100 });
  });

  it('sorts most valuable first', () => {
    const items = [
      item('a', { brand: 'Cheap', purchasePrice: 10 }),
      item('b', { brand: 'Pricey', purchasePrice: 900 }),
    ];

    expect(byBrand(items, new Map(), NOW).map((b) => b.key)).toEqual(['Pricey', 'Cheap']);
  });

  it('labels items with no brand rather than dropping them', () => {
    const result = byBrand([item('a', { purchasePrice: 50 })], new Map(), NOW);
    expect(result[0]?.key).toBe('No brand');
  });

  it('treats whitespace as no brand', () => {
    const result = byBrand([item('a', { brand: '   ' })], new Map(), NOW);
    expect(result[0]?.key).toBe('No brand');
  });

  it('works identically for IT gear, since brand is just a field', () => {
    const items = [
      item('a', { brand: 'Ubiquiti', purchasePrice: 300 }),
      item('b', { brand: 'Milwaukee', purchasePrice: 200 }),
    ];

    expect(byBrand(items, new Map(), NOW).map((b) => b.key)).toEqual(['Ubiquiti', 'Milwaukee']);
  });
});

describe('byCategory', () => {
  it('resolves category names', () => {
    const items = [item('a', { categoryId: 'c1', purchasePrice: 100 })];
    expect(byCategory(items, new Map(), categories, NOW)[0]?.key).toBe('Power Tools');
  });

  it('labels items with no category', () => {
    expect(byCategory([item('a')], new Map(), categories, NOW)[0]?.key).toBe('Uncategorised');
  });

  it('labels a category that no longer exists', () => {
    const items = [item('a', { categoryId: 'deleted' })];
    expect(byCategory(items, new Map(), categories, NOW)[0]?.key).toBe('Uncategorised');
  });
});

describe('byLocation', () => {
  it('resolves location names', () => {
    const items = [item('a', { locationId: 'l2', purchasePrice: 100 })];
    expect(byLocation(items, new Map(), locations, NOW)[0]?.key).toBe('Office');
  });

  it('labels items with no location', () => {
    expect(byLocation([item('a')], new Map(), locations, NOW)[0]?.key).toBe('No location');
  });
});

describe('portfolioTotals', () => {
  it('is empty for no items', () => {
    expect(portfolioTotals([], new Map(), NOW)).toMatchObject({
      count: 0,
      purchaseTotal: 0,
      currentTotal: 0,
    });
  });

  it('totals purchase and current value across held items', () => {
    const items = [item('a', { purchasePrice: 100 }), item('b', { purchasePrice: 250 })];

    const totals = portfolioTotals(items, new Map(), NOW);
    expect(totals.count).toBe(2);
    expect(totals.purchaseTotal).toBe(350);
  });

  it('excludes a sold item from current value and records what it fetched', () => {
    const items = [item('a', { purchasePrice: 200 }), item('sold', { purchasePrice: 300 })];
    const byItem = groupByItem([
      event('sold', 'SOLD', '2023-06-01T00:00:00.000Z', { amount: 180 }),
    ]);

    const totals = portfolioTotals(items, byItem, NOW);
    expect(totals.count).toBe(1);
    expect(totals.purchaseTotal).toBe(200);
    expect(totals.saleTotal).toBe(180);
  });

  it('accumulates repair spend even for items no longer held', () => {
    const items = [item('sold', { purchasePrice: 300 })];
    const byItem = groupByItem([
      event('sold', 'REPAIR_COMPLETED', '2023-01-01T00:00:00.000Z', { amount: 45 }),
      event('sold', 'SOLD', '2023-06-01T00:00:00.000Z', { amount: 180 }),
    ]);

    expect(portfolioTotals(items, byItem, NOW).repairTotal).toBe(45);
  });

  it('reports depreciation as a negative change in value', () => {
    const items = [
      item('a', {
        purchasePrice: 1000,
        purchaseDate: '2022-01-01T00:00:00.000Z',
        depreciationMethod: 'STRAIGHT_LINE',
        usefulLifeMonths: 48,
      }),
    ];

    expect(portfolioTotals(items, new Map(), NOW).changeInValue).toBeLessThan(0);
  });
});

describe('buildReport', () => {
  it('emits one row per item with the identifying detail a claim needs', () => {
    const items = [
      item('a', {
        name: 'Cordless Drill',
        brand: 'Milwaukee',
        model: 'M18',
        serialNumber: 'SN-123',
        categoryId: 'c1',
        locationId: 'l1',
        purchasePrice: 249,
        purchaseDate: '2022-03-15T00:00:00.000Z',
      }),
    ];

    const [row] = buildReport(items, new Map(), categories, locations, NOW);

    expect(row).toMatchObject({
      name: 'Cordless Drill',
      brand: 'Milwaukee',
      model: 'M18',
      serialNumber: 'SN-123',
      category: 'Power Tools',
      location: 'Garage',
      status: 'IN_POSSESSION',
      purchaseDate: '2022-03-15',
      purchasePrice: '249.00',
    });
  });

  it('leaves unknown figures blank rather than zero', () => {
    const [row] = buildReport([item('a')], new Map(), categories, locations, NOW);

    expect(row?.purchasePrice).toBe('');
    expect(row?.currentValue).toBe('');
    expect(row?.repairSpend).toBe('');
  });

  it('reports the derived status', () => {
    const byItem = groupByItem([event('a', 'LOANED_OUT', '2023-01-01T00:00:00.000Z')]);
    const [row] = buildReport([item('a')], byItem, categories, locations, NOW);

    expect(row?.status).toBe('LOANED');
  });
});

describe('reportToCsv', () => {
  it('starts with a header row', () => {
    const csv = reportToCsv([]);
    expect(csv.split('\r\n')[0]).toContain('Serial number');
  });

  it('writes one line per item', () => {
    const rows = buildReport([item('a'), item('b')], new Map(), categories, locations, NOW);
    expect(reportToCsv(rows).split('\r\n')).toHaveLength(3);
  });

  it('quotes a value containing a comma', () => {
    const rows = buildReport(
      [item('a', { name: 'Drill, cordless' })],
      new Map(),
      categories,
      locations,
      NOW
    );

    expect(reportToCsv(rows)).toContain('"Drill, cordless"');
  });

  it('escapes embedded quotes by doubling them', () => {
    const rows = buildReport(
      [item('a', { name: 'The "good" drill' })],
      new Map(),
      categories,
      locations,
      NOW
    );

    expect(reportToCsv(rows)).toContain('"The ""good"" drill"');
  });

  it('quotes a value containing a newline', () => {
    const rows = buildReport(
      [item('a', { name: 'Line one\nLine two' })],
      new Map(),
      categories,
      locations,
      NOW
    );

    expect(reportToCsv(rows)).toContain('"Line one\nLine two"');
  });
});

describe('reportFileName', () => {
  it('is dated and csv', () => {
    expect(reportFileName(new Date('2026-09-05T12:00:00Z'))).toBe(
      'brassworth-report-2026-09-05.csv'
    );
  });
});
