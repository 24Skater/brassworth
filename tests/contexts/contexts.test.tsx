import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';
import { RolesProvider, useRoles } from '@/contexts/RolesContext';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { seed, TEST_ORG, TEST_USER } from '../helpers/renderPage';
import { storage } from '@/lib/storage';
import {
  hasMigratedToIndexedDB,
  migrateLocalStorageToIndexedDB,
  autoMigrateIfNeeded,
} from '@/lib/storage/migration';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>
        <OrganizationProvider>
          <RolesProvider>{children}</RolesProvider>
        </OrganizationProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('OrganizationContext', () => {
  beforeEach(async () => {
    await seed();
  });

  it('loads the properties the signed-in person belongs to', async () => {
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.organizations).toHaveLength(1);
    });
    expect(result.current.currentOrg?.name).toBe('Test Workshop');
  });

  it('creates a property and selects it', async () => {
    const { result } = renderHook(() => useOrganization(), { wrapper });
    await waitFor(() => expect(result.current.organizations).toHaveLength(1));

    await act(async () => {
      await result.current.createOrganization('Second Shop', 'home');
    });

    await waitFor(() => {
      expect(result.current.organizations).toHaveLength(2);
    });
    expect(await storage.getOrganizations()).toHaveLength(2);
  });

  it('gives a created property a membership, so it is not orphaned', async () => {
    const { result } = renderHook(() => useOrganization(), { wrapper });
    await waitFor(() => expect(result.current.organizations).toHaveLength(1));

    await act(async () => {
      await result.current.createOrganization('Second Shop', 'home');
    });

    await waitFor(async () => {
      const memberships = await storage.getMemberships();
      expect(memberships.filter((m) => m.userId === TEST_USER.id)).toHaveLength(2);
    });
  });

  it('renames a property', async () => {
    const { result } = renderHook(() => useOrganization(), { wrapper });
    await waitFor(() => expect(result.current.organizations).toHaveLength(1));

    await act(async () => {
      await result.current.updateOrganization(TEST_ORG.id, { name: 'Renamed Shop' });
    });

    await waitFor(() => {
      expect(result.current.organizations[0]?.name).toBe('Renamed Shop');
    });
  });

  it('deletes a property', async () => {
    const { result } = renderHook(() => useOrganization(), { wrapper });
    await waitFor(() => expect(result.current.organizations).toHaveLength(1));

    await act(async () => {
      await result.current.deleteOrganization(TEST_ORG.id);
    });

    await waitFor(() => {
      expect(result.current.organizations).toHaveLength(0);
    });
  });

  it('switches the selected property', async () => {
    const { result } = renderHook(() => useOrganization(), { wrapper });
    await waitFor(() => expect(result.current.organizations).toHaveLength(1));

    await act(async () => {
      await result.current.createOrganization('Second Shop', 'home');
    });
    await waitFor(() => expect(result.current.organizations).toHaveLength(2));

    const second = result.current.organizations.find((o) => o.name === 'Second Shop');
    act(() => {
      result.current.setCurrentOrg(second ?? null);
    });

    expect(result.current.currentOrg?.name).toBe('Second Shop');
  });

  it('shows no properties to somebody who is signed out', async () => {
    await seed({ signedOut: true });
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.organizations).toHaveLength(0);
    });
  });

  it('hides a property the signed-in person is not a member of', async () => {
    await storage.setOrganizations([
      TEST_ORG,
      {
        id: 'someone-elses',
        name: 'Not Mine',
        type: 'home',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.organizations).toHaveLength(1);
    });
    expect(result.current.organizations[0]?.id).toBe(TEST_ORG.id);
  });
});

describe('RolesContext', () => {
  beforeEach(async () => {
    await seed();
  });

  it('reads the signed-in person as an admin of the selected property', async () => {
    const { result } = renderHook(() => useRoles(), { wrapper });

    await waitFor(() => {
      expect(result.current.userRole).toBe('ADMIN');
    });
  });

  it('grants an admin the permissions an admin holds', async () => {
    const { result } = renderHook(() => useRoles(), { wrapper });
    await waitFor(() => expect(result.current.userRole).toBe('ADMIN'));

    expect(result.current.hasPermission('canDeleteItems')).toBe(true);
    expect(result.current.hasPermission('canManageUsers')).toBe(true);
  });

  it('refuses a viewer the permissions a viewer does not hold', async () => {
    const { result } = renderHook(() => useRoles(), { wrapper });
    await waitFor(() => expect(result.current.userRole).toBe('ADMIN'));

    act(() => {
      result.current.setUserRole(TEST_USER.id, TEST_ORG.id, 'VIEWER');
    });

    await waitFor(() => {
      expect(result.current.userRole).toBe('VIEWER');
    });
    expect(result.current.hasPermission('canDeleteItems')).toBe(false);
  });

  it('reads back a role it was given', async () => {
    const { result } = renderHook(() => useRoles(), { wrapper });
    await waitFor(() => expect(result.current.userRole).toBe('ADMIN'));

    act(() => {
      result.current.setUserRole('somebody-else', TEST_ORG.id, 'MANAGER');
    });

    expect(result.current.getUserRole('somebody-else', TEST_ORG.id)).toBe('MANAGER');
  });

  it('lists everybody with a role on the property', async () => {
    const { result } = renderHook(() => useRoles(), { wrapper });
    await waitFor(() => expect(result.current.userRole).toBe('ADMIN'));

    act(() => {
      result.current.setUserRole('somebody-else', TEST_ORG.id, 'VIEWER');
    });

    expect(result.current.getUserRolesInOrg(TEST_ORG.id).length).toBeGreaterThanOrEqual(2);
  });

  it('removes a role', async () => {
    const { result } = renderHook(() => useRoles(), { wrapper });
    await waitFor(() => expect(result.current.userRole).toBe('ADMIN'));

    act(() => {
      result.current.setUserRole('somebody-else', TEST_ORG.id, 'VIEWER');
      result.current.removeUserRole('somebody-else', TEST_ORG.id);
    });

    expect(result.current.getUserRole('somebody-else', TEST_ORG.id)).toBeNull();
  });

  it('gives somebody with no role no permissions at all', async () => {
    await seed({ withoutOrg: true });
    const { result } = renderHook(() => useRoles(), { wrapper });

    await waitFor(() => {
      expect(result.current.hasPermission('canDeleteItems')).toBe(false);
    });
  });
});

describe('ThemeProvider', () => {
  function ThemeProbe() {
    const { theme, setTheme } = useTheme();
    return (
      <div>
        <span data-testid="theme">{theme}</span>
        <button onClick={() => setTheme('dark')}>Go dark</button>
        <button onClick={() => setTheme('light')}>Go light</button>
      </div>
    );
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('starts on the default it was given', () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey="probe-theme">
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('switches theme and puts the class on the document', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="light" storageKey="probe-theme">
        <ThemeProbe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Go dark' }));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('remembers the choice for next time', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="light" storageKey="probe-theme">
        <ThemeProbe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Go dark' }));

    expect(localStorage.getItem('probe-theme')).toBe('dark');
  });

  it('picks up a choice made in an earlier visit', () => {
    localStorage.setItem('probe-theme', 'dark');

    render(
      <ThemeProvider defaultTheme="light" storageKey="probe-theme">
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('drops the old class when switching back', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="dark" storageKey="probe-theme">
        <ThemeProbe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Go light' }));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});

describe('storage migration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('has not migrated on a fresh install', () => {
    expect(hasMigratedToIndexedDB()).toBe(false);
  });

  it('does nothing, and claims nothing, when there is no data to move', async () => {
    await migrateLocalStorageToIndexedDB();

    // No data means no migration happened, so the flag must stay unset —
    // otherwise a later real migration would be skipped.
    expect(hasMigratedToIndexedDB()).toBe(false);
  });

  it('moves existing data into IndexedDB and records that it did', async () => {
    localStorage.setItem(
      'brassworth_organizations',
      JSON.stringify([
        {
          id: 'org-1',
          name: 'Migrated Shop',
          type: 'home',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ])
    );

    await migrateLocalStorageToIndexedDB();

    expect(hasMigratedToIndexedDB()).toBe(true);
  });

  it('leaves localStorage alone when the provider is not IndexedDB', async () => {
    localStorage.setItem('brassworth_organizations', JSON.stringify([]));

    await autoMigrateIfNeeded('localstorage');

    expect(hasMigratedToIndexedDB()).toBe(false);
  });

  it('does not migrate twice', async () => {
    localStorage.setItem('brassworth_migrated_to_indexeddb', 'true');
    localStorage.setItem('brassworth_organizations', JSON.stringify([{ id: 'x' }]));

    // A second run would re-import and could duplicate rows.
    await autoMigrateIfNeeded('indexeddb');

    expect(hasMigratedToIndexedDB()).toBe(true);
  });
});
