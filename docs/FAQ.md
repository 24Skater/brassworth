# Frequently asked questions

Short answers. Where a question deserves a long one, it links to the document that owns
the topic.

## General

### What is Brassworth?

An open-source tracker for tools, IT gear and AV equipment that follows the whole life
of a thing you own — wanted, bought, lent, broken, repaired, sold — rather than only
what you have right now. See the [README](../README.md).

### How is it different from an inventory app?

Inventory apps answer _what do I have_. Brassworth answers _what happened to this, and
what is it worth now_. Every item carries an append-only history, and its status is
derived from that history rather than stored in a field somebody has to remember to
update. See [Lifecycle](./LIFECYCLE.md).

### Is it free?

Yes. MIT licensed. The bundled gear catalogue is separately licensed under ODbL 1.0 and
DbCL 1.0 — see [Catalogue](./CATALOGUE.md).

### Is there a hosted version I can sign up for?

Not yet. `app.brassworth.com` is the next milestone. Today there is the code in this
repository, which you run yourself.

### Do I need a server?

No. The default mode runs entirely in your browser with no server, no account and
nothing uploaded. A server is optional and only worth running when you want a real
security boundary. See [Getting started](./GETTING_STARTED.md).

## Modes and data

### What is the difference between local-first and server mode?

|                                | Local-first (default)           | Server                          |
| ------------------------------ | ------------------------------- | ------------------------------- |
| Data lives                     | In your browser, on one machine | In SQLite on your server        |
| Setup                          | `npm run dev`                   | `docker compose up -d`          |
| Sign-in is a security boundary | **No**                          | Yes                             |
| Works offline                  | Yes                             | Only if the server is reachable |

### Is my data secure?

That depends entirely on the mode, and the honest answer matters here.

**In local-first mode, the sign-in screen is not a security boundary.** Accounts and
roles are records in your browser's storage that the page itself writes. Anyone who can
open devtools on that browser can change them. It is designed for privacy — nothing is
uploaded anywhere — not for keeping other people out. Treat it as a single-user
application on a machine you control.

**In server mode** passwords are hashed with scrypt, sessions are opaque tokens in
httpOnly cookies, and roles are checked on the server on every request.

Full detail, including the known gaps, is in [SECURITY.md](../SECURITY.md).

### Where exactly is my data?

Local-first mode: your browser's `localStorage`, under keys prefixed `inventory_`, or
IndexedDB if you have opted into that. Server mode: a SQLite file on a Docker volume at
`/app/data/brassworth.db`.

### What happens if I clear my browser data?

In local-first mode, everything is deleted and there is no copy anywhere else. Export a
backup first. See [Backup](./BACKUP.md).

### Can I move from local-first to a server later?

Yes, and it is the expected path. Export a backup, stand up the server, create an
account, restore the backup. Your items and their whole history come across. See
[Backup](./BACKUP.md).

### Can I switch to IndexedDB for more room?

Yes. Set `VITE_STORAGE_PROVIDER=indexeddb`. Your existing localStorage data is migrated
across on first use. This is worth doing if you attach a lot of photos — localStorage
is capped around 5 MB per origin and photos are stored inline. See
[Extending](./EXTENDING.md).

### How many items can I track?

In localStorage, the practical limit is the ~5 MB quota, and photos dominate it. A few
hundred items with no photos is comfortable. With photos, switch to `indexeddb` or run
the server.

## Features

### Can I track who borrowed something?

Yes — that is the point of the product. Check something out with a name and a date it
is due back, and overdue loans appear on the dashboard. See [Lifecycle](./LIFECYCLE.md).

### How is depreciation calculated?

Straight line or declining balance, both with a salvage floor, or a value you set by
hand. Worked examples in [Value](./VALUE.md).

### Does it look up market prices automatically?

No, deliberately. There is no automatic market valuation, because with no price data
source behind it, the number would look authoritative and be invented. You record what
you observe.

### Does price watching scrape retailer websites?

It does not scrape, and today it does not run at all. Prices are recorded by hand. An
automatic checker exists in the codebase but is wired to no route, so
`PRICE_WATCH_ENABLED` currently has no effect. When it is connected it will read only
the structured product data retailers publish for machines, obey `robots.txt`, throttle
per host, and stay off unless explicitly enabled. See
[Wishlist and prices](./WISHLIST_AND_PRICES.md).

### What is the community catalogue?

A small bundled set of make and model profiles with specs and manual links, so you
describe a model once rather than on every item that is one. It ships with the app and
is never copied into your data. See [Catalogue](./CATALOGUE.md).

### Can I use it offline?

Local-first mode works offline entirely. Receipt OCR runs in your browser. PDF receipt
parsing loads a worker from a CDN, so that specific feature needs a connection.

### Can I import data from a spreadsheet?

Yes. Download the import template from the Items screen, fill it in, and import it.
Excel export works the same way — but note that Excel export is **not** a backup, since
it carries items only. See [Backup](./BACKUP.md).

## Multiple people

### Can several people use it?

Not usefully yet, and this is worth being blunt about.

Local-first mode has multiple accounts and four roles, but no security boundary — it
decides what to draw, not what is permitted.

Server mode has a real boundary, but **there is currently no route to add a second
member to a property**, and the invite action reports itself unavailable. Until that
lands, treat server mode as single-user with real security rather than a way to share
gear with a crew.

### What can each role do?

Four roles — ADMIN, MANAGER, CONTRIBUTOR, VIEWER — across ten permissions. The full
matrix is in [Data model](./DATA_MODEL.md).

### Can I sign in with Google or my company login?

Yes, in server mode, if you configure OIDC. It is off unless all four of the required
variables are set. See [Self-hosting](./SELF_HOSTING.md).

## Security

### How are passwords stored?

Local-first mode: PBKDF2-SHA256, 100,000 iterations, with a 16-byte per-user salt.
Server mode: scrypt at OWASP parameters. Neither is plain SHA-256, despite what older
versions of this documentation said.

### Is there rate limiting on sign-in?

In local-first mode, yes — five attempts, then escalating lockouts. **On the server, no.**
If you expose an instance to the internet, add rate limiting at your reverse proxy. It
is listed as a known gap in [SECURITY.md](../SECURITY.md).

### How do I reset a forgotten password?

There is no password reset. In local-first mode you would clear browser data and start
again, which loses everything not backed up. In server mode it needs database access.
This is a real gap, not an oversight in the documentation.

### Is there two-factor authentication?

No. Configuring OIDC and letting your identity provider handle it is the practical
route today.

## Running it

### What do I need installed?

Node 20 or newer for local development, or Docker for the server. Nothing else.

### Which port?

`npm run dev` serves on **8080**. The container serves on **3000**.

### Can I deploy it to Netlify or Vercel?

Only in local-first mode, where it is a static bundle. Server mode needs a running Node
process, so it wants a container host. See [Self-hosting](./SELF_HOSTING.md).

### Do I need HTTPS?

For anything reachable beyond your own machine, yes. Terminate TLS in a reverse proxy in
front of the container and set `NODE_ENV=production`, which is what marks the session
cookie `Secure`.

### How do I update?

Pull the new image and recreate the container. Take a backup first. See
[Self-hosting](./SELF_HOSTING.md) and [Backup](./BACKUP.md).

## Something is wrong

### The app will not load

Check the browser console. In local-first mode, a corrupted storage record is the usual
cause — export a backup if you can, then clear site data and restore.

### My items disappeared

Almost always the wrong property is selected. Check the property name under the
Brassworth wordmark and use **Switch Property**. Failing that, you may be in a different
browser or profile from the one holding the data.

### Receipt or data plate scanning is not working

OCR needs a reasonably sharp, well-lit, straight-on photo, and it takes a few seconds on
a large image. It fills in the form and never saves on your behalf, so if nothing
appears to have happened, check the fields.

### The container will not start

Check `docker compose logs -f brassworth`. The common causes are port 3000 already in
use and a `DATABASE_URL` pointing somewhere the container cannot write. See the
troubleshooting section of [Self-hosting](./SELF_HOSTING.md).

## Contributing

### Can I help?

Yes. Start with [CONTRIBUTING.md](../CONTRIBUTING.md). The one hard rule is that no
pull request lands without a passing test covering the change.

### Where do I report a bug?

[GitHub issues](https://github.com/24Skater/home-asset-keeper/issues). Say what you did,
what happened, what you expected, and which mode you were in.

Security vulnerabilities go through the repository's Security tab instead — see
[SECURITY.md](../SECURITY.md).

### What is being worked on next?

The hosted tier. See [Roadmap](./ROADMAP.md).
