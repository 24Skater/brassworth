import { LocalStorageAuthProvider, LocalStorageRoleProvider } from './providers/localStorage';
import { AuthProviderInterface, RoleProviderInterface } from './types';

// Factory function to create auth provider
// In the future, this can be extended to support different providers based on config
export function createAuthProvider(): AuthProviderInterface {
  // For now, always return localStorage provider
  // Future: Check environment variable or config to determine provider
  return new LocalStorageAuthProvider();
}

export function createRoleProvider(): RoleProviderInterface {
  return new LocalStorageRoleProvider();
}

export * from './types';
export * from './permissions';
