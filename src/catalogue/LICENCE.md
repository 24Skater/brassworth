# Catalogue licence

`gear.json` — the Brassworth community catalogue — is a **database**, licensed separately
from the application code.

- **The database** (its structure and the selection and arrangement of its contents) is
  licensed under the [Open Database License v1.0 (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/).
- **The individual contents** of the database are licensed under the
  [Database Contents License v1.0 (DbCL)](https://opendatacommons.org/licenses/dbcl/1-0/).

The application source code is under the project's own licence; see the repository `LICENSE`.

## Why ODbL and not Creative Commons

This is a collection of facts about makes and models. Creative Commons licences are written
for creative works, and their terms map badly onto a database — which is why Creative Commons
itself recommends Open Data Commons licences for data.

ODbL is what OpenStreetMap uses, for the same reason.

## Why share-alike and not CC0

CC0 would make the catalogue easier to contribute to and easier to take. The roadmap asks for
"a community catalogue under a licence **we control**", and share-alike is what that means in
practice: anyone may use the catalogue, including commercially, but a derived database that is
published has to be published under the same terms. Contributors' work cannot be enclosed.

## What this means for you

**Using Brassworth.** Nothing to do. Running the app, self-hosting it, and recording your own
gear are all unaffected — ODbL governs redistribution of the _database_, not your use of the
software or your own data.

**Your own profiles are yours.** Profiles you create in the app are `USER` records stored in
your own database. They are not part of this catalogue and this licence does not touch them.
They only become catalogue entries if you deliberately contribute them.

**Contributing.** Opening a pull request against `gear.json` licenses your contribution under
the terms above. Contribute only facts you are entitled to share — a specification printed on
the box or the data plate is a fact; a vendor's copyrighted description is not.

**Redistributing a modified catalogue.** Publish it under ODbL, say what you changed, and keep
the attribution.

## Attribution

> Contains information from the Brassworth community catalogue, which is made available under
> the Open Database License (ODbL).

## What is deliberately not in here

- **No copied marketing copy or product descriptions.** Specifications are facts; prose is not.
- **No trademarks beyond nominative use.** Brand names appear as the names of the things they
  name. No logos, no vendor branding, and no module named after any manufacturer.
- **No scraped vendor catalogue data.** Entries are contributed and reviewed. If you have
  legitimate vendor access, configure a vendor source instead — see [docs/CATALOGUE.md](../../docs/CATALOGUE.md).
- **No guessed links.** A manual URL is only added when somebody has checked that it is the
  right manual. An invented link that looks authoritative is worse than no link.
