import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { RolesProvider } from '@/contexts/RolesContext';
import { setStorageProvider, storage } from '@/lib/storage';
import { LocalStorageProvider } from '@/lib/storage/providers/localStorageProvider';
import type { Organization, User } from '@/types';

/**
 * Render a page inside the real provider stack, on real local storage.
 *
 * Deliberately not a mocked wrapper. Pages spend most of their code reading and
 * writing through the storage facade, so a mock here would exercise the mock.
 * This mirrors App.tsx, seeds a signed-in user and a selected property, and
 * lets the page do exactly what it does in the browser.
 */

export const TEST_USER: User = {
  id: 'test-user',
  email: 'tester@example.com',
  name: 'Tester',
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const TEST_ORG: Organization = {
  id: 'test-org',
  name: 'Test Workshop',
  type: 'home',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export interface SeedOptions {
  /** Sign nobody in, to exercise the signed-out path. */
  signedOut?: boolean;
  /** Skip creating a property, to exercise the "no property selected" path. */
  withoutOrg?: boolean;
}

/** Put a signed-in user and a selected property into storage. */
export async function seed(options: SeedOptions = {}): Promise<void> {
  // Start from nothing, so calling seed() again inside a test genuinely
  // replaces the world rather than layering on what the last call wrote.
  localStorage.clear();
  setStorageProvider(new LocalStorageProvider());

  if (!options.signedOut) {
    // The local auth provider reads the session and user list directly.
    localStorage.setItem('inventory_user', JSON.stringify(TEST_USER));
    localStorage.setItem(
      'inventory_all_users',
      JSON.stringify([{ ...TEST_USER, passwordHash: 'x', passwordSalt: 'y' }])
    );
    localStorage.setItem(
      'inventory_session',
      JSON.stringify({
        userId: TEST_USER.id,
        token: 'test-token',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        rememberMe: false,
      })
    );
  }

  if (!options.withoutOrg) {
    await storage.setOrganizations([TEST_ORG]);
    await storage.setMemberships([
      { id: 'membership-1', userId: TEST_USER.id, organizationId: TEST_ORG.id },
    ]);
    localStorage.setItem(
      'inventory_user_roles',
      JSON.stringify([
        { id: 'role-1', userId: TEST_USER.id, organizationId: TEST_ORG.id, role: 'ADMIN' },
      ])
    );
  }
}

function Providers({ children }: { children: ReactNode }) {
  // A fresh client per render, so cached queries cannot leak between tests.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return (
    <ThemeProvider defaultTheme="light" storageKey="test-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <OrganizationProvider>
              <RolesProvider>{children}</RolesProvider>
            </OrganizationProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export interface RenderPageOptions {
  /** The address to start at, e.g. `/items/abc`. */
  route?: string;
  /** The route pattern, when the page reads params, e.g. `/items/:id`. */
  path?: string;
}

export function renderPage(
  element: ReactElement,
  { route = '/', path }: RenderPageOptions = {}
): RenderResult {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Providers>
        {path ? (
          <Routes>
            <Route path={path} element={element} />
          </Routes>
        ) : (
          element
        )}
      </Providers>
    </MemoryRouter>
  );
}
