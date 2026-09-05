# Brassworth Roadmap

> Track what you own, for as long as you own it.

## The thesis

Every inventory app on the market answers one question: _what do I have right now?_ Sortly, ShareMyToolbox, TOOLTRIBE, StuffKeeper — all snapshots.

Brassworth answers a longer question: **what happened to this thing, and what is it worth now?**

```
        want it  →  save for it  →  buy it  →  own it
                                                  ↓
   sold  ←  repaired  ←  in repair  ←  broke  ←  lent out
```

Nothing serving individuals and small organisations covers the two ends of that line. The pre-purchase half — wishlist, savings goal, price watching — does not exist in this category at all. The post-break half — repair history, RMA tracking, resale value — exists only in enterprise asset management priced for enterprises.

That span is the product. Everything below is sequenced to build it.

### Who it is for

Someone with real gear to account for: a garage of tools, a rack of network equipment, a case of cameras, or a church hall of shared equipment. The unifying word is **gear** — it stretches across a cordless drill, a switch, and a camera body without strain, which is why the product is not named after tools.

---

## Where we actually are

Verified, not aspirational. Run the checks yourself with the commands in [TESTING.md](./TESTING.md).

|          | State                                                                  |
| -------- | ---------------------------------------------------------------------- |
| Frontend | React 18 + TypeScript + Vite, shadcn/ui, Workshop palette              |
| Backend  | **None.** No `fetch`, no `axios`, no API anywhere in `src`             |
| Storage  | localStorage and IndexedDB providers; the `api` provider is a stub     |
| Auth     | localStorage records. Not a security boundary — editable from devtools |
| Tests    | 156 unit, 25 E2E, all green                                            |
| Coverage | 14.76%, ratcheted so it cannot drop                                    |
| CI       | Five jobs green on `main`                                              |

### What already works

Item CRUD with brand, model and serial number. Categories, hierarchical locations, tags. Multiple properties. Receipt OCR via Tesseract.js and PDF parsing. Excel import and export. Four view modes. Light and dark.

### The seam that used to block everything

`src/lib/storage.ts` was a **synchronous** wrapper, localStorage-only by its own docstring,
imported by all 8 pages and contexts. It meant the IndexedDB provider was bypassed by the real
UI and no API provider could ever be wired in.

It is gone. Every call site already awaited its result — awaiting a non-Promise is a no-op, so
the sync wrapper worked by accident — which made the removal a deletion rather than a rewrite.
`@/lib/storage` now resolves to the async provider facade.

---

## The data model is the real work

The current `Item` shape cannot express the vision, and no amount of UI work fixes that. Two problems:

**`condition` is not `status`.** A drill can be in `GOOD` condition _and_ lent to your brother. Those are independent axes, and today only one exists.

**There is no history.** `isArchived` is a boolean. "Sold for $180 on eBay in March after a $40 repair in January" is not a boolean.

### Proposed shape

```ts
// Independent of condition. Where the item is in its life.
type ItemStatus =
  | 'WISHLIST' // wanted, not yet owned
  | 'IN_POSSESSION' // owned and to hand
  | 'LOANED' // lent out, expected back
  | 'IN_REPAIR' // sent away, expected back
  | 'BROKEN' // owned, not usable
  | 'SOLD' // gone, with a sale price
  | 'LOST'; // gone, no sale price

// Append-only. The source of truth for everything historical.
interface ItemEvent {
  id: string;
  itemId: string;
  type:
    | 'ACQUIRED'
    | 'LOANED_OUT'
    | 'RETURNED'
    | 'BROKE'
    | 'SENT_FOR_REPAIR'
    | 'REPAIR_COMPLETED'
    | 'SOLD'
    | 'LOST'
    | 'VALUE_REASSESSED'
    | 'MOVED';
  occurredAt: string;
  note?: string;

  // Type-specific, all optional
  counterparty?: string; // who borrowed it, who repaired it, who bought it
  expectedBackOn?: string; // loans and repairs
  amount?: number; // purchase, repair cost, sale price
  locationId?: string; // MOVED
  createdAt: string;
}
```

`status` and `currentHolder` are **derived** from the event log, then cached on the item for query speed. The log stays the source of truth — that is what makes "what happened to this thing" answerable at all, and it means a mistake is corrected by appending, never by editing history.

### Valuation

`purchasePrice` and `currentEstimatedValue` already exist. What is missing is _how_ the estimate is reached:

```ts
interface Valuation {
  itemId: string;
  method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'MANUAL' | 'MARKET_COMPARABLE';
  usefulLifeMonths?: number;
  salvageValue?: number;
  manualValue?: number;
  lastAssessedAt: string;
}
```

Age of ownership falls out of the `ACQUIRED` event for free. Depreciation is a pure function of purchase price, method, and elapsed time — which makes it trivially unit-testable and a good first slice.

### Wishlist and price watching

The pre-purchase half, and the most differentiated thing in the product:

```ts
interface WishlistEntry {
  id: string;
  organizationId: string;
  name: string;
  brand?: string;
  model?: string;
  targetPrice?: number;
  savedAmount: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
}

interface PriceWatch {
  id: string;
  wishlistEntryId: string;
  retailer: string;
  url: string;
  lastSeenPrice?: number;
  lastCheckedAt?: string;
  alertBelow?: number;
}
```

A wishlist entry converts to a real `Item` on purchase, carrying its saved history across. Price checking needs a server — see the sequencing note in Phase 4.

---

## Phases

Ordered by dependency, not by appeal. Each phase assumes the one above it.

### Phase 1 — Unblock the data layer ✅ done

- [x] Migrate all 8 pages and contexts off the synchronous `src/lib/storage.ts`
- [x] Delete the wrapper; every import now resolves to the async provider facade
- [x] Ship **full export and import** — a versioned, validated JSON backup covering every
      collection, which is both the backup story and the migration path when the backend arrives
- [x] Raise the coverage ratchet

### Phase 2 — Lifecycle 🚧 in progress

_The differentiator. Buildable entirely client-side._

- [x] `ItemEvent` append-only log, stored in both providers and included in backups
- [x] Status and custody **derived** from the log rather than stored — see the note below
- [x] Check in / check out with counterparty and expected return date
- [x] Broken → sent for repair → repair cost → returned
- [x] Sold, with sale price, closing the loop against purchase price
- [x] Item timeline: the whole history of one thing on one screen
- [x] Overdue loans flagged on the item
- [ ] Overdue loans surfaced on the dashboard
- [ ] Status shown in the items list and filterable

**Deviation from the original plan, deliberately.** This document first proposed deriving
status and then caching it on the item. The cache is not built. Denormalising invites
dual-write bugs — exactly the class of bug that `replaceCollection` was added to fix — and
there is no measured performance problem to justify it. Derivation is a pure fold over one
item's events. Cache it when a profile says to, not before.

`ItemStatus` also omits `WISHLIST`. A wanted item is a `WishlistEntry` (Phase 5), not an
owned item in a special state; putting it in the status union would have made every
exhaustive switch carry a case that cannot occur.

### Phase 3 — Value and insight

- `Valuation` with straight-line and declining-balance depreciation
- Age of ownership, cost of ownership, total repair spend per item
- Dashboards: value by category, by location, by brand
- **Brand breakdown reporting** — works identically for tools, IT gear and AV gear, because brand is a field rather than an architecture
- Export reports for insurance and tax

### Phase 4 — Backend, auth, hosted tier

_See [ARCHITECTURE.md](./ARCHITECTURE.md). Three deployment tiers from one codebase._

- Hono + Drizzle + Better Auth in a single container. SQLite by default, Postgres via `DATABASE_URL`
- Server-side password hashing with Argon2id. The existing browser PBKDF2 hashes are worthless server-side — those users re-register
- Sessions in httpOnly cookies, not localStorage
- One `requireOrgAccess(userId, orgId, permission)` guard every handler calls. This is the point at which the four roles become real
- `ApiStorageProvider` and `ApiAuthProvider` behind the interfaces that already exist
- Make the `api` provider stub fail loudly instead of silently falling back
- Google and generic OIDC sign-in, optional and off by default so self-hosters are not forced into it
- **Price watching lands here**, not earlier — scraping retailer prices needs a scheduled server-side job, and doing it from the browser would be both unreliable and rude

### Phase 5 — Wishlist and acquisition

- Wishlist entries with target price, savings progress, and priority
- Price watches with alert thresholds
- Convert a wishlist entry to an owned item on purchase, preserving what was saved

### Phase 6 — Gear profiles

- A single generic **Tool Profile** feature. Brand is data, not architecture, so Milwaukee, DeWalt, Makita, Ryobi and Festool all work on day one and no module carries anyone else's trademark
- Serial and model capture from a photo of the data plate, using the Tesseract OCR already shipped
- A community catalogue under a licence we control, plus optional user-supplied API keys for anyone with legitimate vendor access
- **No plugin SDK yet.** Build a second and third profile concretely, then extract the interface from real examples. An abstraction designed from one case is reliably the wrong abstraction

---

## Release milestones

| Version  | Gate                                                                             |
| -------- | -------------------------------------------------------------------------------- |
| **v0.2** | Phase 1 done. Async storage, export/import working, repo public                  |
| **v0.4** | Phase 2 done. Lifecycle and custody — the first genuinely differentiated release |
| **v0.6** | Phase 3 done. Valuation and dashboards                                           |
| **v0.8** | Phase 4 done. Real auth, real multi-user, self-hostable with a server            |
| **v1.0** | Phase 5 done, coverage at 80%, hosted tier live at `app.brassworth.com`          |

Phase 6 is deliberately after v1.0. It is the most fun and the least load-bearing.

---

## Explicit non-goals

Saying no here saves arguing later.

- **No vendor-branded modules.** Trademark exposure, scraping against terms of service, and redistributing catalogue data are three separate risks stacked on one feature
- **No plugin SDK before three real modules exist**
- **Local-only mode never goes away.** It is the privacy claim, and the claim is the reason to open-source this at all
- **No barcode hardware integrations** until someone asks twice
- **No mobile apps** before the web app is genuinely good. A responsive PWA covers the phone-in-the-garage case

---

## How we work

From [TESTING.md](./TESTING.md), and it is not negotiable:

**No pull request without a passing test that covers the change.** Bug fixes need a test that fails before and passes after. New provider methods are tested against both providers. New user flows get an E2E spec.

Six checks pass locally before a PR opens, and CI runs the same six. Coverage thresholds are a ratchet — they go up, never down.

The reason this is strict: the test suite in this repo had never executed once. Wiring it up surfaced two real bugs within the hour, both in code paths used constantly — every bulk save was silently reassigning record IDs, and logging in immediately logged you back out. Neither was findable by reading the code.
