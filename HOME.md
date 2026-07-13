# FinancialWebApp — Home View

The Home view is the landing page of the app. It gives an at-a-glance picture of financial health without requiring any interaction. All data here is read-only — entries originate in the Dashboard. The view recalculates and re-renders every time it is opened.

---

## KPI Row

Four cards at the top summarise the most important numbers at a glance.

- **Total Saved** — all-time net reserve balance: cumulative savings across every category and period, minus any *Savings* withdrawals (Expenses type, Savings category). This is the running total from the first entry to the most recent, not scoped to any month. Because savings can sit in foreign currencies (via *Savings → Other*), this figure is an **approximate total converted into the regional currency** and is prefixed with `≈`. Conversion uses the exchange rates managed in Settings (live rates with optional manual overrides); currencies without a known rate are counted at face value.
- **Monthly Income** — *earned* income recorded in the reference month (see below). Starting Funds (the opening balance) is excluded, so a month containing only an opening balance does not register as having income.
- **Monthly Expenses** — total expenses recorded in the reference month.
- **Available** — the all-time spendable balance: `Opening Balance + Income − Savings (Flow type only) − Expenses`. This is your running pool of liquid money — the opening balance and all earned income, less whatever you moved into the reserve (Savings → Flow) and everything you spent. Reserve withdrawals and *Savings → Other* deposits do not affect it. It is the same figure the Dashboard used to show as "Flow", computed from the shared `recalculateTotals()`. Turns red when negative. Unlike the two monthly cards beside it, this is an all-time balance (like Total Saved).

  **Potential sub-value.** When any *Potential*-type entries exist (a partner's money stream — see DASHBOARD.md), the Available card grows a two-line sub-value beneath the main figure: **potential** — the all-time net of Potential Income minus Potential Expenses, a *growing* pool you reconcile monthly rather than track daily — and **together**, the combined `Available + potential`. This mirrors the actual → projected → total presentation of the Forecasting cards. Potential money is otherwise excluded from Available and from every other card and analytic; if no Potential entries exist, the sub-value is hidden and the card looks exactly as it did for solo use.

### Reference Month

The Monthly Income and Monthly Expenses cards and the Financial Health panel operate against a single reference month rather than the current calendar month unconditionally. (Total Saved and Available are all-time balances and ignore the reference month.) The reference month is the current month if it has any *earned* income recorded (Starting Funds does not count). If it does not — for example, at the start of a new month before any entries have been made — the view walks back up to 12 months to find the most recent month that does have income and uses that instead.

This prevents the cards from showing zeros at the start of a new month when the previous month's data is the meaningful context. The Financial Health panel always shows which month is being used.

---

## Savings Holdings

A sheet summarising where savings sit, grouped by currency and holding type. Columns are **Amount | Currency | Type**, one row per unique `(currency, holding type)` combination found across all savings entries.

Amounts are gross savings deposits — the sum of every *Savings*-type entry in that group. This is a visual representation only: there is no currency conversion, and reserve withdrawals (the *Savings* expense category) are **not** netted out in this phase. Rows are sorted by currency, then by amount descending. If no savings have been recorded, the panel shows a no-data state.

The currency shown on each entry comes from the Dashboard entry form; the regional currency is applied by default, with foreign currencies possible on *Savings → Other* entries. Holding types (Cash, Card, Bank, Other) are also set on the Dashboard when the entry type is Savings.

---

## Recent Transactions

The 5 most recent committed entries across all types, sorted newest first. Because entries are day-level only, entries sharing a date are ordered by commit order (most recently committed first). Each row shows the date, the category label in plain white text, and the amount with a sign prefix (`+` for income, `~` for savings, `−` for expenses). *Potential* entries are signed by their own direction (`+` for Potential Income, `−` for Potential Expenses) and carry a small *potential* tag. The amount is colour-coded by direction: green for money in (income and savings), red for expenses, indigo for potential.

This is a read-only snapshot. The full transaction list with filters is in the Dashboard.

---

## Expense Breakdown

A donut chart of the current month's expenses by category, showing each category's share of total spending for that month. Only categories with non-zero spend appear. If there are no expenses this month, the panel shows a no-data state.

This panel always uses the current calendar month, regardless of which reference month the KPI row has resolved to.

---

## Financial Health

Three ratio bars measuring the reference month's numbers against common financial health thresholds. Each bar fills relative to its ceiling or target, and is colour-coded by status.

**Savings Rate** — income-funded savings (Flow-category only) as a percentage of income. *Savings → Other* deposits (external money entering the reserve) and reserve withdrawals are deliberately excluded, so the rate reflects how much of your income you set aside and cannot exceed 100% or go negative. Target: ≥ 20%. Green at or above target, amber between 10–20%, red below 10%.

**Expense Ratio** — total expenses as a percentage of income. Ceiling: 80%. Green when comfortably below (under ~68%), amber when approaching, red at or above the ceiling.

**Rent Burden** — rent specifically as a percentage of income. Ceiling: 30%. Same colour logic as Expense Ratio.

When the reference month has no income all three bars show `--` and remain empty, since ratios against zero income are meaningless. The panel header always shows which month the ratios are calculated against.
