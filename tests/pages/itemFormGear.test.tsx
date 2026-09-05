import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';
import { storage } from '@/lib/storage';
import ItemForm from '@/pages/ItemForm';

/**
 * Gear profiles on the item form, through the real page and real storage.
 *
 * The rules being pinned here are the ones that decide whether the feature is
 * helpful or infuriating: a profile fills what is blank and argues with
 * nothing, and the link is what gets saved rather than a copy of the specs.
 */

// The form asks the server for an optional vendor catalogue. There is no server
// in these tests, and the answer "none configured" is the normal case.
const originalFetch = globalThis.fetch;

beforeEach(async () => {
  await seed();
  globalThis.fetch = vi.fn(
    async () => new Response(JSON.stringify({ configured: false }))
  ) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function openNewItemForm() {
  renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });
  return screen.findByLabelText('Gear profile');
}

async function link(user: ReturnType<typeof userEvent.setup>, query: string, label: string) {
  await user.type(await screen.findByLabelText('Gear profile'), query);
  await user.click(await screen.findByRole('button', { name: new RegExp(label, 'i') }));
}

describe('ItemForm gear profiles', () => {
  it('searches the bundled catalogue', async () => {
    const user = userEvent.setup();
    await openNewItemForm();

    await user.type(screen.getByLabelText('Gear profile'), 'makita');
    expect(await screen.findByText('Makita XPH12Z')).toBeInTheDocument();
  });

  it('fills blank brand and model when a profile is linked', async () => {
    const user = userEvent.setup();
    await openNewItemForm();

    await link(user, 'DCD791', 'DeWalt DCD791D2');

    await waitFor(() => expect(screen.getByLabelText('Brand')).toHaveValue('DeWalt'));
    expect(screen.getByLabelText('Model')).toHaveValue('DCD791D2');
  });

  it('does not overwrite a brand the user already typed', async () => {
    const user = userEvent.setup();
    await openNewItemForm();

    await user.type(screen.getByLabelText('Brand'), 'DEWALT (used)');
    await link(user, 'DCD791', 'DeWalt DCD791D2');

    await waitFor(() => expect(screen.getByTestId('gear-profile-selected')).toBeInTheDocument());
    expect(screen.getByLabelText('Brand')).toHaveValue('DEWALT (used)');
  });

  it('shows the model specifications once linked', async () => {
    const user = userEvent.setup();
    await openNewItemForm();

    await link(user, 'DCD791', 'DeWalt DCD791D2');

    const panel = await screen.findByTestId('gear-profile-panel');
    expect(panel).toHaveTextContent('Battery platform');
    expect(panel).toHaveTextContent('20V MAX XR');
  });

  it('saves the link rather than a copy of the specifications', async () => {
    const user = userEvent.setup();
    await openNewItemForm();

    await link(user, 'DCD791', 'DeWalt DCD791D2');
    await user.type(screen.getByLabelText(/^Name/), 'Site drill');
    await user.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items[0]?.gearProfileId).toBe('catalogue:dewalt::dcd791d2');
    });

    const items = await storage.getItems();
    expect(items[0]).not.toHaveProperty('specs');
    expect(items[0]?.organizationId).toBe(TEST_ORG.id);
  });

  it('unlinks without clearing what the profile filled in', async () => {
    const user = userEvent.setup();
    await openNewItemForm();

    await link(user, 'DCD791', 'DeWalt DCD791D2');
    await user.click(await screen.findByLabelText('Unlink gear profile'));

    await waitFor(() => expect(screen.getByLabelText('Gear profile')).toBeInTheDocument());
    // Unlinking is not an undo — the filled-in value is now the user's own.
    expect(screen.getByLabelText('Brand')).toHaveValue('DeWalt');
  });

  it('offers the data plate scanner', async () => {
    await openNewItemForm();
    expect(screen.getByRole('button', { name: /scan data plate/i })).toBeInTheDocument();
  });

  it('reads a profile that the organisation wrote itself, alongside the catalogue', async () => {
    await storage.setGearProfiles([
      {
        id: 'mine',
        organizationId: TEST_ORG.id,
        brand: 'Acme',
        model: 'AP-100',
        productType: 'Bench grinder',
        specs: [],
        source: 'USER',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ] as never);

    const user = userEvent.setup();
    await openNewItemForm();

    await user.type(screen.getByLabelText('Gear profile'), 'acme');
    expect(await screen.findByText('Acme AP-100')).toBeInTheDocument();
  });

  it('does not offer another organisation profiles', async () => {
    await storage.setGearProfiles([
      {
        id: 'theirs',
        organizationId: 'some-other-org',
        brand: 'Acme',
        model: 'AP-100',
        specs: [],
        source: 'USER',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ] as never);

    const user = userEvent.setup();
    await openNewItemForm();

    await user.type(screen.getByLabelText('Gear profile'), 'acme');
    expect(await screen.findByText(/Nothing in the catalogue matches/i)).toBeInTheDocument();
  });
});
