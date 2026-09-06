# HTTP API

> About twenty routes, most of them the same route. Everything tenant-scoped goes through one
> generic collection router, and that is the single most useful thing to understand here.

**Last updated:** 2026-09-05

Read from source. The authoritative files are:

| Concern                                  | File                                                              |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Every route, in one file                 | [`server/app.ts`](../server/app.ts)                               |
| Collection table, schema and permissions | [`server/routes/collections.ts`](../server/routes/collections.ts) |
| Session cookie and token handling        | [`server/auth/session.ts`](../server/auth/session.ts)             |
| The authorization guard                  | [`server/auth/access.ts`](../server/auth/access.ts)               |
| Single sign-on                           | [`server/auth/oidc.ts`](../server/auth/oidc.ts)                   |
| Process entry point and static serving   | [`server/index.ts`](../server/index.ts)                           |

The tables these routes read and write are documented in [DATA_MODEL.md](./DATA_MODEL.md).

---

## Base URL and the same-origin assumption

Every path below is absolute and begins with `/api/`. There is no version prefix.

The server is designed to be same-origin with the app. [`server/index.ts`](../server/index.ts)
serves the built SPA out of `STATIC_ROOT` (default `./dist`) from the same process and the same
port, so a self-hosted deployment is one container and one origin. That is what lets the
session cookie work with no cross-site configuration at all.

`VITE_API_BASE_URL` is a build-time browser variable, read only when
`VITE_STORAGE_PROVIDER=api`. It is a **prefix**, not a full API root: both
[`ApiStorageProvider`](../src/lib/storage/providers/apiProvider.ts) and
[`ApiAuthProvider`](../src/lib/auth/providers/api.ts) strip a trailing slash from it and then
append paths that already start with `/api/`. So the correct value for a server on port 3000
is `http://localhost:3000`, and setting it to `http://localhost:3000/api` produces requests to
`/api/api/auth/login`. Empty, the default, means same origin.

Two consequences of pointing it at a different origin: the server installs no CORS middleware,
and the session cookie has `SameSite=Lax`. Cross-origin use is not supported today. Put a
reverse proxy in front instead and keep one origin.

All requests and responses are JSON. Send `content-type: application/json` on anything with a
body. A browser client must send `credentials: 'include'` so the session cookie rides along;
both shipped providers do.

---

## Authentication

Sessions are opaque random tokens in an httpOnly cookie, not JWTs. A JWT cannot be revoked
without a denylist, which is the database round-trip a JWT is meant to avoid, so it would buy
nothing here and cost the ability to log someone out.

### Cookie semantics

The cookie is named `brassworth_session`. It is set with:

| Attribute  | Value                           |
| ---------- | ------------------------------- |
| `HttpOnly` | always                          |
| `SameSite` | `Lax`                           |
| `Path`     | `/`                             |
| `Max-Age`  | `SESSION_TTL_HOURS * 3600`      |
| `Secure`   | only when `NODE_ENV=production` |

`Secure` is conditional deliberately: marking it unconditionally would silently break local
development over plain `http://`, where the browser would drop the cookie and the session would
appear to vanish on every request.

`SESSION_TTL_HOURS` defaults to `168` (seven days) and is read once at module load. The same
value sets both the cookie `Max-Age` and the `expires_at` on the session row. Nothing extends a
session in place -- there is no sliding window, and `refreshSession()` in the browser provider
is just another call to `/api/auth/me`. When a request arrives with an expired session, the row
is deleted and the caller is treated as anonymous.

Only the SHA-256 of the token is stored. Logout deletes the row and sends a cleared cookie with
`Max-Age=0`.

### Password rules

This is a place where client and server disagree, and it is worth knowing which is which.

The **server** requires a password of at least 12 characters and at most 1024, and the email to
be a valid address between 3 and 320 characters. That is the whole of it. There is no strength
check in [`server/app.ts`](../server/app.ts).

The **browser** additionally runs [zxcvbn](../src/lib/auth/passwordValidation.ts) and refuses
anything scoring below 3 out of 4, on top of the same 12-character floor. That check lives in
`src/pages/Auth.tsx` and in the local-storage auth provider, so it applies to the UI and to
local-first mode -- but a direct API caller is not subject to it. Treat the strength rule as a
product rule, not a security control, until it is moved server-side.

Hashing is scrypt from Node's own crypto with OWASP's parameters (N = 2^17, r = 8, p = 1),
stored as a self-describing string so the parameters can change without stranding old hashes.
Argon2id would be the stronger first choice on paper, but every Node binding for it is a native
module, and easy self-hosting is the point.

### Routes

| Method | Path               | Auth          | Purpose                               |
| ------ | ------------------ | ------------- | ------------------------------------- |
| POST   | `/api/auth/signup` | none          | Create an account and start a session |
| POST   | `/api/auth/login`  | none          | Start a session                       |
| POST   | `/api/auth/logout` | none required | End the session named by the cookie   |
| GET    | `/api/auth/me`     | session       | Who the caller is                     |

**POST `/api/auth/signup`** takes `{ email, name, password }`. Returns `201` with
`{ "user": { "id", "email", "name" } }` and a `Set-Cookie`. Returns `400` if the body fails
validation, `409` if the address is already registered. Addresses are lowercased and trimmed
before comparison, so `DUPE@Example.com` collides with `dupe@example.com`.

**POST `/api/auth/login`** takes `{ email, password }`. Returns `200` with the same user shape
and a `Set-Cookie`. Returns `400` on a malformed body and `401` otherwise. A password is
verified even when no account matched, against a cached placeholder hash, so a missing account
and a wrong password take the same time and give the same message: `Email address or password
is incorrect.` The one exception is an account with a null `password_hash`, which gets
`This account signs in through your identity provider.` -- a distinguishable answer, but one
that beats an incorrect-password error the person could never satisfy.

**POST `/api/auth/logout`** always returns `200` with `{ "ok": true }` and a cleared cookie,
whether or not there was a session to delete.

**GET `/api/auth/me`** returns `200` with `{ "user": { "id", "email", "name" } }`, or `401`
with `{ "error": "Not signed in." }`. A forged or unknown cookie value is simply not a session
and yields the same `401`.

There is **no rate limiting** on `/api/auth/login`. See [Known gaps](#known-gaps).

---

## Sign-in through an identity provider

Off unless all four of `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` and
`OIDC_REDIRECT_URI` are set. `OIDC_LABEL` and `OIDC_PROVIDER` are optional and default to
`your identity provider` and `oidc`. When it is off, the two active routes return `404`
rather than half-enabling.

| Method | Path                      | Returns                                                                            |
| ------ | ------------------------- | ---------------------------------------------------------------------------------- |
| GET    | `/api/auth/oidc/status`   | `200` with `{ "enabled": true, "label": "..." }` or `{ "enabled": false }`         |
| GET    | `/api/auth/oidc/start`    | `302` to the provider, `404` if unconfigured, `502` if the provider is unreachable |
| GET    | `/api/auth/oidc/callback` | `302` to `postLoginRedirect` (default `/dashboard`), or an error                   |

The flow uses `openid-client` rather than a hand-rolled redirect dance, with PKCE
(`code_challenge_method=S256`), a nonce, and a random 32-byte `state`. Scope is
`openid email profile`.

State is held in an in-memory store with a ten-minute TTL and is **single use**: it is consumed
on callback whether or not it turns out valid, so it cannot be replayed. In-memory is
deliberate -- the value lives for the seconds between the redirect out and the redirect back,
and a restart losing it just means the person clicks the button again. It does mean that
multiple server processes behind a load balancer will not work without sticky sessions.

Callback failures: `400` `That sign-in attempt has expired. Try again.` for an unknown or
expired state, `401` `Could not complete sign-in.` if the code exchange or nonce check fails,
and `403` when linking is refused -- which happens when the provider identifies nobody, or when
an existing local account already uses the asserted email address and the provider has not
marked that address verified. Linking is by `(provider, subject)`; email is only ever used to
attach an identity to an account that already exists, and only when verified.

---

## Tenant-scoped collections

This is the heart of the API. Eleven of the twelve collections behave identically over the
wire, so they are described once and served by one router. Writing near-identical route sets
per collection would multiply the number of places the authorization guard could be forgotten,
which is the one mistake that matters here.

### URL shape

```
/api/orgs/:orgId/:collection          GET, POST, PUT
/api/orgs/:orgId/:collection/:id      PATCH, DELETE
```

`:orgId` is the tenant boundary. It is verified against the caller's memberships on every
single request. `organizationId` in a request body is ignored -- on POST it is overwritten from
the path, and on PATCH both `id` and `organizationId` are stripped out of the body before the
update, because one would move a record and the other would move it into somebody else's
property.

### The collections

| `:collection`   | Table                   | Read permission | Write permission      |
| --------------- | ----------------------- | --------------- | --------------------- |
| `items`         | `items`                 | `canViewItems`  | `canAddItems`         |
| `item-events`   | `item_events`           | `canViewItems`  | `canAddItems`         |
| `locations`     | `locations`             | `canViewItems`  | `canManageLocations`  |
| `categories`    | `categories`            | `canViewItems`  | `canManageCategories` |
| `tags`          | `tags`                  | `canViewItems`  | `canManageCategories` |
| `photos`        | `photos`                | `canViewItems`  | `canEditItems`        |
| `documents`     | `documents`             | `canViewItems`  | `canEditItems`        |
| `wishlist`      | `wishlist_entries`      | `canViewItems`  | `canAddItems`         |
| `savings`       | `savings_contributions` | `canViewItems`  | `canAddItems`         |
| `prices`        | `price_observations`    | `canViewItems`  | `canAddItems`         |
| `gear-profiles` | `gear_profiles`         | `canViewItems`  | `canAddItems`         |
| `user-roles`    | `user_roles`            | `canViewItems`  | `canManageUsers`      |

Note the path names that differ from the table names: `wishlist`, `savings`, `prices`,
`item-events`, `gear-profiles`, `user-roles`. Anything not in this list is `404`
`Unknown collection.` -- including `item_tags`, which is a real table with no route.

The single write permission covers create, update, replace and delete alike. There is no
separate delete permission at this layer, which means `canDeleteItems` -- the one permission
that only ADMIN holds -- is not consulted by any collection route. A CONTRIBUTOR who may add
items may also `DELETE` them. That is what the code does; it is not obviously what the role
descriptions promise.

### Methods

| Method                                    | Body                | Success | Response                                                                 |
| ----------------------------------------- | ------------------- | ------- | ------------------------------------------------------------------------ |
| `GET /api/orgs/:orgId/:collection`        | --                  | `200`   | `{ "rows": [...] }` -- every row for the org, unfiltered and unpaginated |
| `POST /api/orgs/:orgId/:collection`       | one record          | `201`   | `{ "row": {...} }`                                                       |
| `PATCH /api/orgs/:orgId/:collection/:id`  | partial record      | `200`   | `{ "row": {...} }`                                                       |
| `DELETE /api/orgs/:orgId/:collection/:id` | --                  | `200`   | `{ "ok": true }`                                                         |
| `PUT /api/orgs/:orgId/:collection`        | `{ "rows": [...] }` | `200`   | `{ "ok": true, "count": n }`                                             |

`POST` accepts an `id` in the body and uses it if present, because records created offline
arrive with an identity already; otherwise the server generates a UUID. The insert is
`ON CONFLICT DO NOTHING`, so re-posting a record that already exists returns `201` with the
existing row rather than an error -- which makes the call idempotent by id, and also means a
`201` is not proof that anything was written.

`PATCH` returns `404` `That record does not exist.` when no row matches the id within the org.
`DELETE` does not: it returns `{ "ok": true }` whether or not a row was there.

`PUT` is a whole-collection replace, backing the provider's `replaceCollection`. It deletes
every row for that organization and inserts the supplied array in one pass. The delete is
scoped by `organization_id`, so no other tenant is touched. Validation is all-or-nothing --
one bad record and the entire request is rejected with `400` before anything is deleted.

Write bodies are validated per collection by the Zod schemas in
[`server/routes/collections.ts`](../server/routes/collections.ts). Two details worth calling
out: `gear-profiles` accepts `specs` either as an array of `{ label, value, unit? }` or as a
JSON string, and stores it as text; and it refuses `source` entirely, so no client can mint a
row the interface would treat as read-only catalogue data.

---

## Organizations

An organization is a _property_ in the interface.

| Method | Path               | Guard                   | Notes                 |
| ------ | ------------------ | ----------------------- | --------------------- |
| GET    | `/api/orgs`        | session                 | Only the caller's own |
| POST   | `/api/orgs`        | session                 | Creator becomes ADMIN |
| PATCH  | `/api/orgs/:orgId` | `canManageOrganization` |                       |
| DELETE | `/api/orgs/:orgId` | `canManageOrganization` | Cascades              |

**GET `/api/orgs`** returns `{ "organizations": [ { id, name, type, address, role } ] }`,
joined through memberships, so `role` is the caller's role in each. `401` if anonymous.

**POST `/api/orgs`** takes `{ name, type?, address? }`, where `type` is `home` (default),
`church`, `small_business` or `other`. Returns `201` with
`{ "organization": { "id", "name", "type" } }` -- note that `address` is not echoed back even
when it was supplied. It also inserts a membership giving the creator `ADMIN`, without which
they could not see what they just made.

**PATCH `/api/orgs/:orgId`** accepts any subset of the same fields and sets `updated_at`.
Returns `{ "organization": {...} }` with the full row.

**DELETE `/api/orgs/:orgId`** returns `{ "ok": true }`. Foreign key cascades take the
memberships, items, events, photos, documents, wishlist entries and everything else with it.
This is not soft-delete and there is no confirmation step at the API layer.

---

## Memberships and users

| Method | Path               | Guard   | Returns                    |
| ------ | ------------------ | ------- | -------------------------- |
| GET    | `/api/memberships` | session | `{ "memberships": [...] }` |
| GET    | `/api/users`       | session | `{ "users": [...] }`       |

Both are scoped to organizations the caller belongs to. `/api/memberships` first collects the
caller's own org ids and then returns every membership row in those orgs; with no memberships
at all it returns an empty array rather than `401`. `/api/users` does the same join and returns
distinct `{ id, email, name, createdAt }`. Password hashes never leave the server, not even to
an admin. Returning every row in the table would let any account enumerate the whole install.

Both are read-only. There is no `POST /api/memberships`; see [Known gaps](#known-gaps).

---

## Catalogue

**GET `/api/catalogue`** proxies an optional external gear catalogue source. It exists as a
route rather than a browser fetch so that `GEAR_CATALOGUE_API_KEY` never leaves the server.

| Condition                                                         | Status | Body                                                       |
| ----------------------------------------------------------------- | ------ | ---------------------------------------------------------- |
| `GEAR_CATALOGUE_URL` unset                                        | `200`  | `{ "configured": false }`                                  |
| Fetched successfully                                              | `200`  | `{ "configured": true, "name": "...", "document": {...} }` |
| Source rejected before the request, or the response was oversized | `400`  | `{ "configured": true, "error": "..." }`                   |
| Upstream failed or returned non-JSON                              | `502`  | `{ "configured": true, "error": "..." }`                   |

The source URL must be `https`. The returned document is validated by the client against the
same rules as the bundled catalogue, so a vendor document earns no more trust than a shipped
one. No authentication is required to call this route. See [CATALOGUE.md](./CATALOGUE.md).

---

## Health

**GET `/api/health`** returns `200` with exactly:

```json
{ "ok": true }
```

No authentication, no database access. It is a liveness probe, not a readiness probe -- it will
answer `ok` even if the database is unreachable.

---

## Errors and status codes

Every error response is a JSON object with a single `error` key holding a sentence meant for a
person:

```json
{ "error": "Your role does not allow that." }
```

| Status | When                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------ |
| `400`  | Body failed validation, or was not JSON                                                                |
| `401`  | No session, or an unknown or expired one                                                               |
| `403`  | Caller is a member but their role lacks the permission; also a refused OIDC link                       |
| `404`  | Unknown collection, a record that does not exist, **or an organization the caller is not a member of** |
| `409`  | Signup with an email address already registered                                                        |
| `500`  | Unhandled exception. Body is always `{ "error": "Something went wrong." }`                             |
| `502`  | An upstream the server depends on failed: the OIDC issuer or the catalogue source                      |

Unhandled exceptions are logged server-side and never surfaced. The client sees the fixed
sentence above and nothing about what broke.

### Why a non-member gets 404 and not 403

This is the deliberate part. `requireOrgAccess` distinguishes three failures:

1. No session at all: `401`.
2. A session, but no membership row for this organization: **`404`**, `That property does not
exist.`
3. A membership, but a role without the required permission: `403`, `Your role does not allow
that.`

Returning `403` in case 2 would confirm that the organization exists. Since ids are the only
thing a caller needs to probe, a `403` would turn the API into an oracle for enumerating which
properties are on the install -- a stranger could walk ids and learn the shape of the deployment
without ever reading a row. `404` tells them nothing they did not already have. Case 3 is
different: a member already knows the property exists, so `403` leaks nothing and is the more
useful answer.

The practical consequence for integrators: a `404` on a collection route does not necessarily
mean the URL is wrong. It may mean you are not a member of that org.

Checks run in a fixed order. The collection name is resolved first, so an anonymous request to
an unknown collection gets `404` rather than `401`. Then access is checked. Then the body is
validated. A caller without permission therefore never learns whether their body was valid.

---

## Known gaps

Stated plainly, because building against this API without knowing them wastes a day.

**There is no route to add another member to a property.** `POST /api/orgs` inserts exactly one
membership, for the creator. `/api/memberships` is GET-only. The browser provider has
`createMembership` and `deleteMembership` methods that call `POST /api/memberships` and
`DELETE /api/memberships/:id`, and neither route exists on the server -- those calls fall
through to the not-found handler and get `404 {"error":"Not found."}`. **Multi-user sharing is
therefore not usable in server mode today.** Writing a row into the `user-roles` collection does
not help: `requireOrgAccess` reads `memberships.role`, and `user_roles` is a mirror with no
authority. See [DATA_MODEL.md](./DATA_MODEL.md#design-decisions).

**There is no password reset.** No route sends mail, issues a reset token or changes a
password. An account whose password is lost is lost, unless an operator edits `users` directly
with a hash generated by `hashPassword`. There is also no route to change a password while
signed in.

**There is no rate limiting anywhere**, including on login. The constant-time comparison in
`verifyPassword` and the placeholder hash on unknown accounts defend against timing analysis,
not against volume. Put a rate limiter in the reverse proxy.

**Collection reads are unfiltered and unpaginated.** `GET /api/orgs/:orgId/items` returns every
item in the property in one response. There are no query parameters -- no filtering, no sorting,
no `limit`, no cursor. Fine for a household; it will not stay fine.

**`item_tags` is unreachable.** The table exists and is created by the migration, but no route
exposes it and nothing reads or writes it, so per-item tags do not survive a round trip through
the API.

**`PRICE_WATCH_ENABLED` does nothing.** The price checking code in `server/prices/` is not
reachable by any route.

---

## A worked example

Four calls, using a cookie jar so the session persists between them. Assumes the server is on
`http://localhost:3000`.

### 1. Sign up

```bash
curl -s -c jar.txt -X POST http://localhost:3000/api/auth/signup \
  -H 'content-type: application/json' \
  -d '{"email":"sam@example.com","name":"Sam","password":"correct horse battery staple"}'
```

```json
{ "user": { "id": "3f1c...", "email": "sam@example.com", "name": "Sam" } }
```

`201`, plus a response header:

```
Set-Cookie: brassworth_session=Yx0v...; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800
```

`Secure` is absent because this server is not running with `NODE_ENV=production`.

### 2. Create a property

```bash
curl -s -b jar.txt -X POST http://localhost:3000/api/orgs \
  -H 'content-type: application/json' \
  -d '{"name":"Elm Street","type":"home","address":"12 Elm Street"}'
```

```json
{ "organization": { "id": "a91b...", "name": "Elm Street", "type": "home" } }
```

`201`. Sam is now ADMIN of `a91b...`. The address was stored but is not echoed back; a
subsequent `GET /api/orgs` returns it.

### 3. Create an item

```bash
curl -s -b jar.txt -X POST http://localhost:3000/api/orgs/a91b.../items \
  -H 'content-type: application/json' \
  -d '{"name":"Cordless drill","brand":"DeWalt","model":"DCD791D2","purchasePrice":179.99,"purchaseDate":"2026-03-14","condition":"NEW"}'
```

```json
{
  "row": {
    "id": "7c4e...",
    "organizationId": "a91b...",
    "name": "Cordless drill",
    "description": null,
    "categoryId": null,
    "locationId": null,
    "brand": "DeWalt",
    "model": "DCD791D2",
    "serialNumber": null,
    "gearProfileId": null,
    "purchaseDate": "2026-03-14",
    "purchasePrice": 179.99,
    "currentEstimatedValue": null,
    "depreciationMethod": null,
    "usefulLifeMonths": null,
    "declineRatePerYear": null,
    "salvageValue": null,
    "condition": "NEW",
    "quantity": 1,
    "notes": null,
    "isArchived": false,
    "createdAt": "2026-09-05 11:02:47",
    "updatedAt": "2026-09-05 11:02:47"
  }
}
```

`201`. No `organizationId` was sent; it came from the path. `condition` and `quantity` took
their schema defaults where absent. Note the timestamp format: these came from SQLite's
`current_timestamp`, not from an ISO string the application wrote.

### 4. Record a lifecycle event

Lend the drill to a neighbour:

```bash
curl -s -b jar.txt -X POST http://localhost:3000/api/orgs/a91b.../item-events \
  -H 'content-type: application/json' \
  -d '{"itemId":"7c4e...","type":"LOANED_OUT","occurredAt":"2026-09-05T10:00:00.000Z","counterparty":"Jo next door","expectedBackOn":"2026-09-12"}'
```

```json
{
  "row": {
    "id": "e502...",
    "itemId": "7c4e...",
    "organizationId": "a91b...",
    "type": "LOANED_OUT",
    "occurredAt": "2026-09-05T10:00:00.000Z",
    "note": null,
    "counterparty": "Jo next door",
    "expectedBackOn": "2026-09-12",
    "amount": null,
    "locationId": null,
    "createdAt": "2026-09-05 11:04:19"
  }
}
```

`201`. The item's status is now `LOANED`, but nothing on the item row changed -- status is
derived by folding the event log, and the API returns events, not a status. Fetch
`GET /api/orgs/a91b.../item-events` and run `deriveStatus` from
[`src/lib/lifecycle/index.ts`](../src/lib/lifecycle/index.ts) over the events for one item, or
reimplement the fold; the rules are in
[DATA_MODEL.md](./DATA_MODEL.md#design-decisions).

To get it back, append another event rather than editing this one:

```bash
curl -s -b jar.txt -X POST http://localhost:3000/api/orgs/a91b.../item-events \
  -H 'content-type: application/json' \
  -d '{"itemId":"7c4e...","type":"RETURNED","occurredAt":"2026-09-11T18:30:00.000Z"}'
```

---

## Related documents

- [DATA_MODEL.md](./DATA_MODEL.md) -- tables, enums and the permission matrix
- [ARCHITECTURE.md](./ARCHITECTURE.md) -- the provider system and where the server fits
- [EXTENDING.md](./EXTENDING.md) -- the auth and storage provider seams
- [CATALOGUE.md](./CATALOGUE.md) -- the gear catalogue this API can proxy
- [SELF_HOSTING.md](./SELF_HOSTING.md) -- running the server behind a proxy
- [SECURITY.md](../SECURITY.md) -- what each mode enforces, and the known gaps
