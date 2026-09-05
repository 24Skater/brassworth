import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';
import { storage } from '@/lib/storage';
import Locations from '@/pages/Locations';
import Categories from '@/pages/Categories';
import Organizations from '@/pages/Organizations';

/**
 * The create, rename and delete paths on the simple management pages.
 *
 * These are the handlers a person touches most and the ones with the least
 * logic, which is exactly why nothing exercised them before: they are easy to
 * assume correct. Each test drives the real dialog and then asserts on storage,
 * so a handler that opens a dialog but never saves would fail here.
 */

describe('Locations', () => {
  beforeEach(async () => {
    await seed();
    await storage.setLocations([{ id: 'l1', organizationId: TEST_ORG.id, name: 'Garage' }]);
  });

  it('creates one', async () => {
    const user = userEvent.setup();
    renderPage(<Locations />);
    await screen.findByText('Garage');

    await user.click(screen.getByRole('button', { name: /add location/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/name/i), 'Basement');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(async () => {
      const names = (await storage.getLocations()).map((l) => l.name);
      expect(names).toContain('Basement');
    });
  });

  it('will not create one without a name', async () => {
    const user = userEvent.setup();
    renderPage(<Locations />);
    await screen.findByText('Garage');

    await user.click(screen.getByRole('button', { name: /add location/i }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByRole('button', { name: /^create$/i })).toBeDisabled();
  });

  it('renames one', async () => {
    const user = userEvent.setup();
    renderPage(<Locations />);
    await screen.findByText('Garage');

    await user.click(screen.getByRole('button', { name: /edit garage/i }));
    const dialog = await screen.findByRole('dialog');
    const field = within(dialog).getByLabelText(/name/i);
    await user.clear(field);
    await user.type(field, 'Workshop');
    await user.click(within(dialog).getByRole('button', { name: /save|update/i }));

    await waitFor(async () => {
      expect((await storage.getLocations())[0]?.name).toBe('Workshop');
    });
  });

  it('keeps the id when renaming, so items still point at it', async () => {
    const user = userEvent.setup();
    renderPage(<Locations />);
    await screen.findByText('Garage');

    await user.click(screen.getByRole('button', { name: /edit garage/i }));
    const dialog = await screen.findByRole('dialog');
    const field = within(dialog).getByLabelText(/name/i);
    await user.clear(field);
    await user.type(field, 'Workshop');
    await user.click(within(dialog).getByRole('button', { name: /save|update/i }));

    await waitFor(async () => {
      expect((await storage.getLocations())[0]?.id).toBe('l1');
    });
  });

  it('deletes one', async () => {
    const user = userEvent.setup();
    renderPage(<Locations />);
    await screen.findByText('Garage');

    await user.click(screen.getByRole('button', { name: /delete garage/i }));

    await waitFor(async () => {
      expect(await storage.getLocations()).toHaveLength(0);
    });
  });
});

describe('Categories', () => {
  beforeEach(async () => {
    await seed();
    await storage.setCategories([{ id: 'c1', organizationId: TEST_ORG.id, name: 'Power Tools' }]);
  });

  it('creates one', async () => {
    const user = userEvent.setup();
    renderPage(<Categories />);
    await screen.findByText('Power Tools');

    await user.click(screen.getByRole('button', { name: /add category/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/name/i), 'Fasteners');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(async () => {
      const names = (await storage.getCategories()).map((c) => c.name);
      expect(names).toContain('Fasteners');
    });
  });

  it('renames one', async () => {
    const user = userEvent.setup();
    renderPage(<Categories />);
    await screen.findByText('Power Tools');

    await user.click(screen.getByRole('button', { name: /edit power tools/i }));
    const dialog = await screen.findByRole('dialog');
    const field = within(dialog).getByLabelText(/name/i);
    await user.clear(field);
    await user.type(field, 'Bench Tools');
    await user.click(within(dialog).getByRole('button', { name: /save|update/i }));

    await waitFor(async () => {
      expect((await storage.getCategories())[0]?.name).toBe('Bench Tools');
    });
  });

  it('deletes one', async () => {
    const user = userEvent.setup();
    renderPage(<Categories />);
    await screen.findByText('Power Tools');

    await user.click(screen.getByRole('button', { name: /delete power tools/i }));

    await waitFor(async () => {
      expect(await storage.getCategories()).toHaveLength(0);
    });
  });

  it('leaves another property’s categories alone when deleting', async () => {
    await storage.setCategories([
      { id: 'c1', organizationId: TEST_ORG.id, name: 'Power Tools' },
      { id: 'c2', organizationId: 'somewhere-else', name: 'Theirs' },
    ]);

    const user = userEvent.setup();
    renderPage(<Categories />);
    await screen.findByText('Power Tools');

    await user.click(screen.getByRole('button', { name: /delete power tools/i }));

    await waitFor(async () => {
      const remaining = await storage.getCategories();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe('c2');
    });
  });
});

describe('Organizations', () => {
  beforeEach(async () => {
    await seed();
  });

  it('creates one', async () => {
    const user = userEvent.setup();
    renderPage(<Organizations />);
    await waitFor(() => expect(screen.getAllByText('Test Workshop').length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: /create property/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/name/i), 'Second Shop');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(async () => {
      const names = (await storage.getOrganizations()).map((o) => o.name);
      expect(names).toContain('Second Shop');
    });
  });

  it('gives a new property a membership, so it is reachable', async () => {
    const user = userEvent.setup();
    renderPage(<Organizations />);
    await waitFor(() => expect(screen.getAllByText('Test Workshop').length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: /create property/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/name/i), 'Second Shop');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(async () => {
      expect(await storage.getMemberships()).toHaveLength(2);
    });
  });

  it('renames one', async () => {
    const user = userEvent.setup();
    renderPage(<Organizations />);
    await waitFor(() => expect(screen.getAllByText('Test Workshop').length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: /edit test workshop/i }));
    const dialog = await screen.findByRole('dialog');
    const field = within(dialog).getByLabelText(/name/i);
    await user.clear(field);
    await user.type(field, 'Renamed Shop');
    await user.click(within(dialog).getByRole('button', { name: /save|update/i }));

    await waitFor(async () => {
      expect((await storage.getOrganizations())[0]?.name).toBe('Renamed Shop');
    });
  });

  it('deletes one', async () => {
    const user = userEvent.setup();
    renderPage(<Organizations />);
    await waitFor(() => expect(screen.getAllByText('Test Workshop').length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: /delete test workshop/i }));

    await waitFor(async () => {
      expect(await storage.getOrganizations()).toHaveLength(0);
    });
  });
});

describe('the storage facade', () => {
  beforeEach(async () => {
    await seed();
  });

  it('creates a single item without disturbing the rest', async () => {
    await storage.setItems([
      {
        id: 'existing',
        organizationId: TEST_ORG.id,
        name: 'Existing',
        condition: 'GOOD',
        quantity: 1,
        isArchived: false,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const created = await storage.createItem({
      organizationId: TEST_ORG.id,
      name: 'New Drill',
      condition: 'NEW',
      quantity: 1,
      isArchived: false,
      tags: [],
    });

    const items = await storage.getItems();
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.id === 'existing')).toBeTruthy();
    expect(created.name).toBe('New Drill');
  });

  it('deletes a single item', async () => {
    const created = await storage.createItem({
      organizationId: TEST_ORG.id,
      name: 'Doomed',
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
    });

    await storage.deleteItem(created.id);

    expect(await storage.getItems()).toHaveLength(0);
  });

  it('records an item event', async () => {
    const event = await storage.createItemEvent({
      itemId: 'item-1',
      organizationId: TEST_ORG.id,
      type: 'ACQUIRED',
      occurredAt: '2024-01-01T00:00:00.000Z',
    });

    expect(event.id).toBeTruthy();
    expect(await storage.getItemEvents()).toHaveLength(1);
  });

  it('reads the events of one item', async () => {
    await storage.createItemEvent({
      itemId: 'item-1',
      organizationId: TEST_ORG.id,
      type: 'ACQUIRED',
      occurredAt: '2024-01-01T00:00:00.000Z',
    });
    await storage.createItemEvent({
      itemId: 'item-2',
      organizationId: TEST_ORG.id,
      type: 'ACQUIRED',
      occurredAt: '2024-01-01T00:00:00.000Z',
    });

    expect(await storage.getItemEventsByItem('item-1')).toHaveLength(1);
  });
});
