# Testing Guide

Every change ships with tests. This document defines what "tested" means here, how to run each layer, and what must pass before a pull request is opened.

## The rule

**No pull request without a passing test that covers the change.**

| Change                       | Required test                                            |
| ---------------------------- | -------------------------------------------------------- |
| Bug fix                      | A test that fails before the fix and passes after        |
| New function or module       | Unit tests covering the happy path and each failure mode |
| New provider method          | Tests against **both** storage providers                 |
| New page or user-facing flow | An E2E spec exercising the real flow                     |
| New component with logic     | Component test via Testing Library                       |
| Pure styling or copy         | No test required; state this in the PR                   |

A change that is genuinely untestable needs a sentence in the PR explaining why. "I'll add tests later" is not that sentence.

## Layers

### Unit and integration — Vitest

Location: `tests/**/*.test.ts(x)`. Runs in jsdom.

```bash
npm run test            # single run
npm run test:watch      # watch mode
npm run test:coverage   # with coverage, enforces thresholds
npm run test:ui         # Vitest UI
```

`tests/setup.ts` gives every test a clean slate:

- `fake-indexeddb` supplies a real IndexedDB, which jsdom lacks
- `localStorage`, `sessionStorage` and IndexedDB are reset before each test
- `matchMedia` is stubbed
- mocks are cleared after each test

Because state resets per test, tests must not depend on execution order. If a test only passes when run after another, it is broken.

### Server — Vitest

Location: `tests/server/`. Runs in Node, not jsdom.

The API tests are **integration tests against the real Hono app and a real in-memory
database** — no mocks. The properties they assert (tenant isolation, session invalidation)
are exactly the ones a mock would let through.

### End-to-end — Playwright

Location: `tests/e2e/*.spec.ts`.

```bash
npm run test:e2e        # chromium (what CI runs on PRs)
npm run test:e2e:all    # chromium + firefox + webkit
npm run test:e2e:ui     # interactive
```

First run needs browsers:

```bash
npx playwright install --with-deps chromium
```

Playwright starts the app itself — the dev server locally, the production build in CI. Do not start a server first.

Use the helpers in `tests/e2e/helpers.ts` rather than hand-rolling setup:

```ts
import { signUpWithProperty, resetAppState, signUp, createProperty } from './helpers';

test('does the thing', async ({ page }) => {
  await signUpWithProperty(page);
  // ...
});
```

Each spec creates its own account with a unique email, so specs stay independent and run in parallel.

## Writing good tests here

**Test behaviour, not implementation.** Assert what a user or caller observes. A test that asserts a click promise rejects is testing React's event system; a test that asserts an error message appears is testing your app.

**Prefer real dependencies to hand-written mocks.** The IndexedDB suite once mocked Dexie entirely and passed against a stand-in that did not behave like Dexie. It now runs against real Dexie over `fake-indexeddb` and catches real bugs. Mock at the network or module boundary, not at the library you are trying to exercise.

**Mocked factories must return singletons.** If production code calls a factory itself, a mock that returns a fresh object per call hands the code under test different mocks than the ones your test configured.

**Never assert on wall-clock equality.** Two operations in the same millisecond produce identical ISO timestamps. Use `vi.setSystemTime` to advance the clock explicitly.

**Query by role and label first**, then `data-testid`, then CSS. Role queries survive refactors and assert accessibility at the same time.

## Coverage

Thresholds live in `vitest.config.ts` and fail the build when coverage drops below them.

They are a **ratchet, not a target**. They currently sit just under measured coverage so it cannot regress. The project standard is 80%; raise the numbers as suites land, and never lower them to make a build pass.

Current baseline: **30.82% statements**. That figure is low because the suite had never actually run until recently — not because the code is untestable. The largest gaps are `src/pages`, `src/components` and `src/lib/receipt`.

## Before you open a pull request

Run the same checks CI runs:

```bash
npm run lint
npm run format:check
npm run type-check
npm run test:coverage
npm run build
npm run test:e2e
```

All six must pass. If any fails, the PR is not ready.

## CI

`.github/workflows/ci.yml` runs five jobs on every pull request:

| Job                    | What it does                                        |
| ---------------------- | --------------------------------------------------- |
| Lint, Format and Types | ESLint, Prettier, `tsc --noEmit`                    |
| Unit Tests             | Vitest with coverage; thresholds enforced           |
| Build                  | Production build, uploads `dist`                    |
| E2E Tests              | Playwright on chromium against the production build |
| Security Audit         | Blocks on critical production vulnerabilities       |

Firefox and WebKit run nightly rather than per-PR, to keep pull requests fast. Trigger them on demand from the Actions tab.

## Debugging failures

**A test passes alone but fails in the suite** — it depends on state another test left behind, or on ordering. Setup resets storage per test; anything else stateful is yours to reset.

**Playwright cannot reach the app** — check nothing else is on port 8080. Playwright manages its own server.

**An E2E spec fails after a UI change** — read `playwright-report/`. CI uploads it as an artifact on every run, pass or fail.

**Coverage drops the build** — you added code without tests. That is the ratchet doing its job.
