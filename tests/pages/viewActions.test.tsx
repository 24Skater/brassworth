import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';
import { storage } from '@/lib/storage';
import Items from '@/pages/Items';
import Wishlist from '@/pages/Wishlist';
import type { Item } from '@/types';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return { ...actual, writeFile: vi.fn() };
});

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'a',
    organizationId: TEST_ORG.id,
    name: 'Cordless Drill',
    brand: 'Milwaukee',
    condition: 'GOOD',
    quantity: 1,
    isArchived: false,
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const VIEWS = ['list', 'gallery', 'table'] as const;

/**
 * The same actions, driven from every view.
 *
 * Grid, list, gallery and table each wire their own archive, delete and open
 * callbacks. Testing only the grid left the other three unexercised, which is
 * exactly where a miswired handler would hide.
 */
describe('item actions from every view', () => {
  beforeEach(async () => {
    await seed();
    await storage.setCategories([{ id: 'c1', organizationId: TEST_ORG.id, name: 'Power Tools' }]);
    await storage.setItems([makeItem(), makeItem({ id: 'b', name: 'Table Saw' })]);
  });

  async function switchTo(user: ReturnType<typeof userEvent.setup>, view: string) {
    await screen.findByText('Cordless Drill');
    await user.click(screen.getByRole('tab', { name: new RegExp(`${view} view`, 'i') }));
    await screen.findByText('Cordless Drill');
  }

  it.each(VIEWS)('archives an item from the %s view', async (view) => {
    const user = userEvent.setup();
    renderPage(<Items />);
    await switchTo(user, view);

    await user.click(screen.getByRole('button', { name: /archive cordless drill/i }));

    await waitFor(async () => {
      const item = (await storage.getItems()).find((i) => i.id === 'a');
      expect(item?.isArchived).toBe(true);
    });
  });

  it.each(VIEWS)('deletes an item from the %s view', async (view) => {
    const user = userEvent.setup();
    renderPage(<Items />);
    await switchTo(user, view);

    await user.click(screen.getByRole('button', { name: /delete cordless drill/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe('b');
    });
  });

  it.each(VIEWS)('opens an item from the %s view', async (view) => {
    navigate.mockClear();
    const user = userEvent.setup();
    renderPage(<Items />);
    await switchTo(user, view);

    await user.click(screen.getByText('Cordless Drill'));

    // It must open the item that was clicked, not merely go somewhere.
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(expect.stringContaining('a'));
    });
  });
});

describe('saving a bulk edit', () => {
  beforeEach(async () => {
    await seed();
    await storage.setCategories([
      { id: 'c1', organizationId: TEST_ORG.id, name: 'Power Tools' },
      { id: 'c2', organizationId: TEST_ORG.id, name: 'Bench Tools' },
    ]);
    await storage.setItems([
      makeItem({ categoryId: 'c1' }),
      makeItem({ id: 'b', name: 'Table Saw', categoryId: 'c1' }),
    ]);
  });

  it('applies a new category to every selected item', async () => {
    const user = userEvent.setup();
    renderPage(<Items />);
    await screen.findByText('Cordless Drill');

    await user.click(screen.getByRole('button', { name: /select all/i }));
    await user.click(await screen.findByRole('button', { name: /edit 2 items/i }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/change category/i));
    await user.click(await screen.findByRole('option', { name: /bench tools/i }));
    await user.click(within(dialog).getByRole('button', { name: /update items/i }));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items.every((i) => i.categoryId === 'c2')).toBe(true);
    });
  });

  it('keeps every item id through a bulk save', async () => {
    const user = userEvent.setup();
    renderPage(<Items />);
    await screen.findByText('Cordless Drill');

    await user.click(screen.getByRole('button', { name: /select all/i }));
    await user.click(await screen.findByRole('button', { name: /edit 2 items/i }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/change category/i));
    await user.click(await screen.findByRole('option', { name: /bench tools/i }));
    await user.click(within(dialog).getByRole('button', { name: /update items/i }));

    await waitFor(async () => {
      const ids = (await storage.getItems()).map((i) => i.id).sort();
      expect(ids).toEqual(['a', 'b']);
    });
  });
});

describe('Wishlist fields', () => {
  beforeEach(async () => {
    await seed();
    await storage.setWishlistEntries([
      {
        id: 'w1',
        organizationId: TEST_ORG.id,
        name: 'Track Saw',
        priority: 'MEDIUM',
        targetPrice: 500,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('saves every detail typed into the add dialog', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByTestId('add-wish'));
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/what is it/i), 'Domino Joiner');
    await user.type(within(dialog).getByLabelText(/brand/i), 'Festool');
    await user.type(within(dialog).getByLabelText(/model/i), 'DF 500');
    await user.type(within(dialog).getByLabelText(/target price/i), '900');
    await user.type(
      within(dialog).getByLabelText(/where you saw it/i),
      'https://example.com/df500'
    );
    await user.click(within(dialog).getByRole('button', { name: /^add$/i }));

    await waitFor(async () => {
      const entry = (await storage.getWishlistEntries()).find((e) => e.name === 'Domino Joiner');
      expect(entry?.brand).toBe('Festool');
      expect(entry?.model).toBe('DF 500');
      expect(entry?.targetPrice).toBe(900);
      expect(entry?.url).toBe('https://example.com/df500');
    });
  });

  it('saves how badly it is wanted', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByTestId('add-wish'));
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/what is it/i), 'Domino Joiner');
    await user.click(within(dialog).getByLabelText(/how badly/i));
    await user.click(await screen.findByRole('option', { name: /high/i }));
    await user.click(within(dialog).getByRole('button', { name: /^add$/i }));

    await waitFor(async () => {
      const entry = (await storage.getWishlistEntries()).find((e) => e.name === 'Domino Joiner');
      expect(entry?.priority).toBe('HIGH');
    });
  });

  it('adds nothing when the add dialog is cancelled', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByTestId('add-wish'));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/what is it/i), 'Abandoned');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    await waitFor(async () => {
      expect(await storage.getWishlistEntries()).toHaveLength(1);
    });
  });

  it('saves nothing when the savings dialog is cancelled', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByRole('button', { name: /put money aside/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('spinbutton'), '150');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    await waitFor(async () => {
      expect(await storage.getSavingsContributions()).toHaveLength(0);
    });
  });

  it('records nothing when the price dialog is cancelled', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByRole('button', { name: /record a price/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('spinbutton'), '450');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    await waitFor(async () => {
      expect(await storage.getPriceObservations()).toHaveLength(0);
    });
  });

  it('buys nothing when the purchase dialog is cancelled', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByTestId('buy-Track Saw'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    await waitFor(async () => {
      expect(await storage.getItems()).toHaveLength(0);
    });
  });
});
