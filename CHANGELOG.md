# Changelog

Notable changes to Brassworth. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **On version numbers.** The milestones below match the release gates in
> [docs/ROADMAP.md](./docs/ROADMAP.md). `package.json` still reads `0.0.0` and no git
> tags have been cut, because nothing has been published yet. That is a loose end to
> settle before the repository goes public — see the note at the end of this file.

## Unreleased

### Added

- A generated screenshot pipeline (`npm run screenshots`): seeds a realistic demo
  dataset, captures every screen in both themes, frames the captures, and rebuilds the
  demo GIF. Demo data lives in `scripts/screenshots/demoData.mjs` and ships in nothing.
- A documentation checker (`node scripts/screenshots/checkDocs.mjs`) that resolves every
  relative link, renders every Mermaid diagram through the real library, and fails on
  emoji.
- Brand assets: a mark in light and dark variants, and a twelve-icon set built on a
  dual-safe palette so the icons stay legible on both light and dark backgrounds.

### Changed

- **Breaking: every persistence identifier renamed to match the product.** Storage keys
  went from `inventory_*` to `brassworth_*`, the Dexie database from
  `HomeAssetKeeperDB` to `BrassworthDB`, the theme key from `home-asset-keeper-theme`
  to `brassworth-theme`, and the rate limiter's database from `home-asset-keeper` to
  `brassworth`. **Data saved by an earlier build is not read by this one, and no
  migration is shipped.** These names were deliberately preserved through the rebrand
  precisely to avoid this, on the grounds that renaming them would orphan existing
  local data. That reasoning no longer applies: the project had no released version and
  no users. Doing it now, before anyone can be affected, is the only moment it is free.
  Anyone carrying data from a pre-1.1 build should export a backup first, then restore
  it after upgrading.

- The README, rewritten. It had described six shipped phases as "planned" and claimed
  the app had no tests, no Docker image and no backend.
- The documentation set, restructured around one owning document per fact. New:
  `INDEX`, `GETTING_STARTED`, `LIFECYCLE`, `VALUE`, `WISHLIST_AND_PRICES`, `BACKUP`,
  `SELF_HOSTING`, `DATA_MODEL`, `API`, `EXTENDING`. Rewritten: `ARCHITECTURE`,
  `USER_GUIDE`, `SECURITY`, `CONTRIBUTING`, this file.
- `.env.example` now lists only variables the code actually reads, and adds the five
  `GEAR_CATALOGUE_*` variables that were missing.
- `CONTRIBUTING.md` now documents the commit scope allowlist. A commit using a scope
  outside it is rejected by the git hook, which was previously undocumented.

### Fixed

- **Added `.gitattributes` with `* text=auto eol=lf`.** The repository stores LF and
  Prettier is configured for LF, but git's Windows default (`core.autocrlf=true`)
  checks out CRLF. A contributor on Windows therefore failed `npm run format:check` on
  all 197 files immediately after cloning, and could not pass the pull request gate
  this project documents as mandatory. CI never caught it because CI runs on Linux.
  Found by cloning the published repository fresh and running the gate.

- `vitest.config.ts` now excludes `scripts/**` from coverage. Developer tooling was
  being measured as product code and would have failed the coverage gate.
- Documentation stated that local-mode passwords were hashed with plain SHA-256 and
  that there was no rate limiting. Both were false — it is PBKDF2-SHA256 at 100,000
  iterations with a per-user salt, plus escalating login lockouts.
- Deployment documentation pointed readers at port 80 and a `docker run` command that
  cannot work. The container listens on 3000.
- **`docker-compose.prod.yml` and `nginx.prod.conf` repaired.** nginx proxied to
  `frontend:80` while the image listens on 3000 and runs no nginx, so the documented
  HTTPS path returned 502; the app service declared no volume or `DATABASE_URL`, so the
  database died with the container; the health check hit `/health` rather than
  `/api/health`; and the sign-in rate limit was applied to `/auth`, a client-side route,
  rather than to `/api/auth/`. The stack is now verified end to end: redirect, TLS,
  health, signup, and rate limiting returning 503 after the burst.
- `ssl/` and `logs/` are gitignored. Following the previous instructions would have
  committed a TLS private key.
- `package.json` pointed `repository`, `bugs` and `homepage` at `24Skater/brassworth`,
  which does not exist, and at an unregistered domain. Version set to `1.1.0` to match
  the roadmap and this file.
- Removed a stray test spreadsheet tracked at the repository root, and gitignored
  `*.xlsx` so import/export testing cannot add another.

### Removed

- `docs/QUICK_START_GUIDE.md`, `docs/TROUBLESHOOTING.md`,
  `docs/COMMIT_MESSAGE_GUIDE.md`, `docs/AUTH_PROVIDERS.md`,
  `docs/STORAGE_PROVIDERS.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY_HEADERS.md`,
  `docs/DEVELOPER_GUIDE.md`, `docs/PERFORMANCE.md`, `docs/ACCESSIBILITY.md` and
  `README_DOCKER.md`. Each was either an internal to-do list, a machine-setup note, or
  a description of an architecture that no longer exists. Their accurate content moved
  into the documents listed above.

## [1.1.0] — 2026-09-05

Gear profiles.

### Added

- **Gear profiles.** A make and model described once, reusable by every item that is
  one. Specs are label and value pairs rather than typed columns, because a cordless
  drill and a rack switch share no fields.
- **A bundled community catalogue** of 18 profiles across 13 brands, licensed under
  ODbL 1.0 and DbCL 1.0. Catalogue records are never stored per tenant — they ship in
  the bundle and merge at read time, so a catalogue update is not a migration.
- **Data plate scanning.** Photograph a rating plate and Brassworth reads the brand,
  model and serial number off it, then fills in the form. It never saves on your
  behalf.
- Optional server-side vendor catalogue sources, configured with `GEAR_CATALOGUE_URL`
  and friends. Off unless configured; fails soft to an empty list.

### Fixed

- Backups omitted every Phase 5 collection — wishlist entries, savings contributions
  and price observations. A shipped defect, now covered by a test that guards the whole
  backup surface rather than a list someone has to remember to update.

## [1.0.0] — 2026-09-05

Coverage past 80 percent, and the pre-purchase half of the product.

### Added

- **Price history and alerts.** Prices are an append-only series; alerts fire only when
  the latest is at or below a target you set explicitly, and never on something already
  bought.
- A price checker that reads published `schema.org/Product` data, obeys `robots.txt`,
  throttles per host and requires https. **Built and tested, but not yet reachable from
  any route** — `PRICE_WATCH_ENABLED` has no effect today.

### Fixed

- Four defects surfaced by the coverage push, and coverage raised past the project's
  80 percent standard to 87.9 percent statements.

## [0.9.0] — 2026-09-05

### Added

- **The wishlist.** Entries with a target price and a priority, an append-only savings
  log where the total is derived, and conversion into an owned item that writes an
  acquisition event so the new item starts with real history.

### Fixed

- **The TypeScript gate had never checked the application.** `tsconfig.json` carried
  `"files": []` plus project references, so `tsc --noEmit` resolved to an empty program.
  Found when a syntax error passed the TypeScript job. Turning it on revealed 51 errors,
  including a call to a function that did not exist. All fixed, no rule weakened.
  `type-check` now names each config explicitly.

## [0.8.0] — 2026-09-05

Real authentication, and something you can actually host.

### Added

- **Server foundation**: Hono, Drizzle and libSQL, with scrypt password hashing at
  OWASP parameters, opaque session tokens, and tenant isolation on every request.
- **The browser app wired to the API**, with authorisation enforced server-side rather
  than assumed by the client.
- **One container.** `docker compose up -d`, SQLite on a volume, no external database.
- **Optional OIDC sign-in**, off unless configured, linking accounts on the provider's
  subject claim and never on email alone.

### Security

- A non-member receives 404 rather than 403, so a response cannot leak which properties
  exist.
- `organizationId` is read from the verified request path, never from the body.

## [0.6.0] — 2026-09-05

### Added

- **Depreciation**, straight line and declining balance, with a salvage floor.
- **Age of ownership** and **cost of ownership** — purchase plus repairs less resale,
  also expressed per month.
- **Value breakdowns** by category, location and brand, with a CSV report built for
  insurance claims and accountants.

## [0.4.0] — 2026-09-04

The release that made Brassworth something other than an inventory app.

### Added

- **The item lifecycle event log**, append-only, with check-in and check-out.
- **Status derived from the log rather than stored**, so a mistake is corrected by
  appending an entry instead of rewriting history.
- Status surfaced in the item list, and overdue loans on the dashboard with the holder
  and the date they were due back.

## [0.2.0] — 2026-09-04

### Added

- **Versioned backup and restore** covering every collection.

### Changed

- **Rebranded to Brassworth**, with the Workshop palette in light and dark. Persistence
  identifiers deliberately keep their old names — renaming them would orphan existing
  local data.
- The roadmap rewritten against the real product thesis.
- The synchronous storage wrapper removed; storage is asynchronous throughout.

### Fixed

- Test infrastructure and CI repaired, and a bulk-save data integrity bug fixed. The
  suite had never actually run before this.

---

## Before the first public release

Loose ends this file cannot settle on its own:

1. **Cut tags.** `package.json` now reads `1.1.0` to match the milestones above, but no
   git tags exist yet.
2. **Decide on the `brassworth` GitHub organisation and domain.** The project is named
   Brassworth but lives at `24Skater/brassworth`.
3. **Set a social preview image** in repository settings. Until one is set, every
   share on Slack, X or Discord renders as a grey placeholder.
