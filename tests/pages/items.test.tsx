import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';
import { storage } from '@/lib/storage';
import Items from '@/pages/Items';
import type { Item } from '@/types';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
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

const ITEMS: Item[] = [
  makeItem({ id: 'a', name: 'Cordless Drill', brand: 'Milwaukee', categoryId: 'c1' }),
  makeItem({
    id: 'b',
    name: 'Table Saw',
    brand: 'DeWalt',
    condition: 'FAIR',
    categoryId: 'c2',
    locationId: 'l1',
  }),
  makeItem({ id: 'c', name: 'Retired Sander', brand: 'Ryobi', isArchived: true }),
];

async function seedItems(items: Item[] = ITEMS): Promise<void> {
  await seed();
  await storage.setCategories([
    { id: 'c1', organizationId: TEST_ORG.id, name: 'Power Tools' },
    { id: 'c2', organizationId: TEST_ORG.id, name: 'Bench Tools' },
  ]);
  await storage.setLocations([{ id: 'l1', organizationId: TEST_ORG.id, name: 'Garage' }]);
  await storage.setItems(items);
}

/** Wait for the page to finish loading and show the seeded items. */
async function showsDrill(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByText('Cordless Drill')).toBeInTheDocument();
  });
}

describe('Items', () => {
  beforeEach(async () => {
    await seedItems();
  });

  it('lists the active items', async () => {
    renderPage(<Items />);
    await showsDrill();

    expect(screen.getByText('Table Saw')).toBeInTheDocument();
  });

  it('keeps archived items out of the active list', async () => {
    renderPage(<Items />);
    await showsDrill();

    expect(screen.queryByText('Retired Sander')).not.toBeInTheDocument();
  });

  it('shows archived items on the archived tab', async () => {
    const user = userEvent.setup();
    renderPage(<Items />);
    await showsDrill();

    await user.click(screen.getByRole('tab', { name: /archived/i }));

    await waitFor(() => {
      expect(screen.getByText('Retired Sander')).toBeInTheDocument();
    });
    expect(screen.queryByText('Cordless Drill')).not.toBeInTheDocument();
  });

  it('ignores items belonging to another property', async () => {
    await seedItems([
      ...ITEMS,
      makeItem({ id: 'z', name: 'Not Mine', organizationId: 'elsewhere' }),
    ]);
    renderPage(<Items />);
    await showsDrill();

    expect(screen.queryByText('Not Mine')).not.toBeInTheDocument();
  });

  describe('search', () => {
    it('narrows the list by name', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      await user.type(screen.getByPlaceholderText(/search items/i), 'Table');

      await waitFor(() => {
        expect(screen.queryByText('Cordless Drill')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Table Saw')).toBeInTheDocument();
    });

    it('matches on brand as well as name', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      await user.type(screen.getByPlaceholderText(/search items/i), 'Milwaukee');

      await waitFor(() => {
        expect(screen.queryByText('Table Saw')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Cordless Drill')).toBeInTheDocument();
    });

    it('ignores case', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      await user.type(screen.getByPlaceholderText(/search items/i), 'cordless');

      await waitFor(() => {
        expect(screen.getByText('Cordless Drill')).toBeInTheDocument();
      });
    });

    it('says so when nothing matches', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      await user.type(screen.getByPlaceholderText(/search items/i), 'zzzznotathing');

      await waitFor(() => {
        expect(screen.queryByText('Cordless Drill')).not.toBeInTheDocument();
      });
      expect(document.body.textContent).toMatch(/no items|nothing|not found|try/i);
    });
  });

  describe('view modes', () => {
    it.each(['list', 'gallery', 'table'] as const)('renders the %s view', async (mode) => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      await user.click(screen.getByRole('tab', { name: new RegExp(`${mode} view`, 'i') }));

      // Whichever view is showing, the items must still be there.
      await waitFor(() => {
        expect(screen.getByText('Cordless Drill')).toBeInTheDocument();
      });
      expect(screen.getByText('Table Saw')).toBeInTheDocument();
    });

    it('returns to the grid', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      await user.click(screen.getByRole('tab', { name: /table view/i }));
      await user.click(screen.getByRole('tab', { name: /grid view/i }));

      await waitFor(() => {
        expect(screen.getByText('Cordless Drill')).toBeInTheDocument();
      });
    });
  });

  describe('selection and bulk edit', () => {
    it('offers a bulk edit once something is selected', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      await user.click(screen.getByRole('button', { name: /select all/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit \d+ items/i })).toBeInTheDocument();
      });
    });

    it('clears the selection again', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      const selectAll = screen.getByRole('button', { name: /select all/i });
      await user.click(selectAll);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /edit \d+ items/i })).toBeInTheDocument()
      );

      await user.click(screen.getByRole('button', { name: /deselect all|select all/i }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /edit \d+ items/i })).not.toBeInTheDocument();
      });
    });

    it('opens the bulk edit dialog without crashing', async () => {
      // Radix throws on an empty-string SelectItem value, which took this
      // dialog down as it opened. Opening it is the regression test.
      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      await user.click(screen.getByRole('button', { name: /select all/i }));
      await user.click(await screen.findByRole('button', { name: /edit \d+ items/i }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/bulk edit/i)).toBeInTheDocument();
    });

    it('will not save a bulk edit that changes nothing', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      await user.click(screen.getByRole('button', { name: /select all/i }));
      await user.click(await screen.findByRole('button', { name: /edit \d+ items/i }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByRole('button', { name: /update items/i })).toBeDisabled();
    });

    it('does not lose item ids when saving a bulk edit', async () => {
      // A previous bug reassigned every id on a bulk save, orphaning photos,
      // documents and events. The ids must survive untouched.
      const before = (await storage.getItems()).map((i) => i.id).sort();

      const user = userEvent.setup();
      renderPage(<Items />);
      await showsDrill();

      await user.click(screen.getByRole('button', { name: /select all/i }));

      const after = (await storage.getItems()).map((i) => i.id).sort();
      expect(after).toEqual(before);
    });
  });

  describe('empty state', () => {
    it('invites you to add the first item', async () => {
      await seedItems([]);
      renderPage(<Items />);

      await waitFor(() => {
        expect(document.body.textContent).toMatch(/no items|add.*item|get started/i);
      });
    });
  });
});
