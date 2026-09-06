# User guide

A reference for every screen in Brassworth. If you have not run it yet, start
with [Getting started](./GETTING_STARTED.md) instead — this document assumes
you are already looking at the app.

- [Concepts](#concepts)
- [Items](#items)
- [Views, search and filters](#views-search-and-filters)
- [Selecting, bulk edit, archive and delete](#selecting-bulk-edit-archive-and-delete)
- [Photos, receipts and documents](#photos-receipts-and-documents)
- [Receipt scanning](#receipt-scanning)
- [Data plates and gear profiles](#data-plates-and-gear-profiles)
- [Excel import and export](#excel-import-and-export)
- [Properties](#properties)
- [Locations and categories](#locations-and-categories)
- [People, roles and permissions](#people-roles-and-permissions)
- [Settings](#settings)
- [Themes](#themes)
- [Accessibility](#accessibility)
- [Things that are not there yet](#things-that-are-not-there-yet)

## Concepts

**Property.** The top-level container — a house, a church, a workshop, a small
business. Items, locations, categories and the wishlist all belong to exactly
one property, and the app always has one property selected. Switching property
switches everything you see.

**Item.** One physical thing you own. Not a model, not a product line: _your_
drill, with _its_ serial number, in _its_ place.

**Location.** Where an item physically is. "Garage shelf", "Rack 2", "Van".

**Category.** What kind of thing it is. "Power tools", "Network", "Audio".
Categories drive filtering and the value breakdown on the dashboard.

**Gear profile.** A make and model described once and shared by every item that
is one. Specs live on the profile, not copied onto each item, so correcting a
spec fixes every item that shares the model. See
[Gear catalogue](./CATALOGUE.md).

### Status and condition are different things

This trips people up, so it is worth being explicit.

**Condition** is a physical judgement you set on the item: New, Good, Fair,
Poor, Damaged or Disposed. You choose it, and you change it when the thing
changes.

**Status** is where the item is in its life: In possession, Loaned out, In
repair, Broken, Sold or Lost. You never set it. It is _derived_ from the item's
history — the append-only log of things that have happened to it.

They are independent. A drill can be in Good condition and loaned out. A camera
can be in Poor condition and still in your possession. Conflating them is why
most inventory apps cannot express a loan at all.

Recording events, reading a timeline, overdue loans, repair costs, and what each
event type means: [Lifecycle](./LIFECYCLE.md).

## Items

`/items` lists them. `/items/new` creates one. `/items/:id` opens one for
editing, and is the only place the History card appears — you have to save an
item before you can record anything against it.

### Fields

Only **Name** and **Condition** are required.

| Field                          | What it is for                                                                |
| ------------------------------ | ----------------------------------------------------------------------------- |
| Name                           | Required. What you would call it out loud.                                    |
| Description                    | Free text.                                                                    |
| How should value be estimated? | None, Straight line, Declining balance or Manual. See [Value](./VALUE.md).    |
| Useful life (months)           | Straight line only: months from purchase until it reaches its salvage value.  |
| Value lost per year (%)        | Declining balance only: the share of remaining value lost each year.          |
| Value it never drops below     | The floor. Depreciation stops here.                                           |
| Category                       | Pick from the categories on this property.                                    |
| Location                       | Pick from the locations on this property.                                     |
| Brand, Model                   | Also what matches the item to a gear profile.                                 |
| Serial number                  | The one thing an insurer will ask for and you will not have.                  |
| Condition                      | Required. New, Good, Fair, Poor, Damaged, Disposed.                           |
| Quantity                       | For things you own several identical copies of. Defaults to 1.                |
| Purchase date, Purchase price  | Feed every depreciation calculation and the cost-of-ownership figures.        |
| Current estimated value        | What it is worth now. Calculated for you unless the method is Manual or None. |
| Purchase source                | Store, Online, Donation or Other.                                             |
| Source name                    | Which store, which site.                                                      |
| Notes                          | Free text.                                                                    |
| Photos                         | Any number, 5 MB each. See [Photos](#photos-receipts-and-documents).          |

Fill in what you know. A record with a name and a photo is worth more than no
record, and every field can be added later.

## Views, search and filters

Four views of the same list, chosen with the buttons above the item grid:

| View        | Shows                                                                |
| ----------- | -------------------------------------------------------------------- |
| **Grid**    | Cards with the photo, status badge, location and value. The default. |
| **List**    | One compact row per item. Good for scanning a long catalogue.        |
| **Gallery** | Photo-led, minimal text. Good for identifying things visually.       |
| **Table**   | Spreadsheet-shaped, most fields visible at once.                     |

Above them, an **Active** / **Archived** pair of tabs. Everything below —
search, filters, selection, export — operates on the tab you are on.

**Search** matches item name, brand, model and serial number.

**Filters**, each an independent dropdown that narrows the list further:

- **Category** — any category on this property
- **Location** — any location on this property
- **Condition** — New, Good, Fair, Poor, Damaged
- **Status** — In possession, Loaned out, In repair, Broken, Sold, Lost

The status filter is the fast answer to "what is out on loan right now" and
"what is sitting at the repair shop".

## Selecting, bulk edit, archive and delete

**Selecting.** Tick items individually, or use **Select all** / **Deselect all**
to take the whole filtered list. Selection follows the filters, so the usual
move is to filter down to the set you want and then select all.

**Bulk edit** appears once something is selected. It changes **category** and
**location**, and nothing else. Both default to "Keep existing", so you can
change one without touching the other. This is the tool for the day you decide
the shelf in the garage is really two shelves.

**Archive** takes an item out of the active list without destroying it. Use it
for things you no longer own but whose record you want to keep — the sold
mower, the stolen bike, the drill you gave away. Archived items keep their full
history and appear under the **Archived** tab.

**Restore** moves an archived item back to Active.

**Delete** is permanent, asks for confirmation, and does not keep the history.
Archive is almost always the right choice; delete is for records created by
mistake.

## Photos, receipts and documents

**Photos** attach to items. Add them from the Photos section at the bottom of
the item form. Each file is capped at **5 MB**, and photos are stored inline as
data URLs rather than as separate files.

That last detail matters in local-first mode. Browser `localStorage` gives an
origin roughly **5 MB in total** — for everything, not per photo — so a
photo-heavy catalogue will hit the quota and saves will start failing. If you
intend to photograph things, switch storage before you build the catalogue:

```bash
VITE_STORAGE_PROVIDER=indexeddb
```

IndexedDB has a far larger budget and migrates your existing localStorage data
across on first use. Server mode has no such limit. Details and the full
variable reference in [Self-hosting](./SELF_HOSTING.md).

**Documents** exist in the data model with types for receipts, warranties,
appraisals and insurance policies, but the only one the interface currently
creates is a **receipt**, saved automatically when you scan one. There is no
general "attach a document" button yet. Warranty PDFs and appraisals have
nowhere to go for now.

## Receipt scanning

Turns a receipt into items, without typing them.

1. On `/items`, click **Scan Receipt**.
2. Give it an image or PDF of the receipt — or paste the text of an emailed
   receipt into the box instead, which is both faster and more accurate when
   you have the text.
3. Brassworth runs OCR locally in your browser (Tesseract.js — the image is not
   uploaded anywhere) and shows the parsed line items in a review table.
4. Tick the lines that are actually things you own. Receipts are full of
   subtotals, discounts, deposits and coffee.
5. Set the **store name** and **purchase date**, and optionally a **category**
   and **location** to apply to everything you create.
6. Click through to create the items.

**Nothing is saved until you confirm.** OCR on a crumpled thermal receipt is
approximate, and a parser that wrote directly to your catalogue would be worse
than useless.

The receipt image itself is stored as a document against the property, so you
have the original when an insurer asks.

Tips: flatten the receipt, light it evenly, fill the frame. Long receipts scan
better in two photographs than one.

## Data plates and gear profiles

Most tools, appliances and rack gear carry a rating plate with the make, model
and serial number on it. Typing those in is where cataloguing stalls, so
Brassworth reads them.

On the item form, above the Brand field, click **Scan data plate**. On a phone
this opens the camera; on a desktop, a file picker. Brassworth runs OCR on the
photograph, parses out brand, model and serial number, and fills the fields in.

**It never saves.** The values are filled in for you to check. Plate text is
ambiguous by nature — zeroes and letter O's, model numbers wrapped onto a second
line, a part number sitting where you expected a model. Read it, fix it, then
save.

If the brand and model match a **gear profile**, the item is linked to that
profile and inherits the shared specification, manual link and parts link for
that model. Brassworth ships with a small community catalogue of 18 make and
model profiles across 13 brands, published under ODbL-1.0. You can also write
your own profiles, which take precedence over any catalogue.

Where profiles come from, how matching works, and how to add your own:
[Gear catalogue](./CATALOGUE.md).

## Excel import and export

**Export** is on the Items page. It writes an `.xlsx` file of whatever the
current filters and the Active/Archived tab are showing — filter first, then
export, if you want a subset.

Fifteen columns, in this order:

`Name`, `Description`, `Category`, `Location`, `Brand`, `Model`,
`Serial Number`, `Condition`, `Quantity`, `Purchase Price`,
`Current Estimated Value`, `Purchase Date`, `Purchase Source`,
`Purchase Source Name`, `Notes`

**Import** takes a spreadsheet with those same column headings. Click
**Import** on the Items page and either choose a file or drop one on the
dialog; `.xlsx` and `.xls` are both accepted. The dialog also offers
**Download template**, which gives you a blank workbook with the fifteen
columns and one example row. Use it — the importer matches on column _name_,
so a renamed heading is a silently dropped field.

`Category` and `Location` are matched by name against what already exists on
the property.

**Excel export is not a backup.** It carries items only — no history, no
photos, no wishlist, no properties, no events. For a complete copy see
[Backup and restore](./BACKUP.md).

## Properties

`/organizations`. Create, rename, switch between and delete properties.

A property has a **name**, a **type** (Home, Church, Small Business, Other) and
an optional **address**. The type is descriptive; it does not change how the app
behaves.

**Switching** is done from the property selector in the top navigation, and
changes everything at once — items, locations, categories, wishlist, dashboard.
If items you expect are missing, check which property you are in first. It is
the most common cause.

Deleting a property deletes its contents. Take a backup first.

## Locations and categories

**Locations** (`/locations`) are physical places. Each has a name and optional
notes, and each card shows how many items are stored there. Start with fewer,
broader locations than you think you need — splitting one later is easy,
reconciling fifteen is not.

**Categories** (`/categories`) are kinds of thing. Each has a name and an
optional description. Categories drive the item filter and the per-category
value breakdown on the dashboard.

Both are per-property, and both are managed by Admins and Managers.

## People, roles and permissions

Brassworth has four roles. A role is held per person, per property — someone
can be an Admin of the workshop and a Viewer of the church.

| Role            | Can                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Admin**       | Everything: manage people, edit property settings, and permanently delete items.                                  |
| **Manager**     | Add, edit and archive items; manage locations and categories; export. Cannot delete permanently or manage people. |
| **Contributor** | View items and add new ones. Nothing else.                                                                        |
| **Viewer**      | View items and export. Changes nothing.                                                                           |

Behind those four roles are ten permissions: view, add, edit, delete and
archive items; manage locations; manage categories; manage users; manage the
organisation; and export data. The exact role-to-permission matrix lives in
[Data model](./DATA_MODEL.md) and is the single authority on it.

`/users` lists the people on the current property and their roles, and is
reachable only by someone with the manage-users permission.

**Be aware of what roles mean in each mode.** In local-first mode there is no
server, so roles decide what the interface offers and nothing more — anyone who
can open the browser can change the stored records directly. In server mode
membership and role are looked up server-side on every request and are a real
control. [Security](../SECURITY.md) sets out both models properly.

**Adding a second person does not work yet.** In server mode there is no route
to add a member to a property, and the invite dialog reports itself as
unavailable. Multi-person use is currently only possible in local-first mode,
where it is a convenience rather than a boundary.

## Settings

`/settings`, reachable by Admins and Managers. Four tabs.

**Users** — the people on this property, and a summary of what each role can do.

**Organization** — the current property's name, type and address.

**Data** —

- **Download backup**: everything, in one file. Every property, item, event,
  photo and document.
- **Restore from backup**: choose a backup file. You are shown what it contains
  before anything is replaced.
- **Export Data**: the Excel report, the same one as on the Items page.
- **Import Data**: sends you to the Items page importer.
- **Danger zone**: clear all data. Irreversible, Admin only, and worth taking a
  backup before touching.

Backups, the file format, and moving data between modes:
[Backup and restore](./BACKUP.md).

**Security** — a read-only summary of which authentication provider and storage
provider this installation is using.

## Themes

The theme toggle in the top navigation offers **Light**, **Dark** and
**System**. System follows your operating system's setting and changes with it.
The choice is stored locally in the browser and does not travel with your
account.

## Accessibility

What is actually implemented, rather than what would be nice:

- **Skip link.** A "Skip to main content" link is the first focusable element on
  every page, visible once focused, and jumps past the navigation.
- **Keyboard navigation.** The interface is built on Radix primitives, so
  dialogs, dropdowns, tabs and menus have their standard keyboard behaviour:
  Tab and Shift+Tab to move, arrow keys within a group, Enter to activate,
  Escape to dismiss. Focus is trapped inside open dialogs and returned when they
  close.
- **Labelled controls.** Icon-only buttons — view switchers, edit and delete
  actions, the property switcher — carry accessible labels.
- **axe-core in development.** Running `npm run dev` loads `@axe-core/react`,
  which reports accessibility violations to the browser console as you use the
  app. It does not run in production builds.

Notes on the accessibility seams and how they are tested: [Extending](./EXTENDING.md).

There are no application keyboard shortcuts. Nothing is bound to Ctrl+K.

## Things that are not there yet

Stated plainly, because finding out by looking for a button is worse.

- **No password reset.** If you lose a local-first password, the account is
  gone; the data is still in the browser, but nothing in the app will let you
  back in. In server mode an administrator has no reset route either. Use a
  password manager.
- **No tags.** Tags exist in the data model but there is no way to create or
  assign one. Use categories.
- **Locations do not nest in the interface.** The data model has a parent
  location field, but the Locations screen offers a flat list. Nesting is not
  something you can set up today.
- **No automatic price checking.** Prices on wishlist entries are recorded by
  hand. See [Wishlist and prices](./WISHLIST_AND_PRICES.md).
- **No document uploads** other than receipts captured by the receipt scanner.
- **No keyboard shortcuts.**

## Related

| Document                                        | Covers                                                  |
| ----------------------------------------------- | ------------------------------------------------------- |
| [Getting started](./GETTING_STARTED.md)         | Choosing a mode and reaching your first tracked item.   |
| [Lifecycle](./LIFECYCLE.md)                     | Events, status, loans, repairs, the timeline.           |
| [Value](./VALUE.md)                             | Depreciation methods, current value, cost of ownership. |
| [Wishlist and prices](./WISHLIST_AND_PRICES.md) | Saving towards things, target prices, price history.    |
| [Gear catalogue](./CATALOGUE.md)                | Gear profiles, the bundled catalogue, adding your own.  |
| [Backup and restore](./BACKUP.md)               | The backup format, restoring, moving between modes.     |
| [Data model](./DATA_MODEL.md)                   | Every field and enum, and the permission matrix.        |
| [Self-hosting](./SELF_HOSTING.md)               | Running the server, every environment variable.         |
| [Security](../SECURITY.md)                      | What each mode protects, and what it does not.          |
| [FAQ](./FAQ.md)                                 | When something is not working.                          |
| [FAQ](./FAQ.md)                                 | The short answers.                                      |
