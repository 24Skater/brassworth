# Extending Brassworth

Two seams carry almost all of the flexibility in this codebase: **where data lives** and
**who the user is**. Everything above them — every page, every component, the entire
domain layer — runs unchanged over any implementation of either.

That is not an accident, and it is not speculative generality. It is what lets
local-first mode be a real, permanent, first-class tier rather than a demo, while the
same application also runs against a server with real accounts.

> Two documents that used to describe these interfaces, `AUTH_PROVIDERS.md` and
> `STORAGE_PROVIDERS.md`, published signatures that were wrong and examples that
> imported a file which had been deleted. They have been removed. **This document is
> generated from reading `src/lib/storage/types.ts` and `src/lib/auth/types.ts`. If it
> disagrees with them, they are right and this is a bug — please report it.**

---

## The storage seam

### The contract

`StorageProvider` in [`src/lib/storage/types.ts`](../src/lib/storage/types.ts) is large,
because it covers every entity the app knows about. Roughly 85 methods across these
groups:

| Group                 | Shape                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------- |
| User                  | `getUser`, `setUser`, `getUsers`, `getUserWithAuth`, `createUser`, `updateUser`, `deleteUser` |
| Organizations         | `getOrganizations`, `getOrganization`, `create`, `update`, `delete`                           |
| Memberships           | `getMemberships`, `getMembershipsByOrg`, `create`, `delete`                                   |
| User roles            | `getUserRoles`, `getUserRole`, `getUserRolesByOrg`, `setUserRole`, `deleteUserRole`           |
| Locations             | full CRUD, plus `getLocationsByOrg`                                                           |
| Categories            | full CRUD, plus `getCategoriesByOrg`                                                          |
| Tags                  | full CRUD, plus `getTagsByOrg`                                                                |
| Items                 | full CRUD, plus `getItemsByOrg`                                                               |
| Item events           | `getItemEvents`, `getItemEventsByItem`, `createItemEvent`, `deleteItemEventsByItem`           |
| Wishlist entries      | full CRUD                                                                                     |
| Savings contributions | `get`, `getByEntry`, `create`, `deleteByEntry`                                                |
| Price observations    | `get`, `getByEntry`, `create`, `deleteByEntry`                                                |
| Gear profiles         | full CRUD                                                                                     |
| Photos                | full CRUD, plus `getPhotosByItem`                                                             |
| Documents             | full CRUD, plus `getDocumentsByItem`, `getDocumentsByOrg`                                     |
| Whole-store           | `replaceCollection`, `exportData`, `importData`, `clearAll`                                   |

Three properties are worth noticing before you implement one.

**Everything is async.** There was once a synchronous wrapper over the provider; it was
removed, because a synchronous interface cannot be backed by anything but browser
storage, which meant the seam was a seam in name only.

**Append-only collections have no update method.** `createItemEvent` exists;
`updateItemEvent` does not. Same for savings contributions and price observations. That
is the append-only invariant expressed in the type system rather than in a comment — a
provider that adds an update method is breaking a product rule, not extending an
interface.

**Deletion of dependent rows is explicit.** `deleteItemEventsByItem`,
`deleteSavingsContributionsByEntry` and `deletePriceObservationsByEntry` exist because
browser storage has no cascading delete. A server-backed provider can lean on foreign
keys, but it still has to honour the method.

### The three implementations

| Provider               | File                                                | When                                                                                                                                                     |
| ---------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LocalStorageProvider` | `src/lib/storage/providers/localStorageProvider.ts` | **The default.** One JSON array per `brassworth_*` key. Simple and inspectable; capped around 5 MB per origin, which a photo-heavy catalogue will reach. |
| `IndexedDBProvider`    | `src/lib/storage/providers/indexedDBProvider.ts`    | Opt-in. Dexie over a database named `BrassworthDB`, schema v1 to v5. Far more room. Migrates existing localStorage data across on first use.             |
| `ApiStorageProvider`   | `src/lib/storage/providers/apiProvider.ts`          | Talks to the server. What the Docker image builds with.                                                                                                  |

> Storage keys are namespaced `brassworth_*`, the Dexie database is `BrassworthDB`,
> and the theme key is `brassworth-theme`. These are a public contract with data
> already on disk: renaming one orphans it silently, with no error and no obvious
> symptom beyond an app that looks freshly installed. If you ever change one, ship a
> migration in the same pull request.

### The factory

```ts
// src/lib/storage/index.ts
const providerType = import.meta.env.VITE_STORAGE_PROVIDER || 'localStorage';
```

`localStorage` | `indexeddb` | `api`. Anything unrecognised warns and falls back to
`localStorage`. Note the spelling of `indexeddb` — all lowercase.

The instance is a module-level singleton. `getStorageProvider()` returns it, and
`setStorageProvider()` replaces it, which is how tests inject a fake.

### Adding a provider

1. Implement `StorageProvider`. All of it — the interface is not optional in parts, and
   a page you have not looked at will call the method you skipped.
2. Add a case to the switch in `createStorageProvider()`.
3. Add the new value to the `StorageProviderType` union in `types.ts`.
4. Test it against the same suite the existing providers pass. `tests/lib/storage/`
   holds tests written against the interface rather than against an implementation,
   which is the point.
5. Document the new value in `.env.example` and in
   [SELF_HOSTING.md](./SELF_HOSTING.md).

---

## The auth seam

### The contract

`AuthProviderInterface` in [`src/lib/auth/types.ts`](../src/lib/auth/types.ts):

```ts
login(email: string, password: string, rememberMe?: boolean):
  Promise<{ user: User | null; error?: string }>;
signup(email: string, password: string, name: string):
  Promise<{ user: User | null; error?: string }>;
logout(): Promise<void>;
getCurrentUser(): User | null;
validateSession(): Promise<boolean>;
refreshSession(): Promise<boolean>;
getSession(): Session | null;
listUsers(): User[];
inviteUser(email: string, name: string, organizationId: string, role: UserRole):
  Promise<{ user: User | null; error?: string }>;
removeUser(userId: string, organizationId: string):
  Promise<{ success: boolean; error?: string }>;
```

Two details the old documentation omitted and that will bite you: `login` takes
`rememberMe`, and there are three session methods, not one. `getCurrentUser` and
`getSession` are **synchronous** — they read whatever the provider is already holding —
while `validateSession` and `refreshSession` are async because they may have to ask a
server.

Errors are returned, not thrown. A provider that throws on a wrong password will crash
the sign-in screen rather than showing a message.

There is a second, smaller interface alongside it, `RoleProviderInterface`, for reading
and writing role assignments.

### Why storage and auth switch together

There is no `VITE_AUTH_PROVIDER`. One variable picks both:

```ts
// src/lib/auth/index.ts
function isApiTier(): boolean {
  return import.meta.env.VITE_STORAGE_PROVIDER === 'api';
}
```

This is deliberate. Pairing browser-side authentication with server-side storage would
mean the client asserting an identity that the server never checked — every request
arriving with a user id the browser simply made up. The two are one decision, so they
are one switch.

### What each implementation actually does

**`LocalStorageAuthProvider`** hashes passwords with PBKDF2-SHA256 at 100,000 iterations
with a 16-byte per-user salt, compares in constant time, and upgrades accounts still
carrying the pre-salt bare-SHA-256 hash on their next successful sign-in. It rate-limits
sign-in attempts: five, then escalating lockouts of 1, 5, 15 and 60 minutes, persisted
in IndexedDB so a page refresh does not clear them.

None of that makes local-first mode a security boundary, and it is important to be
clear about why. The hashing protects the _password_ — which people reuse — against
someone reading browser storage. It does nothing about authorisation, because the page
itself writes the records that say who you are and what you may do. Anyone with
devtools can promote themselves. See [SECURITY.md](../SECURITY.md).

**`ApiAuthProvider`** delegates to the server and holds no credentials at all. The
session is an httpOnly cookie the script cannot read, which is the whole point.

### Permissions

`Permission` is a union of ten strings in `src/lib/auth/types.ts`, and the role matrix
lives in `src/lib/auth/permissions.ts`. **It is duplicated on the server** in
`server/auth/access.ts`, deliberately: the client copy decides what to render, the
server copy decides what is allowed. A test keeps the two in step, and if you change one
you must change the other or that test fails.

The full matrix is in [DATA_MODEL.md](./DATA_MODEL.md).

Use `PermissionGate` or the `usePermission` hook to hide UI a role cannot use. Hiding a
button is a courtesy, never a control — the control is the server check.

---

## Performance seams

These exist and are worth knowing about. Nothing aspirational is listed here.

**Route-level code splitting.** All twelve pages are `React.lazy` imports in
`src/App.tsx`. A new page should follow suit.

**Manual vendor chunks** in `vite.config.ts`: React, Radix, TanStack Query, form
libraries and date utilities are split into separate chunks so a change to application
code does not invalidate all of them.

**`LazyImage`** in `src/components/common/` defers off-screen images.

**Hooks** in `src/hooks/` for debouncing and for observing intersection, so scroll work
does not run on every frame.

**`npm run analyze`** builds with `rollup-plugin-visualizer` and opens a treemap. Use it
before assuming where the weight is.

Two genuinely heavy dependencies are worth respecting: **Tesseract.js**, which powers
receipt and data-plate OCR, and **pdf.js**. Both are loaded only on the paths that use
them. Do not import either at module top level in a component that renders on every
page.

> Known weight: `xlsx` is 425 KB and carries two unfixed high advisories with no
> upgrade path. Replacing it would fix a security gate and a bundle budget at the same
> time, and is one of the more valuable contributions available right now.

TanStack Query is on v5 here. If you are copying configuration from an older tutorial,
note that `cacheTime` was renamed `gcTime` in v5 — the old name is silently ignored.

---

## Accessibility seams

Also real, also short.

**`SkipLink`** in `src/components/common/` gives keyboard users a way past the
navigation.

**`ErrorBoundary`** catches render failures and shows detail only in development.

**axe-core** runs in development only, via `@axe-core/react` in `src/main.tsx`. Console
warnings from it are real findings, not noise.

**Query by role in tests.** `getByRole('button', { name: /save/i })` rather than a test
id or a class name. A test that passes only because it found a `div` is a test that
would pass on a component no screen reader can use. This is the project's testing
convention as much as its accessibility one — see [TESTING.md](./TESTING.md).

---

## What not to build yet

**There is no plugin SDK, and there will not be one until two or three real modules
exist.** An extension interface designed before its second implementation is a guess
about what implementations will need, and it becomes a compatibility obligation the
moment anyone uses it.

Similarly: **no vendor-named modules.** Brand is a string on a row, which is exactly why
DeWalt, Milwaukee, Makita, Ryobi and Festool all work on day one without this project
carrying anyone else's trademark in a directory name. Adding support for a brand is
adding a catalogue row — see [CATALOGUE.md](./CATALOGUE.md).

---

## See also

- [Architecture](./ARCHITECTURE.md) — why the seams are where they are
- [Data model](./DATA_MODEL.md) — every entity and the permission matrix
- [API](./API.md) — the contract `ApiStorageProvider` speaks
- [Testing](./TESTING.md) — the layers and the pre-pull-request checks
