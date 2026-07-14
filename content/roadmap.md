## Planned

### Onboarding
Guided introduction to the app covering the data entry workflow, what Flow means, and how the analytics build on committed data.

## In Progress

### Settings — Extended Configuration
Additional settings: GitHub Gist Sync, currency symbol.

## Backlog


### PDF: Financial Report Export
One-click budget report covering a selected period: income, expenses, savings breakdown, and a forecast snapshot.

### Multi-currency Support (Full Conversion)
Extend the savings-total conversion to Flow and all analytics, so every
mixed-currency figure resolves to the regional display currency. Builds on the
savings calculator now In Progress.

### Profiles
Option to split the dashboard into a seperate project, tracking X financial dashboards separately.

### Customization
Ability to make custom widgets/sections (board constructor?).

## Done

### Multi-currency Support (Visual)
Phase 1 — display only, no conversion or cross-currency math.
- Per-transaction currency field on the Dashboard entry form, defaulting to
  the regional currency and unlocked only for Savings → Other.
- Holding type (Cash, Card, Bank, Other) captured on Savings entries.
- Settings: manage the currency list and set the regional currency.
- Home: savings holdings sheet (Amount | Currency | Type) replacing the
  spending trend panel, grouped by currency and holding type.
- Currency config synced through both the local JSON backup and the remote Gist snapshot.

Base-currency conversion for savings totals is now In Progress; broader
conversion (Flow, analytics) remains in the Backlog.

### Multi-currency Support (Calculator)
Approximate conversion of savings into the regional currency, shown on Home's
Total Saved card and the Dashboard Savings card (prefixed ≈). Live rates from a
free no-key API with a per-currency manual override, cached and refreshed per
session. Only the savings totals are converted — Flow and analytics stay
regional for now.

### Remote Backup
Connectable full-snapshot backup to a single GitHub Gist. A verified access
token unlocks the Gist; the two connect independently, and disconnecting the
token cascades to clear the Gist as well. Connect establishes a newest-wins
baseline, each app open reconciles per session, the Dashboard Apply backs up the
whole snapshot, and manual Backup / Restore force a push / pull while connected.
Backs up every data key (dashboard entries, currencies, rates, preferences); a
device with no entries pulls rather than pushing, so it can never overwrite a
Gist that already holds data. Credentials are never written into the snapshot.

### Home View
Live KPI cards pulling from committed data. Spending trend mini-chart. Recent transactions panel. Currently a visual placeholder.

### GitHub Pages Variant
A one-pager version of the app hosted on GitHub Pages, with per-user appearance customisation.

### Calendar Manual Sync (Import/Export)
An option for sharing data across devices in case local storage is cleaned on browser exit.

### Overall Data Export
An option export/import data across devices in case local storage is cleaned on browser exit.

### Per-view Documentation
FEATURES.md and ANALYTICS.md covering each view in detail. Authoring convention defined for both cards and docs rendering modes.

### Mobile Navigation
Sidebar hidden on touch devices. Hamburger button opens a slide-in drawer with full nav labels. Backdrop tap to close.

### Settings View
Reset All Data action with inline confirmation. Clears all localStorage keys and reloads to Home.

### Roadmap View
Structure built. Content now driven by markdown files via the engine.

### Markdown Engine
Fetch and render .md files as styled HTML or structured cards. Changelog and Roadmap views powered by content files, no code changes needed to update content.

### Dashboard — New Entry
Full entry form with date, amount, type, category, and optional note. Staged entries workflow — entries are reviewed before being committed. Starting Funds as a one-time income entry that locks once set.

### Dashboard — Overview
Four summary cards: Income, Savings, Total Expenses, and Flow. Flow is the net result after deducting flow-type savings and expenses from income.

### Expenses by Category
Bar chart breaking down spending across all 12 categories for a selected period. Per-category colours and icons rendered on the chart canvas. Toggleable legend. Period-scoped export and import separate from the global backup.

### Recent Transactions
Reverse-chronological list of all committed entries. Type and context-aware category filters. Full History overlay mode. Per-entry edit button opens a modal to change any field (date, amount, type, category, currency, holding, note) and re-commits immediately.

### Analytics — Activity Intensity
Day-level heatmaps for spending and earnings. Quartile-based colour levels within the displayed quarter. Quarter and year navigation. Sync toggle keeps both maps on the same period.

### Analytics — Trends
12-month line chart for income, expenses, savings, and cash flow across a user-selected budget year (own start-month/year picker, saved across sessions). Historical counterpart to Forecasting: shares the same engine but plots recorded months only — future months in the window are left off rather than projected.

### Analytics — Forecasting
Rolling 12-month budget year projection from a user-selected start month. Weighted average built from historical months — recent months carry more weight. Chart splits at today: solid lines for actuals, dashed for projections. Three-value summary cards: to date, projected remaining, and year-end total.
