# FinancialWebApp — Home View

The Home view is the landing page of the app. It gives an at-a-glance picture of financial health without requiring any interaction. All data here is read-only — entries originate in the Dashboard. The view recalculates and re-renders every time it is opened.

---

## KPI Row

Four cards at the top summarise the most important numbers at a glance.

- **Total Saved** — all-time net reserve balance: cumulative savings across every category and period, minus any *Savings* withdrawals (Expenses type, Savings category). This is the running total from the first entry to the most recent, not scoped to any month.
- **Monthly Income** — income recorded in the reference month (see below).
- **Monthly Expenses** — total expenses recorded in the reference month.
- **Cash Flow** — the net result for the reference month: `Income − Savings (Flow type only) − Expenses`. Turns red when negative.

### Reference Month

The KPI row and the Financial Health panel both operate against a single reference month rather than the current calendar month unconditionally. The reference month is the current month if it has any income recorded. If it does not — for example, at the start of a new month before any entries have been made — the view walks back up to 12 months to find the most recent month that does have income and uses that instead.

This prevents the cards from showing zeros at the start of a new month when the previous month's data is the meaningful context. The Financial Health panel always shows which month is being used.

---

## Spending Trend

A mini line chart showing total expenses for each of the last 6 calendar months, including the current month. The x-axis shows abbreviated month names; the y-axis scales to the data range. The chart is directional — it shows whether spending is climbing, falling, or flat over the recent period, not absolute detail.

---

## Recent Transactions

The 5 most recent committed entries across all types, sorted newest first. Each row shows the date, category (colour-coded to match the Dashboard palette), and the amount with a sign prefix (`+` for income, `~` for savings, `−` for expenses).

This is a read-only snapshot. The full transaction list with filters is in the Dashboard.

---

## Expense Breakdown

A donut chart of the current month's expenses by category, showing each category's share of total spending for that month. Only categories with non-zero spend appear. If there are no expenses this month, the panel shows a no-data state.

This panel always uses the current calendar month, regardless of which reference month the KPI row has resolved to.

---

## Financial Health

Three ratio bars measuring the reference month's numbers against common financial health thresholds. Each bar fills relative to its ceiling or target, and is colour-coded by status.

**Savings Rate** — savings as a percentage of income. Target: ≥ 20%. Green at or above target, amber between 10–20%, red below 10%.

**Expense Ratio** — total expenses as a percentage of income. Ceiling: 80%. Green when comfortably below (under ~68%), amber when approaching, red at or above the ceiling.

**Rent Burden** — rent specifically as a percentage of income. Ceiling: 30%. Same colour logic as Expense Ratio.

When the reference month has no income all three bars show `--` and remain empty, since ratios against zero income are meaningless. The panel header always shows which month the ratios are calculated against.
