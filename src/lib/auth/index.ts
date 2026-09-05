import { LocalStorageAuthProvider, LocalStorageRoleProvider } from './providers/localStorage';
import { ApiAuthProvider, ApiRoleProvider } from './providers/api';
import { AuthProviderInterface, RoleProviderInterface } from './types';

/**
 * Auth follows storage.
 *
 * VITE_STORAGE_PROVIDER=api selects the server for both, deliberately: pairing
 * browser-side auth with server-side storage would mean the client asserting
 * an identity the server never checked, which is the exact confusion this tier
 * exists to end.
 */
function isApiTier(): boolean {
  return import.meta.env.VITE_STORAGE_PROVIDER === 'api';
}

let authProviderInstance: AuthProviderInterface | null = null;
let roleProviderInstance: RoleProviderInterface | null = null;

export function createAuthProvider(): AuthProviderInterface {
  authProviderInstance ??= isApiTier()
    ? new ApiAuthProvider({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? '' })
    : new LocalStorageAuthProvider();

  return authProviderInstance;
}

export function createRoleProvider(): RoleProviderInterface {
  roleProviderInstance ??= isApiTier() ? new ApiRoleProvider() : new LocalStorageRoleProvider();
  return roleProviderInstance;
}

/** Test seam, mirroring setStorageProvider. */
export function setAuthProvider(provider: AuthProviderInterface | null): void {
  authProviderInstance = provider;
}

export * from './types';
export * from './permissions';
