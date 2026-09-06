# Documentation

Four lanes. Find yours, and start at the top of it.

## I want to use it

| Document                                        | What it answers                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| [Getting started](./GETTING_STARTED.md)         | Which mode should I run, and how do I get to my first tracked item?                 |
| [User guide](./USER_GUIDE.md)                   | What does every screen and field do?                                                |
| [Lifecycle](./LIFECYCLE.md)                     | How do I lend something out, log a repair, and read an item's history?              |
| [Value](./VALUE.md)                             | What is this worth now, and what has it cost me?                                    |
| [Wishlist and prices](./WISHLIST_AND_PRICES.md) | How do I save towards something and track what it sells for?                        |
| [Gear catalogue](./CATALOGUE.md)                | What is a gear profile, where does the catalogue come from, and how is it licensed? |
| [Backup and restore](./BACKUP.md)               | How do I not lose my data, and how do I move it to a server?                        |
| [FAQ](./FAQ.md)                                 | The short answers.                                                                  |

## I want to host it

| Document                          | What it answers                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| [Self-hosting](./SELF_HOSTING.md) | The container, the volume, every environment variable, HTTPS, OIDC, upgrades, troubleshooting. |
| [Backup and restore](./BACKUP.md) | Backing up the server database, and restoring it.                                              |
| [Security](../SECURITY.md)        | What each mode actually protects, what it does not, and how to report a vulnerability.         |

## I want to build on it

| Document                          | What it answers                                                   |
| --------------------------------- | ----------------------------------------------------------------- |
| [Architecture](./ARCHITECTURE.md) | How the pieces fit, and which alternatives were rejected and why. |
| [Data model](./DATA_MODEL.md)     | Every table and field, the enums, and the permission matrix.      |
| [API](./API.md)                   | The HTTP contract: routes, auth, error shapes, known gaps.        |
| [Extending](./EXTENDING.md)       | The storage and auth provider seams, and how to add one.          |

## I want to contribute

| Document                                 | What it answers                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| [Contributing](../CONTRIBUTING.md)       | Setup, commit rules, and what a pull request must pass.                   |
| [Testing](./TESTING.md)                  | The test layers, how to run them, and the pre-pull-request checklist.     |
| [Roadmap](./ROADMAP.md)                  | What has shipped, what is next, and the reasoning behind the shape of it. |
| [Code of conduct](../CODE_OF_CONDUCT.md) | How we treat each other.                                                  |

---

**One fact, one owner.** Where two documents could carry the same information, one
owns it and the other links. Environment variables live in
[Self-hosting](./SELF_HOSTING.md). Backup lives in [Backup](./BACKUP.md). The
permission matrix lives in [Data model](./DATA_MODEL.md). Test rules live in
[Testing](./TESTING.md). If you find the same fact stated twice and the copies
disagree, the owner above is right and the other is a bug.
