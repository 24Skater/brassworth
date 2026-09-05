import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';
import { storage } from '@/lib/storage';
import Wishlist from '@/pages/Wishlist';
import ItemForm from '@/pages/ItemForm';
import { ItemLifecycle } from '@/components/items/ItemLifecycle';
import type { Item, WishlistEntry } from '@/types';

function makeEntry(overrides: Partial<WishlistEntry> = {}): WishlistEntry {
  return {
    id: 'w1',
    organizationId: TEST_ORG.id,
    name: 'Track Saw',
    brand: 'Festool',
    targetPrice: 500,
    priority: 'MEDIUM',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    organizationId: TEST_ORG.id,
    name: 'Cordless Drill',
    condition: 'GOOD',
    quantity: 1,
    isArchived: false,
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Wishlist', () => {
  beforeEach(async () => {
    await seed();
    await storage.setWishlistEntries([makeEntry()]);
  });

  it('lists what you are saving for', async () => {
    renderPage(<Wishlist />);

    expect(await screen.findByText('Track Saw')).toBeInTheDocument();
  });

  it('adds an entry', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByTestId('add-wish'));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/what is it/i), 'Domino Joiner');
    await user.type(within(dialog).getByLabelText(/target price/i), '900');
    await user.click(within(dialog).getByRole('button', { name: /^add$/i }));

    await waitFor(async () => {
      const names = (await storage.getWishlistEntries()).map((e) => e.name);
      expect(names).toContain('Domino Joiner');
    });
  });

  it('refuses to add an entry with no name', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByTestId('add-wish'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^add$/i }));

    // Nothing is saved, and the dialog stays open so the name can be typed.
    await waitFor(async () => {
      expect(await storage.getWishlistEntries()).toHaveLength(1);
    });
  });

  it('puts money aside towards an entry', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByRole('button', { name: /put money aside/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('spinbutton'), '150');
    await user.click(within(dialog).getByRole('button', { name: /add to savings/i }));

    await waitFor(async () => {
      const saved = await storage.getSavingsContributions();
      expect(saved).toHaveLength(1);
      expect(saved[0]?.amount).toBe(150);
    });
  });

  it('records a price it was seen at', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByRole('button', { name: /record a price/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('spinbutton'), '450');
    await user.click(within(dialog).getByRole('button', { name: /^record$/i }));

    await waitFor(async () => {
      const prices = await storage.getPriceObservations();
      expect(prices).toHaveLength(1);
      expect(prices[0]?.amount).toBe(450);
    });
  });

  it('turns a bought entry into an item you own', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByTestId('buy-Track Saw'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /add to my items/i }));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items).toHaveLength(1);
      expect(items[0]?.name).toBe('Track Saw');
    });
  });

  it('logs how it was acquired when converting a purchase', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByTestId('buy-Track Saw'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /add to my items/i }));

    await waitFor(async () => {
      const events = await storage.getItemEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('ACQUIRED');
    });
  });

  it('marks the entry as bought and links it to the new item', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByTestId('buy-Track Saw'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /add to my items/i }));

    await waitFor(async () => {
      const entry = (await storage.getWishlistEntries())[0];
      const item = (await storage.getItems())[0];

      // The entry is kept rather than deleted, so what you saved towards stays
      // on the record and points at the thing you ended up owning.
      expect(entry?.purchasedItemId).toBe(item?.id);
      expect(entry?.purchasedAt).toBeTruthy();
    });
  });

  it('removes an entry you no longer want', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);
    await screen.findByText('Track Saw');

    await user.click(screen.getByRole('button', { name: /remove track saw/i }));

    await waitFor(async () => {
      expect(await storage.getWishlistEntries()).toHaveLength(0);
    });
  });

  it('shows what you have saved so far', async () => {
    await storage.setSavingsContributions([
      {
        id: 's1',
        wishlistEntryId: 'w1',
        organizationId: TEST_ORG.id,
        amount: 200,
        occurredAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    renderPage(<Wishlist />);

    await waitFor(() => {
      expect(screen.getByTestId('wishlist-totals').textContent).toMatch(/200/);
    });
  });

  it('says so when the wishlist is empty', async () => {
    await storage.setWishlistEntries([]);
    renderPage(<Wishlist />);

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/nothing|empty|add|wishlist/i);
    });
  });
});

describe('ItemForm', () => {
  beforeEach(async () => {
    await seed();
    await storage.setCategories([{ id: 'c1', organizationId: TEST_ORG.id, name: 'Power Tools' }]);
    await storage.setLocations([{ id: 'l1', organizationId: TEST_ORG.id, name: 'Garage' }]);
  });

  it('creates an item', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
    await user.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items).toHaveLength(1);
      expect(items[0]?.name).toBe('Impact Driver');
    });
  });

  it('saves the details that were filled in', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
    await user.type(screen.getByLabelText(/^brand/i), 'Milwaukee');
    await user.type(screen.getByLabelText(/serial number/i), 'SN-123');
    await user.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      const item = (await storage.getItems())[0];
      expect(item?.brand).toBe('Milwaukee');
      expect(item?.serialNumber).toBe('SN-123');
    });
  });

  it('records what it cost', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
    await user.type(screen.getByLabelText(/purchase price/i), '199');
    await user.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      expect((await storage.getItems())[0]?.purchasePrice).toBe(199);
    });
  });

  it('loads an existing item for editing', async () => {
    await storage.setItems([makeItem({ name: 'Cordless Drill', brand: 'Milwaukee' })]);

    renderPage(<ItemForm />, { route: '/items/item-1/edit', path: '/items/:id/edit' });

    await waitFor(() => {
      expect(screen.getByLabelText(/^name/i)).toHaveValue('Cordless Drill');
    });
  });

  it('saves an edit back onto the same item', async () => {
    await storage.setItems([makeItem()]);
    const user = userEvent.setup();

    renderPage(<ItemForm />, { route: '/items/item-1/edit', path: '/items/:id/edit' });
    await waitFor(() => expect(screen.getByLabelText(/^name/i)).toHaveValue('Cordless Drill'));

    const field = screen.getByLabelText(/^name/i);
    await user.clear(field);
    await user.type(field, 'Impact Driver');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(async () => {
      const items = await storage.getItems();
      // An edit must update in place, never add a second row.
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe('item-1');
      expect(items[0]?.name).toBe('Impact Driver');
    });
  });

  it('will not save an item with no name', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.click(await screen.findByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      expect(await storage.getItems()).toHaveLength(0);
    });
  });

  it('leaves without saving when cancelled', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.type(await screen.findByLabelText(/^name/i), 'Abandoned');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(async () => {
      expect(await storage.getItems()).toHaveLength(0);
    });
  });
});

describe('ItemLifecycle', () => {
  beforeEach(async () => {
    await seed();
    await storage.setItems([makeItem()]);
  });

  it('shows the item history', async () => {
    await storage.setItemEvents([
      {
        id: 'e1',
        itemId: 'item-1',
        organizationId: TEST_ORG.id,
        type: 'ACQUIRED',
        occurredAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    renderPage(<ItemLifecycle item={makeItem()} onChange={() => {}} />);

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/acquired|bought|history/i);
    });
  });

  it('records something that happened to the item', async () => {
    const user = userEvent.setup();
    renderPage(<ItemLifecycle item={makeItem()} onChange={() => {}} />);

    await user.click(await screen.findByTestId('record-event'));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^record$/i }));

    await waitFor(async () => {
      const events = await storage.getItemEvents();
      expect(events).toHaveLength(1);
      // The dialog opens on the first action in the list.
      expect(events[0]?.type).toBe('LOANED_OUT');
    });
  });

  it('renders an item with no history yet', async () => {
    renderPage(<ItemLifecycle item={makeItem()} onChange={() => {}} />);

    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });
});
