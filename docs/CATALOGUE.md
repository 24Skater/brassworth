# The gear catalogue

> A make and model, described once, shared by every item that is one.

An item records _your_ drill: where it lives, what you paid, who has it now. A **gear profile**
records _the model_: what it is, what it runs on, where the manual lives. One profile, many
items.

Splitting them is what makes a correction worth making. Fix a spec on a profile and every item
that shares the model is fixed. Copy the spec onto each item and you have to fix it once per
drill, and you will not.

## Brand is data

There is no Milwaukee module, no DeWalt plugin, no registry of supported manufacturers. A brand
is a string on a row. Adding Festool is adding a row — which is also why the project carries no
one else's trademark in a directory name, and why the same feature works unchanged for a
cordless drill, a network switch and a microphone.

## Where profiles come from

Three sources, in ascending order of authority:

| Source                  | Stored?               | Editable | Scope            |
| ----------------------- | --------------------- | -------- | ---------------- |
| Bundled catalogue       | No — ships in the app | No       | Everyone         |
| Vendor catalogue source | No — fetched          | No       | One installation |
| Your own profiles       | Yes                   | Yes      | One organisation |

Later sources win for the same make and model. Your own record beats both catalogues, because
you wrote it deliberately and a catalogue update should not quietly argue with you.

### Catalogue records are never written to storage

They ship with the app and are merged in when profiles are read. Persisting them would copy a
read-only dataset into every tenant's storage, put data that is not yours into every backup,
and turn a catalogue update into a migration.

That is why a catalogue profile's id is **derived** from its brand and model
(`catalogue:dewalt::dcd791d2`) rather than assigned. An item's link therefore survives the
catalogue being updated, reordered, or replaced by a vendor feed. The link is to a model, not to
a row in a file.

## The file format

`src/catalogue/gear.json`:

```json
{
  "formatVersion": 1,
  "name": "Brassworth community catalogue",
  "licence": "ODbL-1.0",
  "updatedAt": "2026-09-05T00:00:00.000Z",
  "profiles": [
    {
      "brand": "DeWalt",
      "model": "DCD791D2",
      "productType": "Cordless drill/driver",
      "specs": [{ "label": "Battery platform", "value": "20V MAX XR" }],
      "manualUrl": "https://example.com/manual.pdf"
    }
  ]
}
```

| Field         | Required | Notes                                               |
| ------------- | -------- | --------------------------------------------------- |
| `brand`       | yes      | As published. Matching folds case and punctuation.  |
| `model`       | yes      | As published. Matching ignores spacing and hyphens. |
| `productType` | no       | Free text, e.g. `Cordless drill/driver`.            |
| `specs`       | no       | Up to 80 `{ label, value, unit? }` entries.         |
| `manualUrl`   | no       | **https only.** See below.                          |
| `partsUrl`    | no       | https only.                                         |
| `productUrl`  | no       | https only.                                         |

`source`, `licence`, `sourceName` and `organizationId` are **not read from the file**. A
catalogue cannot declare its rows editable user records, relicense itself, or claim to belong
to an organisation.

### Why specs are label/value pairs

A drill, a rack switch and a camera body share almost no spec fields. A typed record would grow
a new optional column for every product type anyone added, which is a vendor module wearing a
different hat.

### Why links must be https

These URLs come from a file the app did not write and are rendered as links people click.
`javascript:` is script execution, `data:` is a page on our own origin, and plain `http` is a
downgrade somebody can sit in the middle of. Anything that is not https is dropped — the entry
is kept, the link is not.

### Bad entries are dropped, not fatal

One malformed row is rejected and named; the rest load. A file that fails wholesale — not an
object, no `profiles` array, a `formatVersion` from the future — reports one error saying which.

## Contributing an entry

1. Add the object to `profiles` in `src/catalogue/gear.json`.
2. Keep it to facts printed on the box, the plate or the manual. No marketing copy.
3. Add a link only if you have opened it and it is the right document.
4. Run `npm run test -- tests/lib/gear` — the suite asserts the shipped file validates, has no
   duplicate models, and links only over https.

Contributions are licensed under ODbL/DbCL. See [`src/catalogue/LICENCE.md`](../src/catalogue/LICENCE.md).

## Vendor catalogue sources

For anyone with legitimate vendor access, an installation can pull a second catalogue from a
URL — including an authenticated one.

**This runs on the server, and that is not an implementation detail.** A browser cannot hold an
API key: anything the client can send, a user can read out of the bundle or the network tab, so
a key configured in the UI would be a published key. Environment variables on the server are the
only place it stays secret.

Off unless configured, following the rule price watching set in Phase 5 — the app must not start
making requests to somebody else's service because it was installed.

| Variable                        | Default            | Notes                                    |
| ------------------------------- | ------------------ | ---------------------------------------- |
| `GEAR_CATALOGUE_URL`            | _unset_            | **https only.** Unset means off.         |
| `GEAR_CATALOGUE_API_KEY`        | _unset_            | Optional.                                |
| `GEAR_CATALOGUE_API_KEY_HEADER` | `Authorization`    | Vendors disagree; `X-Api-Key` is common. |
| `GEAR_CATALOGUE_API_KEY_FORMAT` | `Bearer {key}`     | `{key}` is substituted.                  |
| `GEAR_CATALOGUE_NAME`           | `Vendor catalogue` | Shown as the attribution.                |

The document must be in the format above and is validated by exactly the same rules as the
shipped file. A vendor document is not more trusted for having been paid for.

The request is https-only, size-capped and time-limited, and failures return a generic reason —
the URL may embed a token and the message is on its way to a browser.

**There is deliberately no per-vendor module and no plugin SDK.** The roadmap is explicit that
an abstraction designed from one case is reliably the wrong abstraction. This fetches a JSON
document in a documented format, which works today with any vendor that publishes one.

## Reading a data plate

The rating plate riveted to a tool carries the three things worth typing and hardest to type.
Serial numbers especially: long, meaningless, printed small — the field people get wrong and
never notice, because nothing checks it until an insurance claim.

**Scan data plate** on the item form photographs the plate and fills in make, model and serial
number using the Tesseract OCR the app already ships for receipts.

It fills **blank fields only**, and it fills the form rather than saving anything. OCR on
scratched metal in a garage is not reliable enough to be trusted silently; in an editable field
a bad character is obvious and one keystroke from fixed.

### The brand comes from the catalogue, or not at all

Only brands the catalogue knows are recognised. The tempting alternative — treat the most
prominent line as the maker — reliably returns `MADE IN CHINA`, `WARNING` or
`INDUSTRIAL TOOL CO.`, and a confidently wrong brand is worse than a blank one somebody fills
in. It is the same call the roadmap makes about `MARKET_COMPARABLE`: a value that looks
authoritative and is invented.

So what the scanner can recognise grows with the catalogue — and with the profiles you add
yourself.

Model and serial come from labels rather than from position: `MODEL`, `MODEL NO`, `CAT NO`,
`S/N`, `SERIAL NO` and the punctuation variants of each. `TYPE 1` is not mistaken for a model,
and `SN` is not read out of the middle of a word.
