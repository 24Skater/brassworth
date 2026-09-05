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

## Planned backend architecture

Decided 2026-09. One codebase serves three deployment tiers.

### Three tiers, one image

| Tier                | Shape                                          | Auth                            | Data                                           |
| ------------------- | ---------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| **0 — Local only**  | No server. What ships today.                   | None. No accounts.              | IndexedDB in the browser                       |
| **1 — Self-hosted** | One container, one volume, `docker compose up` | Email + password; OIDC optional | SQLite by default, Postgres via `DATABASE_URL` |
| **2 — Hosted**      | The same image, run by us                      | Email + password, Google, OIDC  | Postgres, multi-tenant                         |

Tier 0 is not a stepping stone that gets removed. It is the privacy claim, and the reason
this project is worth open-sourcing. It stays supported.

### Stack

- **Hono** (or Fastify) for the API, in TypeScript — one language end to end, types shared
  with the React app
- **Drizzle ORM** — one schema compiles to both SQLite and Postgres, which is what lets a
  single codebase serve Tier 1 and Tier 2 without a fork
- **Better Auth** — email/password plus Google and generic OIDC, self-hostable, no vendor
  account required. Self-hosters who want local accounts only simply do not set the OAuth
  environment variables
- The built SPA is served statically by the same process

### Why not the alternatives

**Supabase** would be the fastest route to a hosted tier, but self-hosting it means running
a dozen containers. That makes Tier 1 _harder_, which is backwards for a project whose pitch
is self-hosting, and it shapes the open-source product around one vendor.

**Go or PocketBase** would give the best possible self-host story — a single static binary.
It costs a second language alongside a React frontend, a smaller shared contributor pool,
and SQLite-centric assumptions that complicate the hosted tier. The right call for a Go
shop; the wrong one here.

### Multi-tenancy

Every domain type already carries `organizationId` — `Item`, `Location`, `Category`, `Tag`,
`Document`. That is the hard part of multi-tenancy and it is already done.

The server's job is to stop trusting the client's claim about which organisation it is in.
One guard, called by every handler:

```ts
await requireOrgAccess(userId, orgId, 'canEditItems');
```

A client-supplied `organizationId` is never accepted without a membership check. This is the
point at which the four existing roles stop being decorative.

### Auth migration

Passwords are currently hashed with PBKDF2 **in the browser**. Those hashes are worthless
server-side — they were never a server credential. Hashing now happens on the server and
existing local accounts re-register.

**scrypt, not Argon2id.** Argon2 is the stronger first choice on paper, but every Node
binding for it is a native module, and this project's pitch to self-hosters is that running
it is easy. scrypt is OWASP's named second choice, is memory-hard, and ships in Node's
standard library — no compiler, no prebuilt-binary roulette on somebody's NAS. Parameters
follow the OWASP cheat sheet (N=2^17, r=8, p=1), and stored hashes are self-describing so
those parameters can change later without stranding anyone.

**Sessions are opaque tokens, not JWTs.** A JWT cannot be revoked without a denylist, which
is the same database round-trip a JWT exists to avoid — so it buys nothing here and costs
the ability to log someone out. Only the SHA-256 of a token is stored, so a leaked database
does not hand over usable sessions.

Sessions move from localStorage to httpOnly, SameSite cookies.

### Data migration

Tier 0 data lives in one browser's storage and cannot be automatically migrated to a server.
The path is export → upload → import, which is why **full export must ship before the first
public release** rather than after it. Without it, the earliest self-hosters are stranded.

### What to build, in order

1. ~~Remove the synchronous `src/lib/storage.ts` wrapper~~ — done
2. ~~Server, schema, and auth~~ — done, in `server/`
3. ~~Make the `api` provider case fail loudly~~ — done; it throws rather than quietly
   writing to localStorage behind an operator who configured a server
4. `ApiStorageProvider` implementing the existing `StorageProvider` interface
5. `ApiAuthProvider` implementing the existing `AuthProviderInterface`
6. Remaining tables: locations, categories, tags, photos, documents, user roles
7. Docker packaging, then OIDC — which _should_ use a library rather than being
   hand-rolled; the risky parts of auth are the flows, not the hashing

Both seams already exist, so application code barely changes.

### Server layout

`server/` sits beside `src/` with its own tsconfig, rather than restructuring into a
workspace monorepo. A monorepo would touch every path, the CI config and the Docker build
to buy nothing a solo pre-1.0 project needs yet.

```
server/
  app.ts            Hono routes and the composition root
  index.ts          Node entrypoint
  db/schema.ts      Drizzle schema
  db/index.ts       Connection and table creation
  auth/password.ts  scrypt hashing
  auth/session.ts   Token generation, hashing, cookie construction
  auth/access.ts    The permission matrix and requireOrgAccess
```

**libSQL, not better-sqlite3.** Both speak SQLite; better-sqlite3 is a native module that
has to compile or find a prebuilt binary, which is a support burden for a project whose
pitch is that self-hosting is easy.

---

**Last Updated**: September 2026
