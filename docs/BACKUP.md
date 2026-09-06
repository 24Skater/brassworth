# Backup and restore

Brassworth holds records you cannot reconstruct. Nobody else knows what you paid for
the planer in 2021, or that the mower's drive cable was replaced. Back it up.

This document covers both modes. Which one applies depends on where your data lives:

| You run                   | Your data lives in                     | Back up by                            |
| ------------------------- | -------------------------------------- | ------------------------------------- |
| Local-first (the default) | Your browser's storage, on one machine | Exporting a backup file from Settings |
| Self-hosted server        | A SQLite file on a Docker volume       | Copying that file off the volume      |

If you are not sure which you are running, open Settings. If it offers "Export backup",
you are in local-first mode.

---

## The backup file

**Format:** `brassworth.backup`, version 1. Plain JSON, indented, readable in any text
editor. Downloads as `brassworth-backup-YYYY-MM-DD.json`.

It carries a small envelope and then everything:

```json
{
  "format": "brassworth.backup",
  "version": 1,
  "exportedAt": "2026-09-05T18:42:11.204Z",
  "data": {}
}
```

`data` holds sixteen collections:

|                        |                                                           |
| ---------------------- | --------------------------------------------------------- |
| `user`                 | The signed-in account                                     |
| `users`                | All local accounts, including their password hashes       |
| `userRoles`            | Who has which role in which property                      |
| `organizations`        | Your properties                                           |
| `memberships`          | Which accounts belong to which property                   |
| `items`                | Everything you own                                        |
| `itemEvents`           | The whole lifecycle log — lends, breaks, repairs, sales   |
| `locations`            | Including the parent links that make them nest            |
| `categories`           |                                                           |
| `tags`                 |                                                           |
| `wishlistEntries`      |                                                           |
| `savingsContributions` | The append-only savings log                               |
| `priceObservations`    | The append-only price history                             |
| `gearProfiles`         | Your own profiles only, not the bundled catalogue         |
| `photos`               | Embedded as data URLs, so a photo-heavy backup gets large |
| `documents`            |                                                           |

The bundled gear catalogue is deliberately absent. It ships with the application and
merges in when read, so backing it up would be copying a read-only dataset you already
have. Your own gear profiles are yours and are included.

The `version` field exists so a future format change can be migrated rather than
rejected. A file from a newer version than the app understands is refused rather than
half-read.

---

## Local-first: exporting

1. Open **Settings**.
2. Go to the **Data** tab.
3. Choose **Export backup**.

The file downloads immediately. Nothing is uploaded anywhere — the file is assembled in
your browser and handed to your downloads folder.

Do this before anything that could clear site data: changing browsers, clearing
history, resetting a profile, or handing the machine on. In local-first mode there is
no copy anywhere else. Clearing site data deletes everything.

## Local-first: restoring

> **Restore replaces everything.** It clears what is currently stored and writes the
> backup in its place. It is not a merge. Anything you have added since the backup was
> taken is gone.

1. Open **Settings**, then the **Data** tab.
2. Choose **Restore from backup** and pick the file.
3. Brassworth validates the file first and shows you what is in it — how many items,
   events, wishlist entries and so on. That summary is there so you can confirm you
   picked the right file before you destroy the current one.
4. Confirm.

If the file is not a valid Brassworth backup, or is from a newer version of the format,
the restore is refused and nothing is touched.

---

## Moving from local-first to a server

This is the main reason this document exists. There is no automatic migration, but the
backup file is the bridge and it carries everything.

1. **In local-first mode**, export a backup and keep the file somewhere you can find it.
2. **Stand up the server** — see [SELF_HOSTING.md](./SELF_HOSTING.md). Get to the point
   where `http://localhost:3000` loads and you can create an account.
3. **Create your account** on the server. This becomes your real account, with a real
   password hash; the accounts in the backup were browser records.
4. **Restore the backup** through Settings, exactly as above.

Your items, their whole history, your locations, wishlist, savings and price history
all come across. What changes is where they live and who is allowed to touch them.

Going the other way works the same: export from the server, restore into local-first
mode.

---

## Server mode: backing up the database

In server mode the browser export still works and is still worth taking. But the
authoritative copy is the SQLite database on the Docker volume, and that is what you
should be backing up on a schedule.

The database is `/app/data/brassworth.db` inside the container, on the named volume
`brassworth-data`.

**Take a backup:**

```bash
docker run --rm \
  -v brassworth-data:/data \
  -v "$(pwd):/backup" \
  alpine \
  tar czf /backup/brassworth-$(date +%Y-%m-%d).tar.gz -C /data .
```

That writes `brassworth-YYYY-MM-DD.tar.gz` into the current directory. It copies the
whole data directory, which picks up SQLite's sidecar files as well as the database
itself.

Stop the container first if you want a guaranteed-consistent copy:

```bash
docker compose stop
# run the command above
docker compose start
```

A backup taken while the container is running is usually fine — SQLite is careful — but
"usually fine" is not what you want from the copy you will reach for after a disk
failure.

**Restore a backup:**

```bash
docker compose down

docker run --rm \
  -v brassworth-data:/data \
  -v "$(pwd):/backup" \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/brassworth-2026-09-05.tar.gz -C /data"

docker compose up -d
```

Bring the container down first. Restoring underneath a running server means writing
files out from under an open database handle.

**Automate it.** A backup you take by hand is a backup you take twice and then forget.
A daily cron entry is enough:

```cron
0 3 * * * cd /srv/brassworth && docker run --rm -v brassworth-data:/data -v /srv/backups:/backup alpine tar czf /backup/brassworth-$(date +\%Y-\%m-\%d).tar.gz -C /data .
```

Note the escaped `%` — cron treats a bare `%` as a newline, which is a classic way to
end up with an empty backup directory and no idea why.

---

## Verifying a restore

A backup you have never restored is a hypothesis, not a backup. Check it:

1. **Item count.** Open Items and compare the count against what the backup summary
   said, or against what you remember.
2. **A history.** Open an item you know has been lent out or repaired and confirm the
   entries are there with their dates and the people involved. The event log is the
   part most worth having and the part you would notice least if it were missing.
3. **The dashboard totals.** Purchase value and estimated value should match what you
   saw before.
4. **A photo.** Open an item that had one. Photos are the largest part of a backup and
   the most likely thing to have been truncated by a storage quota.

For a server restore, `curl http://localhost:3000/api/health` should return
`{"ok":true}` before you check anything else.

---

## What a backup does not contain

- **The bundled gear catalogue.** It ships with the app.
- **Server configuration.** Environment variables, OIDC credentials and your reverse
  proxy setup are not in the file. Keep your `.env` or compose overrides in version
  control, or somewhere you will find them again.
- **Server sessions.** Everyone signs in again after a restore, which is correct.
- **Anything outside Brassworth.** Receipt images you scanned are stored as documents
  and photos and do come across; the original files on your disk are your own problem.

## Excel export is not a backup

Settings and the Items screen both offer Excel export. It is useful — it opens in a
spreadsheet, and it is the right tool for handing a list to somebody else.

It is not a backup. It contains items, and only some of their fields. It has no
lifecycle history, no wishlist, no savings, no price observations, no photos, no
properties and no roles. Restoring from it would lose the parts of Brassworth that make
it Brassworth.

Use Excel export to share. Use the JSON backup to not lose things.

---

## See also

- [Self-hosting](./SELF_HOSTING.md) — the container, the volume, and upgrades
- [Getting started](./GETTING_STARTED.md) — choosing a mode in the first place
- [Data model](./DATA_MODEL.md) — what each collection actually contains
