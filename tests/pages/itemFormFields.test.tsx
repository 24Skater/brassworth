import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';
import { storage } from '@/lib/storage';
import ItemForm from '@/pages/ItemForm';

/**
 * The fields on the item form that are dropdowns rather than text boxes.
 *
 * These drive real Radix selects. jsdom has no pointer capture or layout, so
 * the shared setup stubs what Radix reaches for; without that these widgets
 * cannot be opened at all and the handlers behind them go untested.
 */

async function pick(user: ReturnType<typeof userEvent.setup>, label: RegExp, option: RegExp) {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('ItemForm dropdowns', () => {
  beforeEach(async () => {
    await seed();
    await storage.setCategories([
      { id: 'c1', organizationId: TEST_ORG.id, name: 'Power Tools' },
      { id: 'c2', organizationId: TEST_ORG.id, name: 'Bench Tools' },
    ]);
    await storage.setLocations([
      { id: 'l1', organizationId: TEST_ORG.id, name: 'Garage' },
      { id: 'l2', organizationId: TEST_ORG.id, name: 'Office' },
    ]);
  });

  it('files an item under a category', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
    await pick(user, /^category/i, /power tools/i);
    await user.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      expect((await storage.getItems())[0]?.categoryId).toBe('c1');
    });
  });

  it('puts an item in a location', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
    await pick(user, /^location/i, /garage/i);
    await user.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      expect((await storage.getItems())[0]?.locationId).toBe('l1');
    });
  });

  it('records the condition it is in', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
    await pick(user, /^condition/i, /^fair$/i);
    await user.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      expect((await storage.getItems())[0]?.condition).toBe('FAIR');
    });
  });

  describe('depreciation', () => {
    it('does not estimate a value by default', async () => {
      const user = userEvent.setup();
      renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

      await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
      await user.click(screen.getByRole('button', { name: /create item/i }));

      await waitFor(async () => {
        const item = (await storage.getItems())[0];
        expect(item?.depreciationMethod ?? 'NONE').toBe('NONE');
      });
    });

    it('asks for a useful life when depreciating in a straight line', async () => {
      const user = userEvent.setup();
      renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

      await screen.findByLabelText(/^name/i);
      await pick(user, /how should value be estimated/i, /straight/i);

      // The field only makes sense for this method, so it appears with it.
      expect(await screen.findByLabelText(/useful life/i)).toBeInTheDocument();
    });

    it('saves a straight line depreciation setting', async () => {
      const user = userEvent.setup();
      renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

      await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
      await pick(user, /how should value be estimated/i, /straight/i);
      await user.type(await screen.findByLabelText(/useful life/i), '60');
      await user.click(screen.getByRole('button', { name: /create item/i }));

      await waitFor(async () => {
        const item = (await storage.getItems())[0];
        expect(item?.depreciationMethod).toBe('STRAIGHT_LINE');
        expect(item?.usefulLifeMonths).toBe(60);
      });
    });

    it('asks for a rate when depreciating on a declining balance', async () => {
      const user = userEvent.setup();
      renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

      await screen.findByLabelText(/^name/i);
      await pick(user, /how should value be estimated/i, /declining/i);

      expect(await screen.findByLabelText(/value lost per year/i)).toBeInTheDocument();
    });

    it('swaps the fields when the method changes', async () => {
      const user = userEvent.setup();
      renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

      await screen.findByLabelText(/^name/i);
      await pick(user, /how should value be estimated/i, /straight/i);
      await screen.findByLabelText(/useful life/i);

      await pick(user, /how should value be estimated/i, /declining/i);

      await waitFor(() => {
        expect(screen.queryByLabelText(/useful life/i)).not.toBeInTheDocument();
      });
      expect(screen.getByLabelText(/value lost per year/i)).toBeInTheDocument();
    });

    it('takes a value the item never drops below', async () => {
      const user = userEvent.setup();
      renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

      await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
      await pick(user, /how should value be estimated/i, /straight/i);
      await user.type(await screen.findByLabelText(/useful life/i), '60');
      await user.type(await screen.findByLabelText(/never drops below/i), '25');
      await user.click(screen.getByRole('button', { name: /create item/i }));

      await waitFor(async () => {
        expect((await storage.getItems())[0]?.salvageValue).toBe(25);
      });
    });

    it('lets a value be set by hand', async () => {
      const user = userEvent.setup();
      renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

      await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
      await pick(user, /how should value be estimated/i, /manual|by hand/i);
      await user.type(screen.getByLabelText(/current estimated value/i), '150');
      await user.click(screen.getByRole('button', { name: /create item/i }));

      await waitFor(async () => {
        const item = (await storage.getItems())[0];
        expect(item?.depreciationMethod).toBe('MANUAL');
        expect(item?.currentEstimatedValue).toBe(150);
      });
    });
  });

  it('records how many of the thing there are', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.type(await screen.findByLabelText(/^name/i), 'Drill Bits');
    // A number input in jsdom has no text selection, so typing would append to
    // the 1 already there. Set the value outright, which runs the same handler.
    const quantity = screen.getByLabelText(/^quantity/i);
    fireEvent.change(quantity, { target: { value: '12' } });
    await user.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      expect((await storage.getItems())[0]?.quantity).toBe(12);
    });
  });

  it('records when it was bought', async () => {
    const user = userEvent.setup();
    renderPage(<ItemForm />, { route: '/items/new', path: '/items/new' });

    await user.type(await screen.findByLabelText(/^name/i), 'Impact Driver');
    await user.type(screen.getByLabelText(/purchase date/i), '2024-06-01');
    await user.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(async () => {
      expect((await storage.getItems())[0]?.purchaseDate).toBe('2024-06-01');
    });
  });
});
