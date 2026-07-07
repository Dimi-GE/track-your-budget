# FinancialWebApp — Analytics View

The Analytics view is focused entirely on pattern recognition and forward-looking insight. It does not allow data entry — everything here is derived from the committed entries in the Dashboard. The view is divided into three sections that build on each other: raw activity patterns, historical trends, and a projection into the future.

---

## Activity Intensity

Two side-by-side heatmaps — Spending on the left, Earnings on the right — showing financial activity at the day level across a selected quarter.

Each cell represents one calendar day. The colour intensity of a cell reflects how much was recorded on that day relative to other active days in the same quarter. Levels are assigned using quartile thresholds, not absolute values:

- **Level 0** — no activity
- **Level 1** — below the 25th percentile of active days
- **Level 2** — between the 25th and 50th percentile
- **Level 3** — between the 50th and 75th percentile
- **Level 4** — at or above the 75th percentile

This relative scale is intentional. Using absolute thresholds would cause high fixed costs (e.g. rent) to dominate at the top level every month, compressing all other activity into the lower levels. With quartile scaling, you see meaningful variation across the full range of your spending or earning behaviour.

Starting Funds (the opening balance) is excluded from the Earnings heatmap for the same reason — a one-time opening sum would otherwise peg its day at the top level and crush every real earning day down the relative scale.

**Year picker** — a slot-machine style selector showing the selected year in context. Click adjacent years to navigate. Future years are shown as inactive.

**Quarter buttons (Q1–Q4)** — switch between quarters within the selected year. Future quarters within the current year are disabled.

**Sync toggle** — the link icon button between the two heatmaps. When active (default), navigating either heatmap to a different year or quarter automatically mirrors the change on the other. When disabled, both heatmaps can be browsed independently.

---

## Trends

A 12-month line chart showing income, expenses, savings, and cash flow across a chosen budget year — the historical (actuals-only) counterpart to Forecasting.

Four lines are plotted:
- **Income** — green (Starting Funds excluded — it is not earned income)
- **Expenses** — red
- **Savings** — blue (net reserve movement: deposits minus withdrawals)
- **Cash Flow** — amber, dashed (income minus savings of Flow type minus expenses)

**Budget Year** — a start month and year are selected via the picker at the top, and the chart covers exactly 12 months from that point. The selection is saved and restored across sessions, and defaults to the earliest month that has committed data. This picker is **independent of Forecasting's** — the two sections keep their own budget-year settings, so you can view different windows in each at once.

Trends and Forecasting share the same underlying 12-month engine, so their numbers can never disagree. The difference is that Trends plots only recorded months: past and current-month values are drawn, and any months in the window that lie in the future are simply left off (the lines end at the current month) rather than being projected. For the forward projection, see Forecasting below.

Hovering any point shows all four values for that period in a shared tooltip. The chart uses a shared index interaction, so the tooltip tracks across all lines simultaneously.

---

## Forecasting

A 12-month rolling projection from a user-selected budget year start, combining actual recorded data with a weighted estimate for months not yet recorded.

### Budget Year

The budget year is not tied to the calendar year. A start month and year are selected via the picker at the top of the section, and the forecast always covers exactly 12 months from that point. The selection is saved and restored across sessions.

The picker defaults to the earliest month that has committed data, on the assumption that is when meaningful tracking began.

### How the Projection Works

All committed months up to and including the current month are used to compute a weighted average per entry type (income, expenses, savings). Starting Funds (the opening balance) is excluded from every series, so a one-time opening sum never inflates the projection. Cash flow subtracts only Flow-category savings, so a *Savings → Other* deposit does not depress it. The weighting is linear — the most recent month has the highest weight, the oldest has the lowest. This means gradual changes in behaviour (a salary increase, a new recurring expense) naturally pull the projection forward rather than being diluted by older data.

Each month in the 12-month window is assigned one of three statuses:

- **Actual** — past months with recorded data, shown with solid lines and filled points on the chart.
- **Partial** — the current month, which has data but is not yet complete. Treated as actual.
- **Projected** — future months, shown with dashed lines and hollow points, using the weighted average.

A label beneath the picker indicates how many months of data the projection is based on. The more months recorded, the more reliable the weighted average becomes.

### The Chart

A 12-month line chart with the same four metrics as Trends (income, expenses, savings, cash flow). The visual boundary between actual and projected is marked by the line style changing from solid to dashed at the last recorded month. Tooltips indicate whether a given point is actual, in progress, or projected.

### Summary Cards

Four cards below the chart — Income, Expenses, Savings, Net Cash Flow — each showing three values:

- **To date** — the sum of actual months within the budget window so far.
- **Projected** — the sum of remaining future months, prefixed with `+` (or `−` for negative cash flow).
- **Year-end** — the total: to date plus projected. This is the headline number — what the full 12-month period is expected to add up to based on current patterns.

Net Cash Flow turns red if the year-end total is negative.

---
