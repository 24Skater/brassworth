# Contributing to Brassworth

Thanks for wanting to help. This document is the whole process: how to get set up,
what a change has to pass, and the two rules that get pull requests rejected most
often.

## The two rules

**No pull request without a passing test that covers the change.** Not "tests are nice
to have", not "if applicable". If you fix a bug, the test should fail before your fix
and pass after it. If you add a feature, the test should exercise it. This is the rule
that keeps a project with 1,061 tests from becoming a project with 1,061 tests and a
broken feature.

**Coverage thresholds are a ratchet.** Raise them, never lower them. If your change
drops coverage below the floor in `vitest.config.ts`, add tests — do not edit the
threshold.

## Getting set up

**Requires** Node 20 or newer. The container image builds on Node 22 and CI runs
Node 20; Node 18 is untested.

```bash
git clone https://github.com/24Skater/brassworth.git
cd brassworth
npm install
cp .env.example .env
npm run dev
```

The app comes up on **http://localhost:8080**. No server or account needed — the
default is local-first and everything lives in your browser.

To work on the API instead:

```bash
npm run dev:server          # tsx watch, on http://localhost:3000
```

Then set `VITE_STORAGE_PROVIDER=api` in `.env` and restart `npm run dev`. That one
variable switches storage **and** authentication together — see
[ARCHITECTURE.md](./docs/ARCHITECTURE.md) for why they are coupled.

## Before you open a pull request

Six checks. CI runs all of them, so running them locally saves a round trip.

```bash
npm run lint
npm run format:check
npm run type-check       # runs app, node and server configs
npm run test:coverage
npm run build
npm run test:e2e         # chromium; Playwright starts the dev server itself
```

`npm run type-check` fans out to `type-check:app`, `type-check:node` and
`type-check:server`. **If you add a fourth `tsconfig`, add it to that script.** A
project reference alone checks nothing — that mistake left this codebase entirely
un-type-checked for its whole history until it was caught.

Full detail on the test layers and how to debug a failure is in
[docs/TESTING.md](./docs/TESTING.md).

## Commit messages

Commits are linted by `commitlint` on a git hook. A message outside the rules is
rejected locally, before it ever reaches CI.

```
<type>(<scope>): <subject>

<optional body>
```

**Type** is required and must be one of:

`feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `chore` ·
`revert` · `build` · `ci`

**Scope** is optional — but if you include one it must be from this list, or the hook
rejects the commit:

`auth` · `storage` · `items` · `organizations` · `users` · `ui` · `config` ·
`deps` · `docs` · `security` · `docker` · `ci`

> The list predates several subsystems. There is no scope for `lifecycle`, `wishlist`,
> `prices`, `gear` or `reporting` yet, so use no scope at all for changes to those
> rather than inventing one. Adding them to `commitlint.config.js` is a welcome
> `chore(config)` pull request.

**Subject**: lowercase type, no trailing full stop, and not written in Title Case,
UPPER CASE or PascalCase. Body lines may run to 300 characters.

```bash
git commit -m "fix(storage): keep archived items out of the value total"
git commit -m "feat: derive overdue loans from the event log"
```

## Branches and pull requests

Work on a branch off `main` — there is no long-lived `develop` branch, despite what
the CI trigger list suggests.

```bash
git checkout -b feat/short-description
```

Then:

1. Make the change, with the test that covers it.
2. Run the six checks above.
3. Open a pull request against `main`, describing what changed and why. If it changes
   behaviour a user would notice, say what a reviewer should click to see it.
4. Keep the branch up to date with `main` and make sure CI is green before asking for
   review.

Small, focused pull requests get reviewed quickly. A branch that renames files, fixes
a bug and adds a feature is three pull requests.

## Where things live

```
src/
  pages/          route components, one per screen
  components/     ui/ is vendored shadcn; the rest is ours
                  items/ gear/ receipts/ auth/ users/ common/
  contexts/       auth, organization and role context
  hooks/          shared hooks
  lib/
    auth/         providers, password rules, rate limiting
    storage/      the provider seam and its three implementations
    lifecycle/    the event log, and status derived from it
    valuation/    depreciation and cost of ownership
    reporting/    value breakdowns and CSV
    wishlist/     entries, savings, purchase conversion
    prices/       price history and alerts
    gear/         profile matching, catalogue, data plate OCR
    receipt/      receipt OCR and parsing
    backup/       the versioned backup format
  catalogue/      the bundled gear catalogue and its ODbL licence
  types/          shared types

server/
  app.ts          routes
  routes/         the generic tenant-scoped collection router
  auth/           scrypt, sessions, access control, OIDC
  db/             schema and migrations
  gear/           optional external catalogue source
  prices/         the price checker (built, not yet wired to a route)

tests/            unit and server tests, plus e2e/ for Playwright
docs/             see docs/INDEX.md
scripts/          developer tooling, including the screenshot pipeline
```

## Style

Prettier and ESLint decide formatting and most style questions; run `npm run lint:fix`
and `npm run format` rather than arguing with them. Beyond that:

- **Prefer immutable updates.** Return a new object rather than mutating one in place.
- **Handle errors explicitly.** Never swallow one silently.
- **Keep functions small and files focused.** Roughly 200 to 400 lines per file, 800 at
  the outside; split before that.
- **Validate at the boundary.** User input, API responses and file contents get checked
  with zod before they are trusted.
- **Name the reasoning in a comment when a choice is not obvious** — particularly when
  you rejected the more obvious alternative. Most of the comments in this codebase
  exist to stop someone helpfully "fixing" a deliberate decision.

## Documentation

If your change makes something in `docs/` wrong, fix it in the same pull request. Each
fact has exactly one owning document — see [docs/INDEX.md](./docs/INDEX.md) — so update
the owner and let the links do the rest.

Before pushing documentation changes:

```bash
node scripts/screenshots/checkDocs.mjs
```

That checks every markdown file for broken relative links, renders every Mermaid
diagram through the real library, and fails on emoji. **This project's documentation
contains no emoji.** That is a deliberate house style, not an oversight.

Screenshots in the README are generated, not hand-captured. If your change alters the
interface enough to date them:

```bash
npm run dev                 # in one terminal
npm run screenshots         # in another
```

That reseeds a demo dataset, captures every screen in both themes, frames them, and
rebuilds the demo GIF. The demo data lives in `scripts/screenshots/demoData.mjs`.

## A note on lovable-tagger

`lovable-tagger` is a development-only Vite plugin left over from the project's
origins, active only when `mode === 'development'`. It ships in no bundle and affects
no runtime behaviour. You do not need to preserve it, and removing it is a reasonable
`chore(deps)` pull request.

## Reporting things

- **Bugs and features**: [GitHub issues](https://github.com/24Skater/brassworth/issues).
  For a bug, say what you did, what happened, what you expected, and which mode you
  were in — local-first or server.
- **Security vulnerabilities**: not the issue tracker. See [SECURITY.md](./SECURITY.md).

## Code of conduct

By taking part you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
