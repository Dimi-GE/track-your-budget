## v0.0.2b.0 — July 2026

- `feature` Settings — GitHub Gist Sync: connect a personal access token (gist scope) and a Gist ID to back up dashboard data to a remote JSON file; the token is stored only in this browser's localStorage
- `feature` Settings — Connect/Disconnect toggle verifies the token and Gist against GitHub before saving; on connect the fields lock and a status line confirms the link, on disconnect the token is cleared from both the field and localStorage
- `feature` Remote backup — smart connect establishes a baseline on first link: seeds an empty Gist with local data, adopts the remote copy when it is newer, or pushes local when it is newer; ties and un-comparable timestamps keep local (least destructive)
- `feature` Remote backup — dashboard Apply pushes committed data to the Gist, and the app pulls once on open and adopts the remote copy when newer (newest-wins via `_meta.date`)
- `feature` Remote backup — synced JSON mirrors the dashboard export structure (`entries` plus a `_meta.date`) so the Gist file stays interchangeable with manual file backups
- `feature` Dashboard — Savings expense category: a withdrawal from the reserve, available only when Type is Expenses; it nets down the Savings balance instead of counting as an expense and leaves Flow untouched
- `improvement` Savings withdrawals excluded from all expense analytics — Expenses by Category chart, Home expense breakdown and spending trend, and Behavior Analytics trends, spending heatmap, and forecast — keeping those focused on income-funded spending
- `improvement` Savings totals now net of withdrawals across the Overview Savings card and Home Total Saved; `isSavingsWithdrawal()` helper added to app.js so the rule is defined once and applied consistently
- `fix` Dashboard export — global and period exports now write only `entries` (the source of truth); derived totals were removed from the file since import recalculates them, so hand-editing a top-level total no longer silently has no effect
- `parked` Hours Reports (time-tracking) unwired from the UI — hidden from sidebar navigation and blocked from session restore via a disabled-views guard; the view code is retained pending migration to a standalone project

## v0.0.1b — June 2026

- `fix` Loading — per-view spinner replaces the former full-screen overlay; spinner appears inside the content area on first visit to each view and lifts only when the view signals it is fully rendered, preventing content flash across all views
- `fix` Loading — `window.viewReady()` callback introduced; each view's init function calls it at the natural end of its async work (after charts render, sub-components load, and markdown fetches complete) so the spinner duration is tied to actual content readiness rather than a fixed timeout
- `fix` Loading — 350ms fallback timeout added to force-remove the overlay when `transitionend` does not fire; prevents the invisible overlay from blocking pointer events on synchronously-initialised views such as Hours Reports
- `improvement` Loading — load time logged to console per view (`[viewName] ready in Xms`) to aid performance profiling
- `improvement` Loading — 8-second safety timeout auto-dismisses the spinner if a view's init never signals ready, preventing the overlay from hanging indefinitely
- `improvement` Hours Reports — view renamed from Time Tracking across all user-facing labels, navigation, view title, changelog, and roadmap entries; internal file paths unchanged
- `improvement` Hours Reports — Today and This Week sections removed; view now focuses on the monthly calendar and timer only
- `docs` HOME.md added covering KPI row, reference month logic, Spending Trend, Recent Transactions, Expense Breakdown, and Financial Health panels
- `docs` HOURS.md added covering Timesheet Settings, Timer, Calendar, Day Entry Modal, and File Operations

## v0.0.1c.7 — June 2026

- `feature` Settings — Backup All Data action downloads a full snapshot of all dashboard entries, time tracking records, and preferences as a single dated JSON file
- `feature` Settings — Restore from Backup action reads a backup JSON file and replaces all current data; requires a file-picker confirm step before overwriting
- `feature` Hours Reports — month total row added below the calendar showing cumulative hours for the displayed month; updates on every render including month navigation
- `feature` Hours Reports — calendar Export JSON and Import JSON actions for sharing data across devices; export covers all entries and sessions, import does a full replace then re-renders
- `improvement` Hours Reports — Export JSON, Import JSON, and Export PDF buttons consolidated into a collapsible file-ops panel behind a single toggle button, matching the dashboard pattern and fixing overflow on narrow mobile screens
- `improvement` Settings — Backup, Restore, and Reset share a single STORAGE_KEYS array so adding new views keeps all three actions in sync automatically
- `fix` Mobile — `100dvh` added alongside `100vh` on body, window wrapper, and mobile drawer to correct content clipping caused by browser chrome on iOS Safari and Android
- `fix` Loading — full-screen overlay with spinner shown on initial page load, fades out after 2 seconds, preventing section-by-section flash of unstyled content on first paint
- `fix` View transitions — `loadCSS()` converted to return a Promise; HTML is now injected only after the view stylesheet has fully loaded, eliminating per-view flash of unstyled content on first visit

## v0.0.1c.6 — June 2026

- `feature` Mobile navigation — sidebar hidden on touch devices; hamburger button (fixed, top-right) opens a slide-in drawer with full nav labels; backdrop tap closes it
- `feature` Settings view — new view with a Reset All Data action; requires inline confirmation before clearing all localStorage keys and reloading to Home
- `improvement` Recent Transactions — note moved to a second line below the date/amount/type/category row
- `improvement` Recent Transactions — filters hidden when collapsed; "Full History" link hidden when expanded; collapse via backdrop tap only
- `fix` Dashboard inputs — font-size forced to 16px on touch devices to prevent iOS Safari auto-zoom on focus

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

- `feature` Hours Reports — Submit button wires timer to the calendar: submitting a session adds hours and task label to today's calendar entry, the Today list, and the This Week bars
- `feature` Hours Reports — Today sessions rendered as a scrollable list capped at 4 visible entries, wrapped in a surface card
- `feature` Hours Reports — This Week bars now reflect real data from committed entries, scaling relative to the busiest day
- `improvement` Hours Reports — Settings and Timer placed side by side in a responsive flex row that stacks on narrow screens
- `improvement` Hours Reports — Timer counter reduced to 28px; tag dropdown removed as unused
- `improvement` Hours Reports — Submit button styled with orange border and text; both buttons compacted
- `improvement` Hours Reports — View no longer capped at 900px; fills the full content frame like other views
- `improvement` PDF export — other-month days (overflow weeks) now styled the same as weekends — lighter salmon fill
- `improvement` PDF export — row height tightened: font reduced to 8.5pt, cell padding halved to 1.5mm
- `improvement` Analytics — heatmap intensity row made responsive; columns wrap on narrow screens

## v0.0.1c.2 — June 2026

- `feature` Roadmap entries rendered as rows with horizontal card layout — each category (Planned, In Progress, Ideas, Done) is a labelled row with cards flowing inline
- `improvement` Roadmap category order standardised: Planned → In Progress → Ideas → Done
- `improvement` Roadmap categories styled with per-status background tint and coloured border
- `improvement` Roadmap card lists capped at ~4 visible entries with vertical scroll
- `feature` Hours Reports — monthly timesheet calendar with day-level entry (hours + tasks per day)
- `feature` Hours Reports — freelancer name and company settings persisted to localStorage
- `feature` Hours Reports — PDF export via jsPDF generating a weekly timesheet matching the standard spreadsheet format
- `improvement` PDF timesheet uses Excel-matched salmon fills, violet label column, black grid lines, and grey fill on logged days

## v0.0.1c.1 — June 2026

- `feature` Forecasting mechanism with 12-month rolling budget year, weighted average projection, and three-value summary cards (to date / projected / year-end)
- `feature` Roadmap and Hours Reports view shells added to sidebar navigation
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
