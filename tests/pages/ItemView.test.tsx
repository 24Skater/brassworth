import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemView from '@/pages/ItemView';
import { storage } from '@/lib/storage';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';

async function seedItem(overrides: Partial<Parameters<typeof storage.createItem>[0]> = {}) {
  return storage.createItem({
    organizationId: TEST_ORG.id,
    name: 'Cordless Drill',
    brand: 'DEWALT',
    model: 'DCD791D2',
    condition: 'GOOD',
    quantity: 1,
    isArchived: false,
    tags: [],
    ...overrides,
  });
}

describe('ItemView', () => {
  beforeEach(async () => {
    await seed();
  });

  it('shows the item identity and its status', async () => {
    const item = await seedItem();

    renderPage(<ItemView />, { route: `/items/${item.id}`, path: '/items/:id' });

    expect(await screen.findByRole('heading', { name: 'Cordless Drill' })).toBeInTheDocument();
    expect(screen.getByText(/DEWALT/)).toBeInTheDocument();
    expect(screen.getByText(/DCD791D2/)).toBeInTheDocument();

    // Scoped to the page header: ItemLifecycle renders its own status badge
    // further down the page, so an unscoped query would match twice once its
    // history card has loaded.
    const header = screen.getByTestId('item-header');
    expect(within(header).getByText('In possession')).toBeInTheDocument();
  });

  it('offers a link to the edit form', async () => {
    const item = await seedItem();

    renderPage(<ItemView />, { route: `/items/${item.id}`, path: '/items/:id' });

    const edit = await screen.findByRole('link', { name: /edit/i });
    expect(edit).toHaveAttribute('href', `/items/${item.id}/edit`);
  });

  it('derives status from the event log rather than the item', async () => {
    const item = await seedItem();
    await storage.createItemEvent({
      itemId: item.id,
      organizationId: TEST_ORG.id,
      type: 'LOANED_OUT',
      occurredAt: new Date().toISOString(),
      counterparty: 'Sam',
    });

    renderPage(<ItemView />, { route: `/items/${item.id}`, path: '/items/:id' });

    // STATUS_LABELS.LOANED is "Loaned out", not "Lent out" — confirmed in
    // src/lib/lifecycle/index.ts. Scoped to the header for the same reason as
    // above: ItemLifecycle shows its own copy of the same badge.
    const header = await screen.findByTestId('item-header');
    expect(await within(header).findByText('Loaned out')).toBeInTheDocument();
  });

  it('shows the history and value summary once the item exists', async () => {
    const item = await seedItem({ purchasePrice: 249, purchaseDate: '2022-01-01' });

    renderPage(<ItemView />, { route: `/items/${item.id}`, path: '/items/:id' });

    expect(await screen.findByText(/history/i)).toBeInTheDocument();
    expect(await screen.findByTestId('value-summary')).toBeInTheDocument();
  });

  it('says so when the item does not exist', async () => {
    renderPage(<ItemView />, { route: '/items/missing', path: '/items/:id' });

    await waitFor(() => {
      expect(screen.getByText(/could not be found/i)).toBeInTheDocument();
    });
  });
  it('refuses an item belonging to another property', async () => {
    // Item ids are printed on stickers and passed around, so arriving with one
    // from another property is ordinary. Rendering it would let the lifecycle
    // panel write events tagged with whichever property happens to be selected.
    const item = await seedItem({ organizationId: 'some-other-org' });

    renderPage(<ItemView />, { route: `/items/${item.id}`, path: '/items/:id' });

    expect(await screen.findByText(/could not be found/i)).toBeInTheDocument();
  });

  it('explains itself when the item cannot be loaded', async () => {
    // In server mode this is being offline with nothing cached, which is the
    // situation this release exists for. It used to render a white screen.
    const item = await seedItem();
    // Restore this spy specifically. vi.restoreAllMocks() also tears down the
    // matchMedia stub that tests/setup.ts installs, which breaks whichever
    // test happens to run next rather than this one.
    const getItem = vi.spyOn(storage, 'getItem').mockRejectedValue(new Error('offline'));

    try {
      renderPage(<ItemView />, { route: `/items/${item.id}`, path: '/items/:id' });

      expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to items/i })).toBeInTheDocument();
    } finally {
      getItem.mockRestore();
    }
  });

  it('asks for a property rather than hiding the actions', async () => {
    await seed({ withoutOrg: true });
    const item = await seedItem();

    renderPage(<ItemView />, { route: `/items/${item.id}`, path: '/items/:id' });

    expect(await screen.findByText(/no property selected/i)).toBeInTheDocument();
  });
});
