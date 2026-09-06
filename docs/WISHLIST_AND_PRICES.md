# Wishlist and prices

**Last updated:** 2026-09-05

The wishlist is the half of ownership that happens before you own anything. What you want
next, what you are willing to pay for it, how much you have put aside, and what it has
actually been selling for.

With the wishlist you can:

- Keep a list of gear you want, with a target price and how badly you want it.
- Put money aside towards each thing, a bit at a time, and take some back out when the boiler
  breaks.
- See how close each thing is to being paid for, and which ones are fully funded.
- Record prices as you see them, and build up a history that shows whether a deal is a deal.
- Get told when something is at or below the price you set.
- Turn an entry into an owned item the day you buy it, with its history already started.

Find it at **Wishlist** in the navigation.

---

## A wishlist entry is not an item

A thing you want is not a thing you own in a funny state. It has no serial number, no
condition and no location, because none of those exist yet. Modelling it as an item would mean
every screen, every filter and every total that walks your gear would have to carry a case
that is not gear.

So an entry is its own kind of record, with only the fields that make sense before purchase:

| Field           | Notes                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| Name            | The only required field                                                     |
| Brand and model | Carried across when you buy it                                              |
| Category        | Carried across when you buy it                                              |
| Target price    | What you are willing to pay. Also the threshold a price alert fires against |
| Priority        | High, Medium or Low                                                         |
| Notes           | Free text, carried across when you buy it                                   |
| URL             | Where you saw it                                                            |

When you buy it, the entry becomes a real item and keeps a pointer back to it, so the record
of what you were saving for survives the purchase.

---

## Saving up

Each entry has **Put money aside**. Enter an amount and, if you like, a note about where it
came from.

**A negative amount is a withdrawal.** Taking 60.00 back out is another line in the log, not
an edit to an old one. Zero is refused, because it records nothing.

The saved figure is the sum of the log, worked out fresh each time it is shown. It is never
stored as a running total, for the same reason an item's status is never stored: one source of
truth, no two numbers that can drift apart, and "where did this figure come from" always has
an answer you can read line by line. If the total is wrong, some line in the log is wrong, and
you can see which.

A Festool TS 55 track saw, target **675.00**:

| Date        | Amount  | Note                      | Saved so far |
| ----------- | ------- | ------------------------- | ------------ |
| 2 May 2026  | +150.00 | Sold the old circular saw | 150.00       |
| 1 Jun 2026  | +100.00 |                           | 250.00       |
| 1 Jul 2026  | +100.00 |                           | 350.00       |
| 19 Jul 2026 | -60.00  | Boiler service            | 290.00       |
| 1 Aug 2026  | +100.00 |                           | 390.00       |

The card reads **390.00 saved of 675.00**, a bar at 58 percent, and **285.00 to go**.

Progress shows four things: what is saved, the target, what is remaining, and the percentage.
The percentage is capped at 100, so overshooting reads as funded rather than as 112 percent.
An entry with no target shows what you have saved and no bar, because a percentage of an
unknown is not a number. The total can never read below zero, however much you take back out.

At the top of the page, three figures cover everything still to buy: how many, how much is set
aside, and how much is still to find. Bought entries are excluded, because that money has
already been spent.

---

## The order of the list

Entries sort by priority first, then by how close each is to being paid for.

| Entry                          | Priority | Funded     | Position |
| ------------------------------ | -------- | ---------- | -------- |
| Festool TS 55 track saw        | High     | 58 percent | 1        |
| Milwaukee M18 impact wrench    | High     | 20 percent | 2        |
| Ubiquiti USW-Pro-24-PoE switch | Medium   | 90 percent | 3        |
| Shure SM7B                     | Low      | 0 percent  | 4        |

A high priority thing you have nearly paid for should sit above a high priority thing you have
not started, and both above a medium priority one however well funded. Ties break on name, so
the list does not shuffle between visits.

**Bought entries sink to the bottom rather than disappearing.** Deleting them would erase the
record of what all that saving was for. They keep a **Bought** badge and a link through to the
item they became.

Anything fully saved for and not yet bought is called out in its own card at the top of the
page.

---

## Price history

Each entry has **Record a price**. Enter what you saw it for, and it goes into the log with
today's date and the entry's URL attached.

Like savings, and like an item's history, price observations are append-only. Nothing
overwrites the last price, because the series is the point. A single current price cannot tell
you whether 289.00 is a good deal or simply what the thing always costs. Three months of
observations can.

A Milwaukee M18 FUEL impact wrench, target **299.00**:

| Date        | Seen at |
| ----------- | ------- |
| 12 Jun 2026 | 349.00  |
| 3 Jul 2026  | 329.00  |
| 11 Aug 2026 | 289.00  |

From that the card shows the latest price, the direction of the last move, and the lowest ever
seen when the latest is not it. Behind those sit five facts: latest, lowest, highest, how many
observations there are, and whether the last move was down, up or flat. Direction needs two
observations before it means anything, so it stays quiet until then.

---

## Alerts

An alert fires when **the latest recorded price is at or below the target price you set**.
That is the whole rule.

The impact wrench above alerts: 289.00 against a target of 299.00, **10.00 under your target**,
and flagged **lowest yet** because nothing cheaper has ever been recorded. Alerts are listed
biggest saving first.

What does not fire an alert:

- An entry with no target price. There is nothing to be below.
- A price that dropped but is still above your target.
- Anything you have already bought.

Alerting on "it went down a bit" would mean an alert most weeks, and an alert most weeks is an
alert nobody reads. The target is the point at which you said you would buy, so that is the
point at which the app speaks. Setting the target honestly is the price of it being useful.

---

## Buying something

Press **I bought it** on the entry, enter what you actually paid, and three things happen.

1. A real item is created, carrying the name, brand, model, category and notes across, in New
   condition, quantity one, with today as the purchase date and the price you actually paid.
2. An **Acquired** event is written on that item, for the price you actually paid, noting that
   it came from the wishlist and from which URL if you recorded one.
3. The wishlist entry is marked bought, sinks to the bottom of the list, and gains a link to
   the item.

That second step matters more than it looks. The new item starts life with a real history
instead of appearing from nowhere with a date on it, so its age of ownership runs from the
purchase and its cost of ownership starts from the price you paid rather than the price you
hoped for. See [Value](./VALUE.md#where-the-purchase-figure-comes-from).

The price you paid is what gets recorded, not the target. Saving 675.00 towards a saw and
catching it at 649.00 leaves an item that cost 649.00 and a wishlist entry that remembers what
the plan was.

---

## Prices are recorded by hand

**Every price in Brassworth today is one you typed in.** Nothing checks a shop for you,
nothing runs in the background, and nothing will change a price while you are not looking.

There is a price checker in the codebase, and it is tested, but it is connected to no route
and nothing calls it. The `PRICE_WATCH_ENABLED` setting currently has no effect at all.
Manual price entry needs none of it and works fully.

If you want price history, record what you see when you see it. Every feature on this page,
history, statistics, trend and alerts, works entirely on prices you enter yourself.

### What automatic checking will look like when it lands

This is the design, not a description of something you can turn on today. It is written down
because the restraint in it is the point, and because you should know what would be running on
your server before it ever does.

| Rule                           | What it means                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Published data only            | It reads the `schema.org/Product` offer data that retailers publish deliberately for machines, in a script block on the page. It never scrapes the rendered layout |
| robots.txt is obeyed           | Fetched once per host and honoured. A disallowed path is not fetched                                                                                               |
| Unreadable robots.txt means no | If robots.txt cannot be read, it refuses, rather than assuming permission. A missing file, which means no restrictions, is the one case treated as a yes           |
| One host at a time             | A minimum gap between requests to any single host, and if that host asks for a longer gap, it gets a longer gap                                                    |
| https only                     | Plain http is refused                                                                                                                                              |
| Bounded                        | A short timeout and a cap on how much of a page is read, so a slow or enormous page cannot hang the job                                                            |
| Off by default                 | It does nothing at all unless a self-hoster explicitly turns it on                                                                                                 |

Scraping a page layout would be fragile, generally against the site's terms, and rude at any
scale. Structured product data is published to be read. That distinction is why the checker is
built the way it is, and why it will stay off unless you ask for it.

Progress on this lives in the [roadmap](./ROADMAP.md).

---

## Related

- [Value](./VALUE.md) - what the things you already own are worth, and what they have cost.
- [Lifecycle](./LIFECYCLE.md) - loans, repairs and sales on the items a wishlist entry becomes.
- [User guide](./USER_GUIDE.md) - every screen and field.
- [Documentation index](./INDEX.md) - everything else.
