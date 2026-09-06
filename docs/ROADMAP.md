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

|          | State                                                                   |
| -------- | ----------------------------------------------------------------------- |
| Frontend | React 18 + TypeScript + Vite, shadcn/ui, Workshop palette               |
| Backend  | Hono API in `server/`, wired to the app via `VITE_STORAGE_PROVIDER=api` |
| Storage  | localStorage, IndexedDB and API providers, all three real               |
| Auth     | Server-enforced in the API tier; still localStorage in the local tier   |
| Tests    | 1001 unit and server, 60 E2E, all green                                 |
| Coverage | 88.2% statements, 87.7% branches, 80.2% functions; ratcheted            |
| CI       | Six jobs green on `main`, including a documentation check               |

### What already works

Item CRUD with brand, model and serial number. Categories and hierarchical locations. Multiple properties. Receipt OCR via Tesseract.js. Excel import and export. Four view modes, with search, filters and bulk edit. Light and dark.

Tags are in the data model but have **no user interface** — there is no way to create or assign one. Treat them as unbuilt, not as a feature.

There is also **no service worker and no manifest**. The app is responsive, but it is not installable and it does nothing offline in server mode. Phase 7 is where that stops being true.

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

A wishlist entry converts to a real `Item` on purchase, carrying its saved history across. Price checking needs a scheduled server-side job, which Phase 4 provides.

---

## Phases

Ordered by dependency, not by appeal. Each phase assumes the one above it.

### Phase 1 — Unblock the data layer — done

- [x] Migrate all 8 pages and contexts off the synchronous `src/lib/storage.ts`
- [x] Delete the wrapper; every import now resolves to the async provider facade
- [x] Ship **full export and import** — a versioned, validated JSON backup covering every
      collection, which is both the backup story and the migration path when the backend arrives
- [x] Raise the coverage ratchet

### Phase 2 — Lifecycle — done

_The differentiator. Buildable entirely client-side._

- [x] `ItemEvent` append-only log, stored in both providers and included in backups
- [x] Status and custody **derived** from the log rather than stored — see the note below
- [x] Check in / check out with counterparty and expected return date
- [x] Broken → sent for repair → repair cost → returned
- [x] Sold, with sale price, closing the loop against purchase price
- [x] Item timeline: the whole history of one thing on one screen
- [x] Overdue loans flagged on the item
- [x] Overdue loans surfaced on the dashboard
- [x] Status shown in the items list and filterable

**Deviation from the original plan, deliberately.** This document first proposed deriving
status and then caching it on the item. The cache is not built. Denormalising invites
dual-write bugs — exactly the class of bug that `replaceCollection` was added to fix — and
there is no measured performance problem to justify it. Derivation is a pure fold over one
item's events. Cache it when a profile says to, not before.

`ItemStatus` also omits `WISHLIST`. A wanted item is a `WishlistEntry` (Phase 5), not an
owned item in a special state; putting it in the status union would have made every
exhaustive switch carry a case that cannot occur.

### Phase 3 — Value and insight — done

- [x] Straight-line and declining-balance depreciation, with a salvage floor
- [x] Age of ownership, cost of ownership, total repair spend per item
- [x] Value summary on the item page
- [x] Dashboards: value by category, by location, by brand
- [x] **Brand breakdown reporting** — works identically for tools, IT gear and AV gear,
      because brand is a field rather than an architecture
- [x] Export reports for insurance and tax (CSV, RFC 4180 escaped)

**Deviation, deliberately.** This document sketched a separate `Valuation` collection.
It is not built. Those settings are strictly one-to-one with an item and have no lifecycle
of their own, so a separate table would buy nothing and cost a join, a migration and a
second write path. They live on `Item` as optional fields.

`MARKET_COMPARABLE` is also dropped from the method list. With no price data source behind
it, it would produce a number that looks authoritative and is invented.

### Phase 4 — Backend, auth, hosted tier — done

_See [ARCHITECTURE.md](./ARCHITECTURE.md). Three deployment tiers from one codebase._

- [x] Hono API in `server/`, Drizzle over libSQL. SQLite by default via `DATABASE_URL`
- [x] Server-side password hashing — **scrypt**, not Argon2id; see the note below
- [x] Sessions as opaque tokens in httpOnly, SameSite cookies. Only a hash is stored
- [x] One `requireOrgAccess(userId, orgId, permission)` guard, with the four roles enforced
- [x] `ApiStorageProvider` and `ApiAuthProvider` behind the interfaces that already existed
- [x] Every remaining table: locations, categories, tags, photos, documents, user roles
- [x] The `api` storage provider **fails loudly** rather than silently writing to localStorage
- [x] Docker packaging — one image serving the API and the built app on one origin
- [x] Generic OIDC, optional and **off unless configured**

**scrypt rather than Argon2id, deliberately.** Argon2 is the stronger first choice on paper,
but every Node binding is a native module, and this project's pitch to self-hosters is that
running it is easy. scrypt is OWASP's named second choice, is memory-hard, and ships in the
standard library. Stored hashes are self-describing, so the parameters can change later.

**A non-member gets 404, not 403.** Telling a stranger "that property exists, you just
cannot see it" leaks which properties exist. A member who lacks the specific permission gets
403, because they already know it exists.

**OIDC links by subject, never by email alone.** An address can change hands, so a provider
that does not verify addresses would otherwise let somebody claim an existing account by
asserting its address. Auto-linking to an existing account happens only when the provider
says the address is verified; otherwise the attempt is refused and explained.

**Price watching moved to Phase 5.** This document previously placed it here because it needs
a scheduled server-side job, which now exists. But a price watch watches a _wishlist entry_,
and wishlist entries are Phase 5 — building a watcher with nothing to watch is infrastructure
for a feature that does not exist yet. It belongs with the thing it operates on.

### Phase 5 — Wishlist and acquisition — done

- [x] Wishlist entries with target price, priority and where you saw it
- [x] Savings tracked as an **append-only log**, not a running total — the same choice as
      `ItemEvent`, so a correction is another row rather than an edit
- [x] Convert a wishlist entry to an owned item on purchase, preserving what was saved
- [x] Price observations, history and alerts against a target

**Savings are a log, and the total is derived.** A `savedAmount` field would have been
smaller, but it makes "where did this number come from" unanswerable and turns every
correction into a destructive edit. A negative amount is a withdrawal.

**A bought entry stays on the list, marked bought.** Deleting it would erase the record of
what the saving was for, so it sinks to the bottom instead. Its savings stop counting
towards outstanding totals, because that money has been spent.

**Buying records an `ACQUIRED` event, not just a purchase date.** The new item therefore
starts life with the same history every other item has.

**Backup coverage was a defect, fixed in Phase 6.** The wishlist, its savings log and its price
history were added here and never wired into export or restore, so backing up and restoring
silently destroyed all three — including the savings log, which is append-only precisely so
that money records cannot be lost. `tests/lib/backupCoverage.test.ts` now asserts the whole
surface, so the next collection cannot be forgotten the same way.

**Prices are a series, not a latest value.** A single current price cannot answer "is this
actually a good deal or just what it always costs", which is what a price alert is really
being asked. Alerts fire only against an explicit target — alerting on "it moved a bit"
trains people to ignore the alert, which is worse than not alerting.

**Automated price checking reads structured data only, never the rendered page.** It parses
`schema.org/Product` offers from `application/ld+json`, which retailers publish deliberately
for machines. Scraping a layout would be fragile, generally against terms of service, and
rude at any scale. It also fetches and obeys `robots.txt` per host, refuses when robots.txt
cannot be read rather than assuming permission, keeps a minimum gap between requests to one
host and honours any `Crawl-delay`, accepts only `https`, and is **off unless a self-hoster
sets `PRICE_WATCH_ENABLED=true`**. Manual price entry needs none of that and always works.

### Phase 6 — Gear profiles — done

_See [CATALOGUE.md](./CATALOGUE.md)._

- [x] A single generic **gear profile** feature. Brand is a string on a row, so Milwaukee,
      DeWalt, Makita, Ryobi and Festool all work on day one and no module carries anyone
      else's trademark. The shipped catalogue spans power tools, network gear and audio gear
      through one code path
- [x] Serial and model capture from a photo of the data plate, using the Tesseract OCR already
      shipped for receipts
- [x] A community catalogue under **ODbL 1.0**, with contents under DbCL 1.0
- [x] Optional vendor catalogue sources with a user-supplied API key, **server-side**
- [x] No plugin SDK

**Catalogue records are never stored.** They ship with the app and are merged in at read time;
only profiles somebody writes themselves are persisted. Storing them would copy a read-only
dataset into every tenant, put data that is not the user's into every backup, and turn a
catalogue update into a migration.

That forces the next decision: a catalogue profile's id is **derived** from its brand and model
(`catalogue:dewalt::dcd791d2`) rather than assigned, so an item's link survives the catalogue
being updated, reordered or replaced by a vendor feed. The link is to a model, not to a row in
a file. For the same reason `items.gear_profile_id` is deliberately **not a foreign key** — it
holds either a stored profile's id or a derived catalogue id, and a constraint would reject
exactly the links the catalogue exists to create.

**Specs are label/value pairs, not typed fields.** A drill, a rack switch and a camera body
share almost no spec fields; a typed record would grow a new optional column per product type,
which is a vendor module wearing a different hat.

**ODbL rather than Creative Commons.** This is a database of facts, and ODbL is the licence
written for that case — the one OpenStreetMap uses. Share-alike is what "a licence we control"
means in practice: CC0 would be easier to contribute to and would give away exactly that
control.

**Vendor API keys live on the server, deliberately.** A browser cannot hold a key — anything
the client can send, a user can read out of the bundle or the network tab. So a vendor source
is `GEAR_CATALOGUE_URL` plus an optional key in the server environment, off unless configured,
following the rule price watching set in Phase 5. A vendor document is validated by exactly the
same rules as the shipped file: it is not more trusted for having been paid for.

**The plate reader recognises only known brands.** Guessing the maker from the most prominent
line reliably returns `MADE IN CHINA` or `INDUSTRIAL TOOL CO.`, and a confidently wrong brand
is worse than a blank one. Same call as dropping `MARKET_COMPARABLE`. What it recognises
therefore grows with the catalogue rather than with a hardcoded list.

**A profile fills blank fields only, and never copies specs onto the item.** Somebody who typed
`DEWALT (used)` meant it. Specs stay on the profile so that correcting one fixes every item
sharing the model — the entire reason profiles exist rather than more item fields.

**Deviation, deliberately.** This document proposed "optional user-supplied API keys" alongside
a community catalogue, which reads as per-vendor integrations. There is no per-vendor module
and no plugin SDK: a vendor source is a URL returning a document in the documented format.
Building an interface with no implementation behind it is the abstraction-from-one-case the
roadmap warns against, and it works today with any vendor that publishes JSON.

### Phase 7 — Gear in your hand — in progress

_Everything above shipped on a desktop. The usage moment this product describes does not
happen at a desk._ See [the design record](./superpowers/specs/2026-09-06-phase-7-gear-in-your-hand-design.md).

- [x] An item **view** route. `/items/:id` is a read-and-act page and editing has moved to
      `/items/:id/edit`. It used to open the edit form, with the timeline and the value
      summary mounted beneath 648 lines of inputs
- [x] Printable QR labels, and scanning one to open the item and check it in or out
- [x] Installable, with an app shell and offline reads
- [ ] An outbox that queues lifecycle events written with no signal, and replays them
- [ ] IndexedDB as the **default** storage provider, with migration tests
- [ ] Camera-first item entry, reaching the Phase 6 data plate reader from a phone
- [ ] Condition photos attached to a lifecycle event
- [ ] UPC and EAN scanning, resolved against the catalogue

**A QR code encodes a URL, not an identifier.** A phone's own camera app opens a URL with
nothing installed, on both platforms, so the in-app scanner only has to exist for what the
native camera cannot serve — and it can use `BarcodeDetector` where the browser has one and
lazily import a decoder only where it does not. Neither path costs anything in the default
bundle. The identifier in a label is not an access grant either: server mode still requires a
session, and local mode points at a host a stranger cannot reach.

**The outbox queues appends, never mutable writes.** Item creates, edits and deletes are
refused offline. Last-write-wins on a mutable row loses data; appending to a log cannot, which
is the same reasoning that made `ItemEvent` and the savings log append-only. Three things make
replay safe: the client generates the event id, so a queue flushed twice across a flaky
reconnect cannot double-record a checkout; a 401 during replay pauses the queue rather than
dropping it, because a session can expire while a phone is in a basement; and genuine conflicts
cannot arise, because appends commute.

Two people checking the same item out offline both succeed. Both events land in the timeline
and the fold resolves status to the later one. That is what actually happened, and it beats one
of them silently vanishing.

**Condition photos are the one exception**, and deliberately so. A damage photo taken with no
signal is the whole point of a `BROKE` event, so the outbox carries the blob as part of the
append it belongs to rather than as an independent write — capped, and honest when it drops one.

**UPC scanning works with no external data.** A scan resolves against the bundled catalogue
first; a miss stores the code on the item, so scanning it again finds your own gear. An optional
server-side lookup source can be configured on top, following the rule Phase 5 set and Phase 6
reused: server-side because a browser cannot hold a key, off unless configured, never scraping.

**IndexedDB becomes the default** because a PWA that stores photos and works offline cannot sit
on a synchronous store of five to ten megabytes. `autoMigrateIfNeeded` is unproven against real
data, so this lands with migration tests rather than a changed default alone.
`VITE_STORAGE_PROVIDER=localStorage` stays as the escape hatch.

### Phase 8 — The hosted tier

`app.brassworth.com`: organisation provisioning, billing, custom domains, backups and the
operational work of running it. The last gate named at v1.0 and still open. No checklist here
until it is next — committing to details nobody has thought through is how a roadmap starts
lying.

### Phase 9 — Deepening the lifecycle

Maintenance and service schedules, warranty expiry, an insurance claim packet, reminders to
whoever is holding an overdue loan. All of it folds over `ItemEvent`, which is why it can wait
without becoming harder. Same caveat as Phase 8.

---

## Release milestones

| Version  | Gate                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| **v0.2** | Done. Phase 1. Async storage, export and import working                                                        |
| **v0.4** | Done. Phase 2. Lifecycle and custody, the first genuinely differentiated release                               |
| **v0.6** | Done. Phase 3. Valuation and dashboards                                                                        |
| **v0.8** | Done. Phase 4. Real server-side auth, self-hostable with a server                                              |
| **v1.0** | Done. Phase 5, and coverage past 80%                                                                           |
| **v1.1** | Done. Phase 6. Gear profiles, the community catalogue, and data plate scanning                                 |
| **v2.0** | Done. Not a feature release. Persistence renamed to Brassworth, which breaks stored data. First public release |
| **v2.1** | Item view route, printable QR labels, scan to open, installable, offline reads                                 |
| **v2.2** | The event outbox, so checkout and check-in work with no signal. IndexedDB as default                           |
| **v2.3** | Camera-first entry, condition photos, UPC scanning. Phase 7 complete                                           |

Phase 6 was deliberately scheduled after v1.0 — the most fun and the least load-bearing — and
shipped there.

**2.0.0 is major because of data, not scope.** Renaming every persistence identifier to
Brassworth breaks stored data, and no migration was shipped — deliberately, because the repo
was not yet in use by anyone. Nothing about the feature set changed at that version.

Phase 7 is three releases rather than one. Each is a complete workflow that stands on its own:
find it and open it, then make it work with no signal, then reach for the camera. Building the
offline engine first would repeat the mistake this document already names, when price watching
moved out of Phase 4 because a watcher with nothing to watch is infrastructure for a feature
that does not exist yet.

---

## Explicit non-goals

Saying no here saves arguing later.

- **No vendor-branded modules.** Trademark exposure, scraping against terms of service, and redistributing catalogue data are three separate risks stacked on one feature
- **No plugin SDK before three real modules exist**
- **Local-only mode never goes away.** It is the privacy claim, and the claim is the reason to open-source this at all
- **No barcode hardware integrations** until someone asks twice. Phase 7 reads codes with the camera already in your pocket, which is not the same thing and is not a reversal of this
- **No native mobile apps.** Phase 7 builds the installable, offline-capable web app this non-goal always pointed at. No app stores
- **No offline writes to mutable records.** Only appends to the event log queue, because appends cannot conflict and a last-write-wins edit can lose somebody's work

---

## How we work

From [TESTING.md](./TESTING.md), and it is not negotiable:

**No pull request without a passing test that covers the change.** Bug fixes need a test that fails before and passes after. New provider methods are tested against both providers. New user flows get an E2E spec.

Six checks pass locally before a PR opens, and CI runs the same six. Coverage thresholds are a ratchet — they go up, never down.

The reason this is strict: the test suite in this repo had never executed once. Wiring it up surfaced two real bugs within the hour, both in code paths used constantly — every bulk save was silently reassigning record IDs, and logging in immediately logged you back out. Neither was findable by reading the code.
