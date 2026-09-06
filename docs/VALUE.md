# Value

**Last updated:** 2026-09-05

What you paid is history. What it is worth now, and what it has cost you to own, are the
numbers that answer real questions: how much cover do I need, was the expensive one actually
the expensive one, what is on that shelf worth.

With the value figures you can:

- See on any item how long you have owned it, what you paid, what it is worth today, what you
  have spent on repairs, and what the whole thing has cost per month.
- Pick how each item loses value, or say it does not.
- See where the value in your collection sits, broken down by category, by location and by
  brand.
- Download a spreadsheet of everything, with serial numbers, for an insurer or an accountant.

---

## What an item shows you

Open an item and the Value card gives you up to five figures. Anything unknown is left out
rather than shown as a zero.

| Figure            | What it is                                                                          |
| ----------------- | ----------------------------------------------------------------------------------- |
| Owned for         | Calendar age, read as "4 years, 9 months"                                           |
| Paid              | What it cost to buy                                                                 |
| Worth now         | The estimate today, with the method named underneath                                |
| Repairs           | Everything spent on repairs across its life                                         |
| Cost of ownership | Purchase plus repairs less anything a sale recovered, and the same figure per month |

An item with no purchase date and no price says so and offers to start tracking, instead of
showing a grid of zeroes.

---

## Choosing how value is estimated

Set this on the item, under how value should be estimated. There are four choices.

| Method            | What it does                                                                                            | Reach for it when                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| No depreciation   | Worth now is whatever you entered as the current estimate, or the purchase price if you entered nothing | Hand tools, ladders, anything that holds its value                            |
| Straight line     | Loses the same amount every month over a life you set, down to a floor you set                          | Things with a predictable working life: a compressor, a generator, a van rack |
| Declining balance | Loses a share of what is left each year, down to a floor                                                | Electronics, laptops, cameras, network gear, cordless tools                   |
| Set manually      | Worth now is exactly the number you typed, and nothing recalculates it                                  | Anything appraised, collectable, or genuinely appreciating                    |

Both automatic methods take a **floor**: a value the item never drops below, however old it
gets. A switch that will always fetch 100 as a spare is not worth zero after eight years, and
saying it is makes an insurance schedule wrong in the direction that costs you money.

---

## Straight line, worked

A DeWalt DCD996 hammer drill. Paid **249.00**, useful life **96 months** (eight years), floor
**25.00**.

The depreciable part is 249.00 less the 25.00 floor, so 224.00. Spread over 96 months, that
is **2.33 a month**, every month, until it reaches the floor and stops.

| Months owned | Worth  |
| ------------ | ------ |
| 0            | 249.00 |
| 12           | 221.00 |
| 30           | 179.00 |
| 96           | 25.00  |
| 120          | 25.00  |

Straight line is arithmetic anyone can check. Its weakness is that it says the drill lost the
same 2.33 in its first month as in its eightieth, which is not what happened.

---

## Declining balance, worked

A Ubiquiti USW-Pro-24-PoE switch. Paid **800.00**, losing **30 percent a year**, floor
**100.00**.

Each year it loses 30 percent of what is left, not 30 percent of what it cost. Year one takes
240.00 and leaves 560.00. Year two takes 30 percent of that 560.00, so 168.00, leaving 392.00.
The losses get smaller as the thing gets older, which is how gear actually behaves.

| Months owned | Worth  |
| ------------ | ------ |
| 12           | 560.00 |
| 18           | 468.53 |
| 24           | 392.00 |
| 36           | 274.40 |
| 60           | 134.46 |
| 72           | 100.00 |

Part-years are handled properly, which is why the 18 month figure sits between the 12 and 24
month ones instead of jumping on the anniversary. Somewhere just before year six the curve
crosses the 100.00 floor, and from then on it reads 100.00.

---

## The two side by side

The same 800.00 switch, the same 100.00 floor, straight line over eight years against
declining balance at 30 percent.

| Months owned | Straight line | Declining balance |
| ------------ | ------------- | ----------------- |
| 12           | 712.50        | 560.00            |
| 24           | 625.00        | 392.00            |
| 36           | 537.50        | 274.40            |
| 60           | 362.50        | 134.46            |
| 96           | 100.00        | 100.00            |

After one year straight line says the switch is worth 712.50 and declining balance says
560.00. Try selling a year-old switch. Declining balance is closer, and the gap is widest
exactly where it matters, in the first two or three years when the item is most worth
insuring and most likely to be sold on.

Rule of thumb: if it has a chip in it, use declining balance. If it has a motor and a service
schedule, straight line is fine. If it is a hammer, use no depreciation at all.

---

## Age of ownership

Age is counted in calendar months, not averaged ones. An item bought on 14 March 2021 reads
as **5 years, 5 months** on 5 September 2026, and turns over on the day of the month you
bought it. Under a month it reads "Less than a month". A purchase date in the future counts
as no ownership rather than negative.

The depreciation maths uses a continuous month instead, so value moves smoothly day by day
rather than lurching once a month.

---

## Cost of ownership

    purchase + repairs - whatever a sale recovered

That is the number that answers "was it worth it", and it is shown per month as well as in
total.

The mower from [Lifecycle](./LIFECYCLE.md#a-worked-example): paid **799.00**, one repair at
**118.50**, owned five years.

|                   |        |
| ----------------- | ------ |
| Purchase          | 799.00 |
| Repairs           | 118.50 |
| Total             | 917.50 |
| Cost of ownership | 917.50 |
| Per month         | 15.29  |

Sell it at the five-year mark for 250.00 and the sale comes off:

|                   |        |
| ----------------- | ------ |
| Total spent       | 917.50 |
| Recovered         | 250.00 |
| Cost of ownership | 667.50 |
| Per month         | 11.13  |

### Which drill was expensive

Two drills, side by side.

|                   | Cheap drill           | Better drill                |
| ----------------- | --------------------- | --------------------------- |
| Paid              | 59.00                 | 249.00                      |
| Repairs           | none                  | 45.00                       |
| Still working     | no, dead at 14 months | yes, 74 months and counting |
| Cost of ownership | 59.00                 | 294.00                      |
| Per month         | 4.21                  | 3.97                        |

The 249.00 drill is the cheap one, and it has been the cheap one since month 70. You cannot
see that from a purchase price, and you cannot see it from a list of what you own. You can
see it from a history plus a date.

The per-month figure appears once you have owned something for at least a month.

---

## Where the purchase figure comes from

If the item has an **Acquired** event, that event's date and amount win, because the history
is the record of what happened. If it does not, the purchase date and price on the item are
used instead.

Most items have no Acquired event. Items bought through the wishlist do, which is why they
arrive with real history and a correct age from day one. See
[Wishlist and prices](./WISHLIST_AND_PRICES.md#buying-something).

---

## A blank is not a zero

Where nothing is known, nothing is shown. An item with no price and no estimate has no "Worth
now" line at all, rather than a "0.00" line.

They are different claims. Zero means you believe the thing is worthless. Blank means you
have not said. Printing one when you meant the other is how a schedule of assets ends up
understating a garage by several thousand, and nobody notices until the claim.

---

## Where the value is

The dashboard totals the whole property and breaks it down three ways: by **category**, by
**location** and by **brand**. Each row shows the total worth now and the number of items,
with a bar sized against the largest group, so the shape reads without reading every number.
Rows are sorted most valuable first, because the point of a breakdown is knowing what to look
at.

Items without one of those fields are grouped as "Uncategorised", "No location" or "No brand"
rather than dropped.

**The totals count only what you still hold.** Sold, lost and archived items are excluded, so
selling a table saw reduces the number instead of leaving it propping up a total you cannot
claim on. A sold item contributes what it actually fetched to the sale total, not an estimate
of what it might have been worth had you kept it.

One thing spans everything: total repair spend covers every item in the property, including
gear you have since sold, lost or archived. That is what makes it a useful figure over years.

---

## The report

**Download report (CSV)** on the dashboard writes a spreadsheet named for the day you made
it, for example `brassworth-report-2026-09-05.csv`. Every item in the property is in it,
including sold, lost and archived ones, with the status spelled out so the reader can tell
which is which.

Thirteen columns:

| Column         | Notes                                    |
| -------------- | ---------------------------------------- |
| Item           |                                          |
| Brand          |                                          |
| Model          |                                          |
| Serial number  | The column a claims adjuster reads first |
| Category       |                                          |
| Location       |                                          |
| Condition      | New, Good, Fair, Poor, Damaged, Disposed |
| Status         | Worked out from the history              |
| Quantity       |                                          |
| Purchase date  | Plain year-month-day                     |
| Purchase price | Two decimal places, or blank if unknown  |
| Current value  | Two decimal places, or blank if unknown  |
| Repair spend   | Blank when nothing has been spent        |

Money is written as fixed two-decimal text so a spreadsheet cannot quietly turn 1,299.00 into
a date or drop a trailing zero. Anything containing a comma, a quote or a line break is
quoted and escaped to the standard every spreadsheet reads, so an item called `Drill, 18V
"Gen 5"` survives the round trip intact.

It is deliberately verbose. An adjuster settling a burglary claim, or an accountant building
a depreciation schedule, wants one row per thing with the serial number on it, not a summary.

---

## Why there is no automatic market valuation

There is no button that tells you what your gear would fetch on the open market, and there is
not going to be one until there is real price data behind it.

An earlier design had one. It was dropped, because with no data source underneath it, an
automatic market value is a plausible-looking number that was invented. It would print with
two decimal places, sit in a column next to figures that are true, and get copied onto an
insurance schedule or a tax return by somebody who reasonably assumed it meant something.

Every number in this app can be traced to something you recorded or arithmetic you can check
by hand. A depreciation curve is a stated assumption you chose. A guess dressed as a
valuation is not, and a wrong number that looks authoritative is worse than a blank.

Recorded prices for things you do not own yet are a different matter, and those are real
observations you or a feed put in. See
[Wishlist and prices](./WISHLIST_AND_PRICES.md#price-history).

---

## Related

- [Lifecycle](./LIFECYCLE.md) - loans, repairs, sales, and the history these figures read.
- [Wishlist and prices](./WISHLIST_AND_PRICES.md) - saving up, target prices, and price history.
- [User guide](./USER_GUIDE.md) - every screen and field.
- [Documentation index](./INDEX.md) - everything else.
