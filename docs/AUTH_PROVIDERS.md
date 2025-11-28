# Authentication Provider Guide

This guide explains how to implement custom authentication providers for the Home Inventory application.

## Overview

The application uses a provider-based architecture for authentication, making it easy to swap out the authentication backend without changing the frontend code. By default, a localStorage-based provider is used for prototyping, but you can easily implement your own provider for production use.

## Provider Interface

All authentication providers must implement the `AuthProviderInterface`:

```typescript
interface AuthProviderInterface {
  login(email: string, password: string): Promise<{ user: User | null; error?: string }>;
  signup(email: string, password: string, name: string): Promise<{ user: User | null; error?: string }>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  validateSession(): Promise<boolean>;
  listUsers(): User[];
  inviteUser(email: string, name: string, organizationId: string, role: UserRole): Promise<{ user: User | null; error?: string }>;
  removeUser(userId: string, organizationId: string): Promise<{ success: boolean; error?: string }>;
}
```

## Creating a Custom Provider

### 1. Create Your Provider Class

Create a new file in `src/lib/auth/providers/`:

```typescript
// src/lib/auth/providers/myCustomProvider.ts
import { User, UserRole } from '@/types';
import { AuthProviderInterface } from '../types';

export class MyCustomAuthProvider implements AuthProviderInterface {
  // Implement all required methods
  async login(email: string, password: string) {
    // Your custom login logic
  }

  async signup(email: string, password: string, name: string) {
    // Your custom signup logic
  }

  async logout() {
    // Your custom logout logic
  }

  getCurrentUser(): User | null {
    // Return current user from your auth system
  }

  async validateSession(): Promise<boolean> {
    // Validate current session
  }

  listUsers(): User[] {
    // List all users in the system
  }

  async inviteUser(email: string, name: string, organizationId: string, role: UserRole) {
    // Invite a new user
  }

  async removeUser(userId: string, organizationId: string) {
    // Remove a user
  }
}
```

### 2. Update the Provider Factory

Edit `src/lib/auth/index.ts` to use your custom provider:

```typescript
import { MyCustomAuthProvider } from './providers/myCustomProvider';

export function createAuthProvider(): AuthProviderInterface {
  // You can use environment variables to switch providers
  const providerType = import.meta.env.VITE_AUTH_PROVIDER || 'localStorage';
  
  switch (providerType) {
    case 'custom':
      return new MyCustomAuthProvider();
    default:
      return new LocalStorageAuthProvider();
  }
}
```

### 3. Configure Environment Variables

Create or update your `.env` file:

```
VITE_AUTH_PROVIDER=custom
VITE_API_URL=https://your-api.example.com
```

## Example Implementations

### NextAuth Integration

```typescript
// src/lib/auth/providers/nextAuth.ts
import { signIn, signOut, useSession } from 'next-auth/react';
import { AuthProviderInterface } from '../types';

export class NextAuthProvider implements AuthProviderInterface {
  async login(email: string, password: string) {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { user: null, error: result.error };
    }

    return { user: this.getCurrentUser() };
  }

  async logout() {
    await signOut({ redirect: false });
  }

  getCurrentUser(): User | null {
    // Get user from NextAuth session
    const { data: session } = useSession();
    return session?.user || null;
  }

  // ... implement other methods
}
```

### REST API Backend

```typescript
// src/lib/auth/providers/apiBackend.ts
import { AuthProviderInterface } from '../types';

export class APIAuthProvider implements AuthProviderInterface {
  private apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { user: null, error: error.message };
    }

    const { user, token } = await response.json();
    localStorage.setItem('auth_token', token);
    return { user };
  }

  async logout() {
    await fetch(`${this.apiUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    localStorage.removeItem('auth_token');
  }

  getCurrentUser(): User | null {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    // Decode JWT or fetch user from API
    // Implementation depends on your backend
    return null;
  }

  // ... implement other methods
}
```

### LDAP/Active Directory

```typescript
// src/lib/auth/providers/ldap.ts
import { AuthProviderInterface } from '../types';

export class LDAPAuthProvider implements AuthProviderInterface {
  private ldapUrl: string;

  constructor() {
    this.ldapUrl = import.meta.env.VITE_LDAP_URL;
  }

  async login(email: string, password: string) {
    // Make API call to your LDAP authentication endpoint
    const response = await fetch(`${this.ldapUrl}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password }),
    });

    if (!response.ok) {
      return { user: null, error: 'Invalid credentials' };
    }

    const { user } = await response.json();
    
    // Store user session
    sessionStorage.setItem('ldap_user', JSON.stringify(user));
    
    return { user };
  }

  getCurrentUser(): User | null {
    const userData = sessionStorage.getItem('ldap_user');
    return userData ? JSON.parse(userData) : null;
  }

  // ... implement other methods
}
```

## Role Provider

Similarly, you can implement a custom `RoleProviderInterface`:

```typescript
interface RoleProviderInterface {
  getUserRole(userId: string, organizationId: string): UserRole | null;
  setUserRole(userId: string, organizationId: string, role: UserRole): void;
  removeUserRole(userId: string, organizationId: string): void;
  getUserRolesInOrg(organizationId: string): Array<{ userId: string; role: UserRole }>;
}
```

## Testing Your Provider

1. Create test users in your authentication system
2. Update the provider factory to use your custom provider
3. Test all authentication flows:
   - Login
   - Signup
   - Logout
   - Session persistence
   - Role assignment
   - Permission checks

## Security Considerations

1. **Never store passwords in plain text** - Always hash passwords server-side
2. **Use HTTPS in production** - Never send credentials over HTTP
3. **Implement rate limiting** - Prevent brute force attacks
4. **Use secure session storage** - HttpOnly cookies are preferred over localStorage for tokens
5. **Validate all inputs** - Sanitize email and password inputs
6. **Implement proper CORS** - Configure CORS policies for your API

## Deployment

### Self-Hosting with Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV VITE_AUTH_PROVIDER=custom
ENV VITE_API_URL=https://your-api.example.com
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Environment Variables

Common environment variables you may need:

```
# Auth Provider
VITE_AUTH_PROVIDER=custom

# API Configuration
VITE_API_URL=https://api.example.com
VITE_API_KEY=your-api-key

# LDAP Configuration (if using LDAP)
VITE_LDAP_URL=ldap://your-ldap-server.com
VITE_LDAP_BASE_DN=dc=example,dc=com

# OAuth Configuration (if using OAuth)
VITE_OAUTH_CLIENT_ID=your-client-id
VITE_OAUTH_REDIRECT_URI=https://your-app.com/callback
```

## Support

For questions or issues:
1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Join our [Discord community](https://discord.gg/your-invite)
3. Email support@example.com
