import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';
import { storage } from '@/lib/storage';
import type { Item } from '@/types';
import Dashboard from '@/pages/Dashboard';
import Items from '@/pages/Items';
import ItemForm from '@/pages/ItemForm';
import Wishlist from '@/pages/Wishlist';
import Settings from '@/pages/Settings';
import Auth from '@/pages/Auth';

function item(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    organizationId: TEST_ORG.id,
    name: `Item ${id}`,
    condition: 'GOOD',
    quantity: 1,
    isArchived: false,
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Dashboard', () => {
  beforeEach(async () => {
    await seed();
  });

  it('invites you to create a property when there is none', async () => {
    await seed({ withoutOrg: true });
    renderPage(<Dashboard />);

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/welcome to brassworth|create your first/i);
    });
  });

  it('totals what the collection is worth', async () => {
    await storage.setItems([item('a', { purchasePrice: 200 }), item('b', { purchasePrice: 350 })]);

    renderPage(<Dashboard />);

    // Purchase value and estimated value both read 550 with no depreciation set.
    await waitFor(() => {
      expect(screen.getAllByText(/550\.00/).length).toBeGreaterThan(0);
    });
  });

  it('breaks value down by brand', async () => {
    const user = userEvent.setup();
    await storage.setItems([item('a', { brand: 'Milwaukee', purchasePrice: 200 })]);

    renderPage(<Dashboard />);

    const breakdown = await screen.findByTestId('value-breakdown');
    await user.click(within(breakdown).getByRole('tab', { name: /brand/i }));

    expect(await within(breakdown).findByText('Milwaukee')).toBeInTheDocument();
  });

  it('flags an overdue loan', async () => {
    await storage.setItems([item('a', { name: 'Nail Gun' })]);
    await storage.setItemEvents([
      {
        id: 'e1',
        itemId: 'a',
        organizationId: TEST_ORG.id,
        type: 'LOANED_OUT',
        occurredAt: '2020-01-01T00:00:00.000Z',
        expectedBackOn: '2020-02-01T00:00:00.000Z',
        counterparty: 'Chris',
        createdAt: '2020-01-01T00:00:00.000Z',
      },
    ]);

    renderPage(<Dashboard />);

    const overdue = await screen.findByTestId('overdue-card');
    expect(overdue).toHaveTextContent('Nail Gun');
    expect(overdue).toHaveTextContent('Chris');
  });

  it('hides the overdue card when nothing is late', async () => {
    await storage.setItems([item('a')]);
    renderPage(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByTestId('overdue-card')).not.toBeInTheDocument();
    });
  });
});

describe('Items', () => {
  beforeEach(async () => {
    await seed();
  });

  it('asks for a property when none is selected', async () => {
    await seed({ withoutOrg: true });
    renderPage(<Items />);

    expect(await screen.findByText(/no property selected/i)).toBeInTheDocument();
  });

  it('lists the items in the property', async () => {
    await storage.setItems([item('a', { name: 'Cordless Drill' }), item('b', { name: 'Router' })]);

    renderPage(<Items />);

    expect(await screen.findByText('Cordless Drill')).toBeInTheDocument();
    expect(screen.getByText('Router')).toBeInTheDocument();
  });

  it('narrows the list by search', async () => {
    const user = userEvent.setup();
    await storage.setItems([item('a', { name: 'Cordless Drill' }), item('b', { name: 'Router' })]);

    renderPage(<Items />);
    await screen.findByText('Cordless Drill');

    await user.type(screen.getByPlaceholderText(/search/i), 'Drill');

    await waitFor(() => {
      expect(screen.queryByText('Router')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Cordless Drill')).toBeInTheDocument();
  });

  it('shows a status badge for an item that is out', async () => {
    await storage.setItems([item('a', { name: 'Loaned Drill' })]);
    await storage.setItemEvents([
      {
        id: 'e1',
        itemId: 'a',
        organizationId: TEST_ORG.id,
        type: 'LOANED_OUT',
        occurredAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    renderPage(<Items />);

    expect(await screen.findByText('Loaned out')).toBeInTheDocument();
  });

  it('excludes another property items', async () => {
    await storage.setItems([item('a', { organizationId: 'elsewhere', name: 'Not Mine' })]);

    renderPage(<Items />);

    await waitFor(() => {
      expect(screen.queryByText('Not Mine')).not.toBeInTheDocument();
    });
  });
});

describe('ItemForm', () => {
  beforeEach(async () => {
    await seed();
  });

  it('opens an empty form for a new item', async () => {
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    expect(await screen.findByRole('heading', { name: /add new item/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toHaveValue('');
  });

  it('creates an item', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.type(await screen.findByLabelText(/^name/i), 'Angle Grinder');
    await user.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items.some((i) => i.name === 'Angle Grinder')).toBe(true);
    });
  });

  it('loads an existing item for editing', async () => {
    await storage.setItems([item('abc', { name: 'Existing Drill', purchasePrice: 249 })]);

    // The edit form now lives at /items/:id/edit; /items/:id is ItemView. The
    // route pattern below still needs a param named :id for useParams to work.
    renderPage(<ItemForm />, { route: '/items/abc/edit', path: '/items/:id/edit' });

    expect(await screen.findByRole('heading', { name: /edit item/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText(/^name/i)).toHaveValue('Existing Drill');
    });
  });

  it('reveals depreciation fields only for the method that needs them', async () => {
    // Asserted through the rendered state rather than by driving the Select.
    // Radix renders its listbox in a portal with pointer APIs jsdom lacks; the
    // interactive path is covered end to end in a real browser instead.
    await storage.setItems([item('none', { depreciationMethod: 'NONE' })]);
    const { unmount } = renderPage(<ItemForm />, {
      route: '/items/none/edit',
      path: '/items/:id/edit',
    });

    await screen.findByRole('heading', { name: /edit item/i });
    expect(screen.queryByLabelText(/useful life/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/value lost per year/i)).not.toBeInTheDocument();
    unmount();

    await storage.setItems([
      item('sl', { depreciationMethod: 'STRAIGHT_LINE', usefulLifeMonths: 48 }),
    ]);
    renderPage(<ItemForm />, { route: '/items/sl/edit', path: '/items/:id/edit' });

    expect(await screen.findByLabelText(/useful life/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/value it never drops below/i)).toBeInTheDocument();
  });

  it('shows the rate field for declining balance, as a percentage', async () => {
    await storage.setItems([
      item('db', { depreciationMethod: 'DECLINING_BALANCE', declineRatePerYear: 0.2 }),
    ]);

    renderPage(<ItemForm />, { route: '/items/db/edit', path: '/items/:id/edit' });

    // Stored as a fraction, shown as a percentage — nobody thinks in 0.2.
    const rate = await screen.findByLabelText(/value lost per year/i);
    await waitFor(() => {
      expect(rate).toHaveValue(20);
    });
  });
});

describe('Wishlist', () => {
  beforeEach(async () => {
    await seed();
  });

  it('asks for a property when none is selected', async () => {
    await seed({ withoutOrg: true });
    renderPage(<Wishlist />);

    expect(await screen.findByText(/no property selected/i)).toBeInTheDocument();
  });

  it('starts empty', async () => {
    renderPage(<Wishlist />);
    expect(await screen.findByText(/nothing on the list yet/i)).toBeInTheDocument();
  });

  it('shows an entry with its savings progress', async () => {
    await storage.setWishlistEntries([
      {
        id: 'w1',
        organizationId: TEST_ORG.id,
        name: 'Table Saw',
        priority: 'HIGH',
        targetPrice: 1000,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
    await storage.setSavingsContributions([
      {
        id: 's1',
        wishlistEntryId: 'w1',
        organizationId: TEST_ORG.id,
        amount: 250,
        occurredAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    renderPage(<Wishlist />);

    expect(await screen.findByText('Table Saw')).toBeInTheDocument();
    expect(screen.getByText(/250\.00 saved/)).toBeInTheDocument();
    expect(screen.getByText(/750\.00 to go/)).toBeInTheDocument();
  });

  it('alerts when a recorded price is at or below the target', async () => {
    await storage.setWishlistEntries([
      {
        id: 'w1',
        organizationId: TEST_ORG.id,
        name: 'Table Saw',
        priority: 'HIGH',
        targetPrice: 1000,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
    await storage.setPriceObservations([
      {
        id: 'p1',
        wishlistEntryId: 'w1',
        organizationId: TEST_ORG.id,
        amount: 800,
        observedAt: '2024-02-01T00:00:00.000Z',
        source: 'MANUAL',
        createdAt: '2024-02-01T00:00:00.000Z',
      },
    ]);

    renderPage(<Wishlist />);

    const alerts = await screen.findByTestId('price-alerts');
    expect(alerts).toHaveTextContent('Table Saw');
    expect(alerts).toHaveTextContent('200.00 under your target');
  });

  it('adds an entry', async () => {
    const user = userEvent.setup();
    renderPage(<Wishlist />);

    await user.click(await screen.findByTestId('add-wish'));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/what is it/i), 'Impact Driver');
    await user.click(within(dialog).getByRole('button', { name: /^add$/i }));

    await waitFor(async () => {
      expect(await storage.getWishlistEntries()).toHaveLength(1);
    });
  });
});

describe('Settings', () => {
  beforeEach(async () => {
    await seed();
  });

  it('renders the settings tabs', async () => {
    renderPage(<Settings />);

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/settings|data|users|property/i);
    });
  });

  it('offers a full backup alongside the spreadsheet export', async () => {
    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /data/i }));

    expect(await screen.findByRole('button', { name: /download backup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export to excel/i })).toBeInTheDocument();
  });

  it('warns that data lives only in this browser', async () => {
    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /data/i }));

    expect(await screen.findByText(/clearing site data deletes it/i)).toBeInTheDocument();
  });
});

describe('Auth', () => {
  beforeEach(async () => {
    await seed({ signedOut: true });
  });

  it('offers login and sign up', async () => {
    renderPage(<Auth />);

    expect(await screen.findByRole('tab', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /sign up/i })).toBeInTheDocument();
  });

  it('switches to the sign up form', async () => {
    const user = userEvent.setup();
    renderPage(<Auth />);

    await user.click(await screen.findByRole('tab', { name: /sign up/i }));

    expect(await screen.findByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('refuses a password below the minimum length', async () => {
    const user = userEvent.setup();
    renderPage(<Auth />);

    await user.click(await screen.findByRole('tab', { name: /sign up/i }));
    await user.type(await screen.findByLabelText(/^name$/i), 'Someone');
    await user.type(screen.getByLabelText(/^email$/i), 'someone@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /^sign up$/i }));

    // No account is created.
    await waitFor(async () => {
      const stored = localStorage.getItem('brassworth_all_users');
      expect(stored === null || JSON.parse(stored).length === 0).toBe(true);
    });
  });
});

// Toast rendering is noisy in jsdom and not what these tests are about.
vi.mock('sonner', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));
