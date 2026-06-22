## Planned

### Settings — Extended Configuration
Additional settings: budget year defaults, currency symbol, theme options.

### Onboarding
Guided introduction to the app covering the data entry workflow, what Flow means, and how the analytics build on committed data.

## Backlog

### Transactions View
Dedicated full-screen transaction history, separate from the Dashboard panel. Currently a disabled sidebar item.

### Home View
Live KPI cards pulling from committed data. Spending trend mini-chart. Recent transactions panel. Currently a visual placeholder.

### HackMD Integration
Pull document content from the HackMD API. Edit docs collaboratively online, see them reflected in the app automatically without touching code.

### GitHub Pages Variant
A one-pager version of the app hosted on GitHub Pages, with per-user appearance customisation.

### Gamification
Achievement system to encourage consistent tracking. Milestones unlock features or surface insights — for example, three months of data unlocks forecasting confidence indicators.

### PDF: Financial Report Export
One-click budget report covering a selected period: income, expenses, savings breakdown, and a forecast snapshot.

### Multi-currency Support
Track income and expenses in different currencies with a configurable base currency for display.

### Profiles
Option to split the dashboard into a seperate project, tracking X financial dashboards separately.

### Customization
Ability to make custom widgets/sections (board constructor?).

### AI-Powered Workflow
Ability to use agentic LLM via API key.

## Done

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

### PDF: Time Tracking Export
One-click time tracking report export.

### Time Tracking View
Shell created with calendar, timer, sessions list, and weekly bar chart. Data model and purpose to be defined.

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
Reverse-chronological list of all committed entries. Type and context-aware category filters. Full History overlay mode.

### Analytics — Activity Intensity
Day-level heatmaps for spending and earnings. Quartile-based colour levels within the displayed quarter. Quarter and year navigation. Sync toggle keeps both maps on the same period.

### Analytics — Trends
Line chart for income, expenses, savings, and cash flow. Week, month, and quarter granularity covering recent history.

### Analytics — Forecasting
Rolling 12-month budget year projection from a user-selected start month. Weighted average built from historical months — recent months carry more weight. Chart splits at today: solid lines for actuals, dashed for projections. Three-value summary cards: to date, projected remaining, and year-end total.
