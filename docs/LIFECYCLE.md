# Lifecycle

**Last updated:** 2026-09-05

Most inventory apps answer one question: what do I have right now. Brassworth answers a
second one: what happened to this thing. Lend a drill to a neighbour and it is still yours,
still in good condition, but it is not in the garage. Send a mower for repair and it is gone
for two weeks and comes back with a bill attached. That is the part this page covers.

With the history on an item you can:

- Lend something out, to a named person, with a date you expect it back.
- See on the dashboard what is out past its due date, who has it, and jump straight to it.
- Record that something broke, went for repair, came back, and what the repair cost.
- Record a sale, with the buyer and the price it actually fetched.
- Read the whole story of an item on one screen, oldest first.

---

## Status and condition are two different questions

This is the idea everything else here rests on.

**Condition** is how good the thing is. **Status** is where it is in its life. They move
independently. A drill can be in good condition and lent to your neighbour. A mower can be
in poor condition and sitting in your own shed. An app with a single field for both cannot
express a loan without lying about one or the other: mark the drill "loaned" and you have
lost the fact that it is nearly new, mark it "good" and you have lost the fact that it is in
someone else's van.

|               | What it means           | Values                                                   | How it is set                                                  |
| ------------- | ----------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| **Condition** | How good it is          | New, Good, Fair, Poor, Damaged, Disposed                 | You choose it on the item, and change it when the item changes |
| **Status**    | Where it is in its life | In possession, Loaned out, In repair, Broken, Sold, Lost | Worked out from the history. You never set it directly         |

An item with nothing recorded against it reads as **In possession**. Nothing has happened to
it yet, which is not the same as unknown.

**Sold** and **Lost** are the end. Nothing recorded after them changes the status again. You
can still add a note, and it still shows on the timeline, but a sold mower does not come
back.

---

## The events

Every entry in an item's history is one event. Eight of them move the item to a new status.
Three record something without moving it.

| Event            | What it records                                    | Status afterwards |
| ---------------- | -------------------------------------------------- | ----------------- |
| Acquired         | You got it, and what you paid                      | In possession     |
| Loaned out       | Who has it, and when it is due back                | Loaned out        |
| Returned         | It came back                                       | In possession     |
| Broke            | It stopped working                                 | Broken            |
| Sent for repair  | Who is fixing it, and when it is expected back     | In repair         |
| Repair completed | It is fixed, and what the repair cost              | In possession     |
| Sold             | Who bought it, and for how much                    | Sold              |
| Lost             | It is gone                                         | Lost              |
| Moved            | It changed shelves or hands, noted on the timeline | unchanged         |
| Value reassessed | A new estimate of what it is worth                 | unchanged         |
| Note             | Anything else worth remembering                    | unchanged         |

Each event carries:

| Field            | Notes                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| When it happened | The real-world date, not the date you typed it in. Backdate freely     |
| Who              | The borrower, the repair shop, or the buyer                            |
| Due back         | For loans and repairs. This is what makes an item show as overdue      |
| Amount           | The purchase price, the repair cost, the sale price, or a new estimate |
| Note             | Free text                                                              |

Two events on the same day keep the order you recorded them in, so a loan and its return
both backdated to the same afternoon still read the right way round.

---

## Recording what happened

Open an item and use **Record** in the History card. The menu offers only what makes sense
for the item right now. There is no "mark returned" on something that was never lent out,
because that is how histories fill up with nonsense.

| Current status | What you can record                                         |
| -------------- | ----------------------------------------------------------- |
| In possession  | Loaned out, Broke, Sent for repair, Sold, Lost, Moved, Note |
| Loaned out     | Returned, Broke, Lost, Note                                 |
| In repair      | Repair completed, Lost, Note                                |
| Broken         | Sent for repair, Sold, Lost, Note                           |
| Sold or Lost   | Note                                                        |

The dialog asks only for the fields that event needs. Lending asks who has it and when it is
due back. A completed repair asks what it cost. A note asks for a note.

---

## A worked example

A Honda HRX217 mower, bought in 2021. Every line below is one recorded event.

| Date        | Recorded         | Details                                | Status after  |
| ----------- | ---------------- | -------------------------------------- | ------------- |
| 14 Mar 2021 | Acquired         | 799.00                                 | In possession |
| 2 May 2023  | Loaned out       | to Dave Whitmore, due back 9 May       | Loaned out    |
| 11 May 2023 | Returned         | by Dave Whitmore                       | In possession |
| 6 Apr 2024  | Broke            | "Will not start, smells of stale fuel" | Broken        |
| 8 Apr 2024  | Sent for repair  | to Sanderson Mowers, due back 20 Apr   | In repair     |
| 19 Apr 2024 | Repair completed | 118.50                                 | In possession |

On 10 May 2023 the mower was overdue, and said so on the dashboard and on its badge. On 12
April 2024 it was at the shop and not yet late. Today it reads **In possession**, with a
summary line above the timeline: lent out once, 118.50 spent on repairs.

Those figures feed straight into what the mower has cost you. See
[Value](./VALUE.md#cost-of-ownership).

---

## Overdue loans

An item is overdue when it is out, lent or at a repair shop, and the date you said it was due
back has passed.

Overdue items get a red **Overdue** badge in place of the usual status badge, so a grid of
gear reads at a glance. The dashboard carries a card listing every one of them with the name,
who has it and the due date, soonest due first, and each name links through to the item.

Lend something without a due date and it never goes overdue. That is deliberate. An alert you
did not ask for is an alert you learn to ignore.

---

## Fixing a mistake

You correct the record by adding to it, not by editing it.

Lent the ladder to Ana and typed Tom? Record a note saying so. Recorded a repair cost that
turned out to be wrong? Record a note with the real figure. Marked something sold that you
actually still have? The sale stays in the history and the note explains it.

Nothing rewrites itself behind your back, and nothing quietly disappears.

---

## Why the history is the source of truth

The status you see is worked out from the events every time it is shown. It is not stored
anywhere. That is a deliberate choice, and it buys two things.

**Nothing can disagree with itself.** If status were a field, every action would have to
write two things, the event and the field, and any place that wrote one and not the other
would leave an item saying "in possession" with an open loan sitting underneath it. Those
bugs are quiet, they accumulate, and you find them on the day you need the data. Deriving the
status means there is only one thing to write.

**"How did it get like this" always has an answer.** A stored status tells you an item is
broken. A history tells you it was fine for three years, went out on loan twice, came back
with a cracked housing, and cost 118.50 to put right. The second one is worth keeping.

The cost is that the app has to read an item's events to know its status, which is why events
are loaded for a whole property in one go rather than one query per row.

---

## What this does not do yet

- **A Moved event is a note on the timeline.** It records that the item moved. It does not
  change the item's Location field, so change that on the item itself.
- **Acquired events are written for you when you buy something from the wishlist**, so those
  items start life with real history. See
  [Wishlist and prices](./WISHLIST_AND_PRICES.md#buying-something). For everything else, fill
  in the purchase date and price on the item, which the value figures read as a fallback.
- **Value reassessed** exists in the record and survives backup and restore, but the Record
  menu does not offer it yet. To change an estimate today, set the value on the item and pick
  the manual method. See [Value](./VALUE.md#choosing-how-value-is-estimated).
- **Status cannot be set directly**, by design. If an item shows the wrong status, the fix is
  to record the event that was missed.

---

## Related

- [Value](./VALUE.md) - what an item is worth now, and what it has cost you.
- [Wishlist and prices](./WISHLIST_AND_PRICES.md) - the half of this that happens before you own it.
- [User guide](./USER_GUIDE.md) - every screen and field.
- [Documentation index](./INDEX.md) - everything else.
