## v0.0.1c.5 — June 2026

- `feature` Home view — KPI row with Total Saved, Monthly Income, Monthly Expenses, and Cash Flow cards populated from committed data
- `feature` Home view — Spending Trend panel: mini line chart of expenses across the last 6 months
- `feature` Home view — Recent Transactions panel: 5 most recent committed entries with category colours matching the dashboard palette
- `feature` Home view — Expense Breakdown panel: donut chart of current month expenses by category
- `feature` Home view — Financial Health panel replacing Savings Goals: three ratio bars (Savings Rate, Expense Ratio, Rent Burden) with colour-coded status and threshold hints
- `improvement` Financial Health — bars fall back to the most recent month with income when the current month has none yet; panel header shows the reference period
- `improvement` TX_CATEGORY_COLORS, getCategoryColor, TX_TYPE_ICONS, and TX_TYPE_COLORS moved to app.js so they are globally available regardless of which view is active first

## v0.0.1c.4 — June 2026

- `improvement` Recent Transactions — date, type, amount, and category columns are fixed-width for consistent spreadsheet-like alignment
- `improvement` Recent Transactions — notes rendered inline on the same row as the transaction, offset from the category badge
- `improvement` Recent Transactions — category badges coloured to match the Expenses by Category chart palette; income and savings categories have their own distinct colours
- `improvement` Recent Transactions — transaction type shows a coloured icon (trending-up for Income, coin for Savings, trending-down for Expenses)
- `parked` Transactions view hidden from sidebar navigation pending future development

## v0.0.1c.3 — June 2026

- `feature` Time Tracking — Submit button wires timer to the calendar: submitting a session adds hours and task label to today's calendar entry, the Today list, and the This Week bars
- `feature` Time Tracking — Today sessions rendered as a scrollable list capped at 4 visible entries, wrapped in a surface card
- `feature` Time Tracking — This Week bars now reflect real data from committed entries, scaling relative to the busiest day
- `improvement` Time Tracking — Settings and Timer placed side by side in a responsive flex row that stacks on narrow screens
- `improvement` Time Tracking — Timer counter reduced to 28px; tag dropdown removed as unused
- `improvement` Time Tracking — Submit button styled with orange border and text; both buttons compacted
- `improvement` Time Tracking — View no longer capped at 900px; fills the full content frame like other views
- `improvement` PDF export — other-month days (overflow weeks) now styled the same as weekends — lighter salmon fill
- `improvement` PDF export — row height tightened: font reduced to 8.5pt, cell padding halved to 1.5mm
- `improvement` Analytics — heatmap intensity row made responsive; columns wrap on narrow screens

## v0.0.1c.2 — June 2026

- `feature` Roadmap entries rendered as rows with horizontal card layout — each category (Planned, In Progress, Ideas, Done) is a labelled row with cards flowing inline
- `improvement` Roadmap category order standardised: Planned → In Progress → Ideas → Done
- `improvement` Roadmap categories styled with per-status background tint and coloured border
- `improvement` Roadmap card lists capped at ~4 visible entries with vertical scroll
- `feature` Time Tracking — monthly timesheet calendar with day-level entry (hours + tasks per day)
- `feature` Time Tracking — freelancer name and company settings persisted to localStorage
- `feature` Time Tracking — PDF export via jsPDF generating a weekly timesheet matching the standard spreadsheet format
- `improvement` PDF timesheet uses Excel-matched salmon fills, violet label column, black grid lines, and grey fill on logged days

## v0.0.1c.1 — June 2026

- `feature` Forecasting mechanism with 12-month rolling budget year, weighted average projection, and three-value summary cards (to date / projected / year-end)
- `feature` Roadmap and Time Tracking view shells added to sidebar navigation
- `feature` Markdown engine for rendering .md files as styled HTML or structured cards
- `feature` Roadmap and Changelog views powered by content/roadmap.md and content/changelog.md
- `fix` Chart.js race condition causing forecasting chart to not render on first Analytics tab load
- `fix` Section title labels rendering black when Dashboard had not been visited first in a session
- `improvement` Documentation split into per-view files: FEATURES.md and ANALYTICS.md
- `improvement` Budget year start picker persisted to localStorage and restored across sessions

## v0.0.1c.0 — June 2026

- `feature` Analytics view with lazy-loaded component architecture
- `feature` Spending and Earnings heatmaps with day-level activity intensity
- `feature` Quartile-based colour scaling on heatmaps
- `feature` Quarter and year navigation on heatmaps
- `feature` Sync toggle keeping both heatmaps on the same period
- `feature` Trends chart with income, expenses, savings, and cash flow lines
- `feature` Week, month, and quarter granularity on Trends

## v0.0.1d — June 2026

- `feature` Dashboard with staged entries workflow — stage, review, then commit
- `feature` Starting Funds as a one-time income entry
- `feature` Expenses by Category bar chart with period picker and legend
- `feature` Period-scoped export and import for the expenses chart
- `feature` Recent Transactions list with type and category filters
- `feature` Full History overlay mode for transaction list
- `feature` Overview cards: Income, Savings, Total Expenses, Flow
- `feature` Global backup export and import via JSON file
- `feature` Data persisted to localStorage across sessions
