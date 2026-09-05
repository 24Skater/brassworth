import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, act, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, seed, TEST_ORG } from '../helpers/renderPage';
import Settings from '@/pages/Settings';
import { storage } from '@/lib/storage';
import * as XLSX from 'xlsx';

// Both downloads hand off to a writer that saves a file, which jsdom cannot do.
vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return { ...actual, writeFile: vi.fn() };
});
import { useToast, toast, reducer } from '@/hooks/use-toast';

describe('Settings', () => {
  beforeEach(async () => {
    await seed();
  });

  it('opens on the users tab', async () => {
    renderPage(<Settings />);

    expect(await screen.findByRole('tab', { name: /users/i })).toBeInTheDocument();
  });

  it('offers every section', async () => {
    renderPage(<Settings />);

    for (const name of [/users/i, /organization/i, /data/i, /security/i]) {
      expect(await screen.findByRole('tab', { name })).toBeInTheDocument();
    }
  });

  it('shows the property details on the organization tab', async () => {
    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /organization/i }));

    const nameField = await screen.findByLabelText(/organization name/i);
    expect(nameField).toHaveValue(TEST_ORG.name);
  });

  it('renames the property', async () => {
    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /organization/i }));
    const nameField = await screen.findByLabelText(/organization name/i);

    await user.clear(nameField);
    await user.type(nameField, 'Renamed Workshop');

    expect(nameField).toHaveValue('Renamed Workshop');
  });

  it('offers a backup on the data tab', async () => {
    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /data/i }));

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/backup|export|restore/i);
    });
  });

  it('names the restore control, so it is reachable without a mouse', async () => {
    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /data/i }));

    expect(await screen.findByLabelText(/choose a backup file to restore/i)).toBeInTheDocument();
  });

  it('shows the security section', async () => {
    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /security/i }));

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/password|session|security|sign/i);
    });
  });

  it('lists the people on the property', async () => {
    renderPage(<Settings />);

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/tester@example\.com|tester/i);
    });
  });

  it('renders when no property is selected', async () => {
    await seed({ withoutOrg: true });

    expect(() => renderPage(<Settings />)).not.toThrow();
  });

  it('saves a renamed property', async () => {
    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /organization/i }));
    const field = await screen.findByLabelText(/organization name/i);
    await user.clear(field);
    await user.type(field, 'Renamed Workshop');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(async () => {
      expect((await storage.getOrganizations())[0]?.name).toBe('Renamed Workshop');
    });
  });

  it('keeps the property id when renaming, so nothing is orphaned', async () => {
    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /organization/i }));
    const field = await screen.findByLabelText(/organization name/i);
    await user.clear(field);
    await user.type(field, 'Renamed Workshop');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(async () => {
      expect((await storage.getOrganizations())[0]?.id).toBe(TEST_ORG.id);
    });
  });

  it('downloads a backup', async () => {
    const createObjectURL = vi.fn(() => 'blob:backup');
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = vi.fn();

    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /data/i }));
    await user.click(await screen.findByRole('button', { name: /download backup/i }));

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled();
    });
  });

  it('exports the inventory to a spreadsheet', async () => {
    await storage.setItems([
      {
        id: 'i1',
        organizationId: TEST_ORG.id,
        name: 'Cordless Drill',
        condition: 'GOOD',
        quantity: 1,
        isArchived: false,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /data/i }));
    await user.click(await screen.findByRole('button', { name: /export to excel/i }));

    await waitFor(() => {
      expect(XLSX.writeFile).toHaveBeenCalled();
    });
  });

  it('clears nothing when the confirmation is declined', async () => {
    await storage.setLocations([{ id: 'l1', organizationId: TEST_ORG.id, name: 'Garage' }]);
    // This page guards with the native confirm(), which jsdom does not implement.
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /data/i }));
    await user.click(await screen.findByRole('button', { name: /clear all data/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(await storage.getLocations()).toHaveLength(1);
  });

  it('clears this property’s data once confirmed', async () => {
    await storage.setLocations([{ id: 'l1', organizationId: TEST_ORG.id, name: 'Garage' }]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /data/i }));
    await user.click(await screen.findByRole('button', { name: /clear all data/i }));

    await waitFor(async () => {
      expect(await storage.getLocations()).toHaveLength(0);
    });
  });

  it('leaves another property’s data alone when clearing', async () => {
    await storage.setLocations([
      { id: 'l1', organizationId: TEST_ORG.id, name: 'Mine' },
      { id: 'l2', organizationId: 'somewhere-else', name: 'Theirs' },
    ]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    renderPage(<Settings />);

    await user.click(await screen.findByRole('tab', { name: /data/i }));
    await user.click(await screen.findByRole('button', { name: /clear all data/i }));

    await waitFor(async () => {
      const left = await storage.getLocations();
      expect(left).toHaveLength(1);
      expect(left[0]?.id).toBe('l2');
    });
  });
});

describe('use-toast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a toast that was raised', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Saved' });
    });

    expect(result.current.toasts[0]?.title).toBe('Saved');
  });

  it('dismisses a toast by id', () => {
    const { result } = renderHook(() => useToast());

    let id = '';
    act(() => {
      id = toast({ title: 'Saved' }).id;
    });

    act(() => {
      result.current.dismiss(id);
    });

    expect(result.current.toasts[0]?.open).toBe(false);
  });

  it('dismisses every toast at once', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'One' });
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts.every((t) => t.open === false)).toBe(true);
  });

  it('updates a toast already on screen', () => {
    const { result } = renderHook(() => useToast());

    let handle: { id: string; update: (props: { id: string; title: string }) => void };
    act(() => {
      handle = toast({ title: 'Working' }) as typeof handle;
    });

    act(() => {
      handle.update({ id: handle.id, title: 'Done' });
    });

    expect(result.current.toasts[0]?.title).toBe('Done');
  });

  describe('reducer', () => {
    it('adds a toast', () => {
      const state = reducer({ toasts: [] }, { type: 'ADD_TOAST', toast: { id: '1', open: true } });

      expect(state.toasts).toHaveLength(1);
    });

    it('keeps only the newest toast, so they do not stack up', () => {
      let state = reducer({ toasts: [] }, { type: 'ADD_TOAST', toast: { id: '1', open: true } });
      state = reducer(state, { type: 'ADD_TOAST', toast: { id: '2', open: true } });

      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0]?.id).toBe('2');
    });

    it('updates a toast in place', () => {
      const state = reducer(
        { toasts: [{ id: '1', open: true, title: 'Before' }] },
        { type: 'UPDATE_TOAST', toast: { id: '1', title: 'After' } }
      );

      expect(state.toasts[0]?.title).toBe('After');
    });

    it('closes a toast rather than removing it, so it can animate out', () => {
      const state = reducer(
        { toasts: [{ id: '1', open: true }] },
        { type: 'DISMISS_TOAST', toastId: '1' }
      );

      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0]?.open).toBe(false);
    });

    it('removes a toast', () => {
      const state = reducer(
        { toasts: [{ id: '1', open: false }] },
        { type: 'REMOVE_TOAST', toastId: '1' }
      );

      expect(state.toasts).toHaveLength(0);
    });

    it('removes every toast when given no id', () => {
      const state = reducer(
        { toasts: [{ id: '1', open: false }] },
        { type: 'REMOVE_TOAST', toastId: undefined }
      );

      expect(state.toasts).toHaveLength(0);
    });
  });
});
