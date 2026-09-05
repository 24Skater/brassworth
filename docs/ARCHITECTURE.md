# Architecture Documentation

This document describes the architecture and design decisions of Brassworth.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Provider System](#provider-system)
4. [Data Flow](#data-flow)
5. [Component Structure](#component-structure)
6. [State Management](#state-management)
7. [Extension Points](#extension-points)

## System Overview

Brassworth is a client-side React application with a provider-based architecture that allows for flexible backend integration.

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│         React Application               │
│  ┌───────────────────────────────────┐  │
│  │      UI Components (shadcn/ui)    │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │      Context Providers            │  │
│  │  - AuthProvider                   │  │
│  │  - OrganizationProvider           │  │
│  │  - RolesProvider                  │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │      Provider Interfaces          │  │
│  │  - StorageProvider                │  │
│  │  - AuthProvider                   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │      Provider Implementations     │  │
│  │  - LocalStorageProvider           │  │
│  │  - IndexedDBProvider              │  │
│  │  - APIProvider (future)           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Architecture Patterns

### Provider Pattern

The application uses a provider pattern for:

- **Storage**: Abstract storage operations
- **Authentication**: Abstract authentication logic
- **Roles**: Abstract role management

This allows:

- Easy swapping of implementations
- Testing with mock providers
- Gradual migration to backend

### Context Pattern

React Context is used for:

- **AuthContext**: Current user and auth operations
- **OrganizationContext**: Current organization and operations
- **RolesContext**: Role-based permissions

### Component Composition

- **UI Components**: Reusable shadcn/ui components
- **Feature Components**: Business logic components
- **Page Components**: Route-level components

## Provider System

### Storage Provider

**Interface**: `StorageProvider`

**Implementations**:

- `LocalStorageProvider`: Browser localStorage (default)
- `IndexedDBProvider`: IndexedDB for larger storage
- `APIProvider`: Backend API (future)

**Usage**:

```typescript
import { getStorageProvider } from '@/lib/storage';

const provider = getStorageProvider();
const items = await provider.getItems();
```

### Auth Provider

**Interface**: `AuthProviderInterface`

**Implementations**:

- `LocalStorageAuthProvider`: Client-side auth (prototype)
- `APIAuthProvider`: Backend auth (future)

**Features**:

- User login/signup
- Session management
- User management

### Role Provider

**Interface**: `RoleProviderInterface`

**Features**:

- Role assignment
- Permission checking
- Role-based access control

## Data Flow

### Reading Data

```
User Action
  ↓
Component
  ↓
Context Hook (useAuth, useOrganization, etc.)
  ↓
Provider Implementation
  ↓
Storage Provider
  ↓
Data Source (localStorage/IndexedDB/API)
```

### Writing Data

```
User Action
  ↓
Component
  ↓
Context Hook
  ↓
Provider Implementation
  ↓
Storage Provider
  ↓
Data Source
  ↓
Context Update
  ↓
Component Re-render
```

## Component Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── auth/            # Authentication components
│   ├── items/           # Item-related components
│   ├── users/           # User management components
│   └── common/          # Shared components
├── contexts/            # React contexts
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and providers
│   ├── auth/            # Auth providers
│   ├── storage/         # Storage providers
│   └── utils/           # Utility functions
├── pages/               # Page components
└── types/               # TypeScript types
```

## State Management

### Local State

- **React useState**: Component-level state
- **React useReducer**: Complex component state

### Global State

- **React Context**: App-wide state (auth, org, roles)
- **TanStack Query**: Server state caching (when using API)

### Form State

- **React Hook Form**: Form state management
- **Zod**: Schema validation

## Extension Points

### Adding a New Storage Provider

1. Implement `StorageProvider` interface
2. Add to provider factory
3. Configure via environment variable

```typescript
class MyStorageProvider implements StorageProvider {
  async getItems(): Promise<Item[]> {
    // Implementation
  }
  // ... other methods
}
```

### Adding a New Auth Provider

1. Implement `AuthProviderInterface`
2. Add to auth provider factory
3. Configure via environment variable

### Adding Custom Features

1. Create feature components in `src/components/`
2. Add routes in `src/App.tsx`
3. Add types in `src/types/`
4. Update navigation if needed

## Security Architecture

### Client-Side Security

- Input sanitization (DOMPurify)
- XSS prevention
- CSRF protection (when using API)
- Rate limiting (client-side)

### Authentication Flow

```
User Login
  ↓
Auth Provider
  ↓
Password Validation
  ↓
Rate Limiting Check
  ↓
Session Creation
  ↓
Context Update
```

### Authorization Flow

```
User Action
  ↓
Component
  ↓
RolesContext.hasPermission()
  ↓
Permission Check
  ↓
Allow/Deny
```

## Performance Optimizations

### Code Splitting

- Route-based lazy loading
- Component lazy loading
- Vendor chunk splitting

### Caching

- React Query caching (API)
- Browser caching (static assets)
- IndexedDB caching (local data)

### Image Optimization

- Lazy loading
- Placeholder support
- Responsive images

## Testing Architecture

### Unit Tests

- Vitest for utilities
- React Testing Library for components

### Integration Tests

- Feature-level testing
- Provider testing

### E2E Tests

- Playwright for user flows
- Critical path testing

## Future Architecture

### Backend Integration

When adding a backend:

1. Implement API providers
2. Add API client
3. Update contexts to use API
4. Add authentication tokens
5. Implement real-time sync (optional)

### Microservices (Future)

Potential services:

- Auth service
- Storage service
- Notification service
- Analytics service

---

**Last Updated**: December 2024
