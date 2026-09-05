import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';
import { storage } from '@/lib/storage';
import Items from '@/pages/Items';
import type { Item } from '@/types';
import * as XLSX from 'xlsx';

// The export hands the workbook to XLSX, which writes the file itself. jsdom
// cannot save a file, so the write is stubbed and the rows it was given are
// what the tests assert on.
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

async function seedItems(items: Item[]): Promise<void> {
  await seed();
  await storage.setCategories([
    { id: 'c1', organizationId: TEST_ORG.id, name: 'Power Tools' },
    { id: 'c2', organizationId: TEST_ORG.id, name: 'Bench Tools' },
  ]);
  await storage.setLocations([{ id: 'l1', organizationId: TEST_ORG.id, name: 'Garage' }]);
  await storage.setItems(items);
}

describe('Items actions', () => {
  beforeEach(async () => {
    await seedItems([makeItem(), makeItem({ id: 'b', name: 'Table Saw', brand: 'DeWalt' })]);
  });

  describe('archiving', () => {
    it('archives an item rather than destroying it', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('button', { name: /archive cordless drill/i }));

      await waitFor(async () => {
        const item = (await storage.getItems()).find((i) => i.id === 'a');
        expect(item?.isArchived).toBe(true);
      });
    });

    it('keeps the archived item in storage', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('button', { name: /archive cordless drill/i }));

      await waitFor(async () => {
        expect(await storage.getItems()).toHaveLength(2);
      });
    });

    it('takes an archived item off the active list', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('button', { name: /archive cordless drill/i }));

      await waitFor(() => {
        expect(screen.queryByText('Cordless Drill')).not.toBeInTheDocument();
      });
    });

    it('restores an archived item', async () => {
      await seedItems([makeItem({ isArchived: true })]);
      const user = userEvent.setup();
      renderPage(<Items />);

      await user.click(await screen.findByRole('tab', { name: /archived/i }));
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('button', { name: /restore cordless drill/i }));

      await waitFor(async () => {
        const item = (await storage.getItems()).find((i) => i.id === 'a');
        expect(item?.isArchived).toBe(false);
      });
    });
  });

  describe('deleting', () => {
    it('asks before deleting', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('button', { name: /delete cordless drill/i }));

      expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
      // Nothing is gone until it is confirmed.
      expect(await storage.getItems()).toHaveLength(2);
    });

    it('deletes once confirmed', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('button', { name: /delete cordless drill/i }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: /delete/i }));

      await waitFor(async () => {
        const items = await storage.getItems();
        expect(items).toHaveLength(1);
        expect(items[0]?.id).toBe('b');
      });
    });

    it('keeps everything when cancelled', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('button', { name: /delete cordless drill/i }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

      await waitFor(async () => {
        expect(await storage.getItems()).toHaveLength(2);
      });
    });
  });

  describe('selecting one item at a time', () => {
    it('selects a single item', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('checkbox', { name: /select cordless drill/i }));

      expect(await screen.findByRole('button', { name: /edit 1 items/i })).toBeInTheDocument();
    });

    it('unselects it again', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      const box = screen.getByRole('checkbox', { name: /select cordless drill/i });
      await user.click(box);
      await screen.findByRole('button', { name: /edit 1 items/i });

      await user.click(box);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /edit \d+ items/i })).not.toBeInTheDocument();
      });
    });

    it('counts each item selected', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('checkbox', { name: /select cordless drill/i }));
      await user.click(screen.getByRole('checkbox', { name: /select table saw/i }));

      expect(await screen.findByRole('button', { name: /edit 2 items/i })).toBeInTheDocument();
    });
  });

  describe('exporting', () => {
    beforeEach(() => {
      vi.mocked(XLSX.writeFile).mockClear();
    });

    it('exports the visible items', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('button', { name: /^export$/i }));

      expect(XLSX.writeFile).toHaveBeenCalled();
    });

    it('names the file after the property', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.click(screen.getByRole('button', { name: /^export$/i }));

      const filename = vi.mocked(XLSX.writeFile).mock.calls[0]?.[1];
      expect(filename).toMatch(/Test Workshop.*items.*\.xlsx/);
    });

    it('exports only what the search left on screen', async () => {
      const user = userEvent.setup();
      renderPage(<Items />);
      await screen.findByText('Cordless Drill');

      await user.type(screen.getByPlaceholderText(/search items/i), 'Table');
      await waitFor(() => expect(screen.queryByText('Cordless Drill')).not.toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /^export$/i }));

      // The sheet holds the one row still showing, not everything in storage.
      const workbook = vi.mocked(XLSX.writeFile).mock.calls[0]?.[0];
      const sheet = workbook?.Sheets?.['Items'];
      const rows = sheet ? XLSX.utils.sheet_to_json(sheet) : [];
      expect(rows).toHaveLength(1);
      expect((rows[0] as { Name?: string })?.Name).toBe('Table Saw');
    });
  });
});
