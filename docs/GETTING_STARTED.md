# Getting started

From nothing to one tracked item, in order. Fifteen minutes, most of it spent
deciding which of the two modes you want.

## 1. Choose a mode

Brassworth runs either entirely in your browser, or as a small server you host.
The difference is not cosmetic — it decides where your data lives and whether
sign-in means anything.

|                                | Local-first (the default)                                               | Server                                                               |
| ------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Start it with                  | `npm run dev`                                                           | `docker compose up -d`                                               |
| Opens on                       | <http://localhost:8080>                                                 | <http://localhost:3000>                                              |
| Where the data lives           | Your browser, on that machine, in that profile                          | A SQLite file on a Docker volume                                     |
| Does sign-in protect anything? | No. Accounts and roles are records in the browser                       | Yes. Passwords hashed server-side, roles checked on every request    |
| Needs                          | Node.js 20 or newer                                                     | Docker                                                               |
| Best for                       | One person cataloguing their own gear, with nothing leaving the machine | Data you would be upset to lose, or access from more than one device |

Two things worth knowing before you pick:

- **Local-first is a privacy feature, not a security boundary.** Anyone who can
  open that browser profile can read or change everything, sign-in screen or
  not. See [Security](../SECURITY.md).
- **Server mode is still single-person per property.** The permission model is
  built and enforced, but there is no route yet to add a second member to a
  property, and the invite button reports itself unavailable.

You are not locked in. Both modes read and write the same backup format, so
starting local and moving to a server later is an export and an import —
[Backup and restore](./BACKUP.md).

## 2a. Local-first, in three commands

Requires Node.js 20 or newer. The container image builds on Node 22; CI runs
Node 20.

```bash
git clone https://github.com/24Skater/home-asset-keeper.git
cd home-asset-keeper && npm install
npm run dev
```

Open <http://localhost:8080>.

If you want the larger storage budget from the start — worth it if you plan to
add photos — create a `.env` file before `npm run dev`:

```bash
echo "VITE_STORAGE_PROVIDER=indexeddb" > .env
```

That one variable switches storage _and_ authentication together, deliberately.
Every variable is documented in [Self-hosting](./SELF_HOSTING.md) and in
[`.env.example`](../.env.example).

## 2b. Server mode, in one command

With the repository cloned:

```bash
docker compose up -d
```

Open <http://localhost:3000>. One container, SQLite on a named volume, no
external database. The image builds the frontend with `VITE_STORAGE_PROVIDER=api`
and serves it on the same origin as the API, so there is nothing to configure to
get a working sign-in.

Before you point anything real at it, read the HTTPS and `NODE_ENV=production`
sections of [Self-hosting](./SELF_HOSTING.md) — the session cookie is only marked
`Secure` when `NODE_ENV=production`.

## 3. Create your account

The landing page at `/` has a **Get Started** button, which takes you to
`/auth`. Choose **Sign Up** and enter a name, an email address and a password.

Passwords must be at least 12 characters and score 3 or better on the zxcvbn
strength meter shown under the field. A long passphrase clears this easily; a
short password with punctuation substitutions does not.

There is no password reset. Put the password in a password manager now.

## 4. Create your first property

A **property** is the top-level container: a house, a church, a workshop, a
small business. Everything else — items, locations, categories, the wishlist —
belongs to exactly one property.

Go to **Properties** (`/organizations`), click **Create Property**, and give it
a name and a type (Home, Church, Small Business, Other). Address is optional.
The property you create becomes the current one, shown in the top navigation.

## 5. Add a location

Locations are where things physically are. Go to **Locations**
(`/locations`) and click **Add Location**. A name and optional notes:
"Garage shelf", "Rack 2", "Van".

Start with fewer, broader locations than you think you need. It is easier to
split one later than to reconcile fifteen.

## 6. Add your first item

Go to **Items** (`/items`) and click **Add Item**. Only **Name** and
**Condition** are required. Fill in what you know and leave the rest — every
field can be added later, and a half-filled record beats no record.

If you want the value tracking, set **How should value be estimated?** while
you are here. Straight line and declining balance both need a purchase price
and date to produce a number; [Value](./VALUE.md) explains what each one does.

Click **Save**.

## 7. Scan a data plate

Most tools and appliances carry a rating plate with the make, model and serial
number stamped on it. Typing those in is where cataloguing stalls.

Open an item, or start a new one, and click **Scan data plate** just above the
Brand field. On a phone it opens the camera directly; on a desktop it opens a
file picker. Photograph the plate, and Brassworth reads it and fills in brand,
model and serial number.

**It never saves anything.** The fields are filled in for you to check, and
plate text is often ambiguous — a `0` and an `O`, a model number continued on a
second line. Correct anything wrong, then save.

If the brand and model match a profile in the bundled gear catalogue, the item
picks up the shared specification for that model. See
[Gear catalogue](./CATALOGUE.md).

## 8. Check something out, and back in

This is the part that makes Brassworth different from a spreadsheet.

1. Open a saved item from `/items`. The **History** card is at the bottom of
   the page.
2. Click **Record**. Only actions that make sense right now are offered — you
   cannot mark something returned that was never lent out.
3. Choose **Loaned out**, enter who has it, and optionally when you expect it
   back. Save.
4. The item's status is now **Loaned out**, visible as a badge in every view,
   and it will show as overdue once the expected date passes.
5. When it comes back: **Record** again, choose **Returned**.

Status is derived from that history, never stored on the item, so a mistake is
corrected by recording another event rather than by editing the past. The full
set of events, and what each one means, is in [Lifecycle](./LIFECYCLE.md).

Note that condition and status are separate. A drill can be in **Good**
condition _and_ loaned out; being lent to someone says nothing about its
physical state.

## 9. Export a backup, before you have anything to lose

Do this now, while it costs you nothing, so that the habit exists before the
catalogue does.

Go to **Settings** (`/settings`) → **Data** → **Download backup**. That file
contains everything: every property, item, event, photo and document. The Excel
export on the Items page is a report, not a backup — it carries items only.

In local-first mode, clearing your browser's site data deletes everything with
no warning and no recovery. [Backup and restore](./BACKUP.md) covers restoring,
and moving a local catalogue onto a server.

## Where to go next

| If you want to                                  | Read                                                     |
| ----------------------------------------------- | -------------------------------------------------------- |
| Know what every screen and field does           | [User guide](./USER_GUIDE.md)                            |
| Record repairs, sales and losses properly       | [Lifecycle](./LIFECYCLE.md)                              |
| Understand the depreciation options             | [Value](./VALUE.md)                                      |
| Save towards something and track its price      | [Wishlist and prices](./WISHLIST_AND_PRICES.md)          |
| Run this on a real machine, with HTTPS and OIDC | [Self-hosting](./SELF_HOSTING.md)                        |
| Know what each mode does and does not protect   | [Security](../SECURITY.md)                               |
| Fix something that is not working               | [Self-hosting](./SELF_HOSTING.md) or the [FAQ](./FAQ.md) |
| Everything else                                 | [Documentation index](./INDEX.md)                        |
