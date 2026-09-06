# Phase 7 design: Gear in your hand

Dated design record, 2026-09-06. This document captures the reasoning behind Phase 7
at the moment it was decided. [ROADMAP.md](../../ROADMAP.md) is the living document
and wins wherever the two disagree; nothing here should be restated there beyond the
phase checklist and its decision notes.

## Why this phase

Brassworth answers what happened to a thing and what it is worth now. Everything
through v1.1 shipped that story on a desktop. The usage moment it describes does not
happen at a desk.

Somebody checks a drill out standing in front of the drill. Somebody records a break
holding the broken thing. Phase 6 shipped a data plate reader that reads a serial
number off a sticker on the back of a machine, and there is no way to reach it from a
phone. That is the gap Phase 7 closes.

Two supporting facts settled the priority. There are no users yet, so serving a hosted
tier serves nobody, while making the app usable where gear physically lives is what
earns the first ones. And the non-goals already promised that "a responsive PWA covers
the phone-in-the-garage case" while `public/` contains no manifest and nothing registers
a service worker. The claim was aspirational. Phase 7 makes it true.

## What is in the way

`/items/:id` routes to `ItemForm`, and `ItemLifecycle` and `ItemValueSummary` are
mounted at the bottom of it. An item's entire life therefore lives underneath a
648-line edit form. On a phone, checking a drill back in means scrolling past every
input field in the application. Scan-to-checkout cannot be built on that, and neither
can anything else in this phase.

## Design

### An item view route

`/items/:id` becomes `ItemView`, a read-and-act page. Editing moves to
`/items/:id/edit`.

`ItemView` carries, in order: photo, name, brand and model, status badge, the primary
actions (check out, check in, mark broken), then `ItemValueSummary` and
`ItemLifecycle`. `ItemForm` drops those two mounts and shrinks toward being only a
form.

This is the URL a QR code points at, and the page a scan has to land on for a checkout
to be two taps rather than a scroll.

### What a QR code encodes

A full URL, `<origin>/items/<id>`, not a bare identifier.

That choice removes a dependency. A phone's own camera app reads a QR code and opens a
URL with nothing installed, on both platforms. The in-app scanner therefore only has to
exist for what the native camera cannot serve, and it can use `BarcodeDetector` where
the browser has it and lazily `import()` a decoder polyfill only where it does not.
Neither path costs anything in the default bundle.

The identifier in a QR code is not an access grant. Server mode still requires a
session; local mode points at a host a stranger cannot reach. A label on a drill in a
driveway leaks nothing.

Label sheets are a printable HTML grid rendered through the browser's own print dialog.
No PDF dependency.

### Offline

`vite-plugin-pwa` supplies the manifest, the icons and a Workbox service worker. The
app shell is precached. API `GET` responses are cached stale-while-revalidate.

The outbox queues `ItemEvent` appends only: check out, check in, moved, broke, sent for
repair, returned. It is stored in IndexedDB through `dexie`, already a dependency.

Three decisions make replay safe.

**The client generates the event id.** Replay is then idempotent, because the server
upserts by id. A queue flushed twice across a flaky reconnect cannot double-record a
checkout.

**Nothing mutable is queued.** Item creates, edits, deletes and standalone photo
uploads are refused offline with a plain message. Last-write-wins on a mutable row
loses data; appending to a log cannot.

**A 401 during replay never drops the queue.** A session can expire while a phone is in
a basement. Replay pauses, prompts for sign-in, and resumes.

Conflicts do not exist here by construction, but one surprise does: two people checking
the same item out offline both succeed. Both events land in the timeline, the fold
resolves current status to the later `occurredAt`, and the item shows two checkouts.
That is what actually happened, and it is more useful than one of them silently
vanishing.

### Capture

**Camera-first entry.** `/items/new` gains a camera path. Shoot the gear, shoot the data
plate, the existing `dataPlate.ts` OCR fills brand, model and serial, and the catalogue
profile fills the rest under the Phase 6 rule that a profile fills blank fields only and
never overwrites what somebody typed.

**Condition photos on lifecycle events.** `ItemEvent` gains optional `photoIds`: a
damage photo on `BROKE`, a return photo on `RETURNED`.

This forces the one exception to the outbox rule. A damage photo taken with no signal is
the whole point of the `BROKE` event, so the outbox carries photo blobs as part of the
append they belong to, rather than as an independent mutable write. The cap is three per
event and 5 MB in total; over the cap the event still queues and says the photo was
dropped. This is the only place the queue holds a payload, and it is worth the
complexity exactly once.

**UPC and EAN.** Catalogue profiles gain an optional `upcs` list. A scan resolves
against the bundled catalogue first, offline and without a network call. A miss falls
through to an optional server-side lookup source, `GEAR_UPC_LOOKUP_URL` plus an optional
key, off unless configured. Same shape as the Phase 6 vendor catalogue, server-side
because a browser cannot hold a key, and never scraping.

A miss with no source configured is still useful. The code is stored on the item as
`barcode`, so scanning it again finds your own gear. UPC scanning therefore works on day
one with no external data at all; it identifies your things rather than describing new
ones, and a boxed item needs no printed label.

### Two defaults change

**IndexedDB becomes the default storage provider.** `src/lib/storage/index.ts` currently
defaults to `localStorage`. A PWA that stores photos and works offline cannot sit on a
synchronous store of five to ten megabytes; photos alone break it. `autoMigrateIfNeeded`
is unproven against real data, so this lands with migration tests rather than a changed
default alone. `VITE_STORAGE_PROVIDER=localStorage` remains as the escape hatch.

**`xlsx` moves behind a dynamic import.** 425 KB precached onto a phone over a cellular
connection is a Phase 7 concern on performance grounds. Its two unfixed high advisories
are not fixed by this, and that is left named and open rather than folded quietly into a
capture phase.

## Milestones

The existing table stops at v1.1 while the repository released v2.0.0. It gains a v2.0
row recording what was already decided: 2.0.0 was major because the persistence rename
breaks stored data, not because of feature scope.

| Version  | Gate                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| **v2.0** | Done. Not a feature release. Persistence renamed to Brassworth, breaking stored data. First public release |
| **v2.1** | Item view route, printable QR labels, scan to open, installable, offline reads                             |
| **v2.2** | Event outbox, so checkout and check-in work with no signal. IndexedDB as default                           |
| **v2.3** | Camera-first entry, condition photos, UPC scanning. Phase 7 complete                                       |

Each release is one complete workflow. Platform pieces are built where a slice needs
them, not ahead of one. Building the offline engine first would repeat the mistake the
roadmap already names, when price watching was moved out of Phase 4 because a watcher
with nothing to watch is infrastructure for a feature that does not exist yet.

## Testing

The standing constraint applies unchanged: no pull request without a passing test
covering the change, and six checks green locally before it opens. See
[TESTING.md](../../TESTING.md).

New end-to-end coverage for deep-link scan targets, offline reads through
`context.setOffline(true)`, and outbox replay. Unit coverage for replay idempotency, the
401 pause, the photo cap, and the IndexedDB migration. Service workers are a known
source of end-to-end flake; that is written into `TESTING.md` as part of this phase
rather than discovered by somebody else later.

## Non-goals

Amended, not reversed.

**No barcode hardware integrations.** This stands. A phone camera is not a barcode gun,
and the roadmap says so explicitly so that camera scanning does not read as a quiet
reversal.

**No native applications.** This stands. Phase 7 is the responsive installable web app
that the non-goal always pointed at.

**No offline writes to mutable records.** New. Only appends to the event log queue.

## Later phases

**Phase 8, the hosted tier** at `app.brassworth.com`: organisation provisioning,
billing, custom domains, backups and operations. No checklist and no version number
until it is next.

**Phase 9, deepening the lifecycle**: maintenance and service schedules, warranty
expiry, an insurance claim packet, borrower reminders on overdue loans. All buildable on
`ItemEvent`. Same caveat.
