# FinancialWebApp — Features Overview

---

## Dashboard

### New Entry

The entry form is where all financial data originates. Every record in the app starts here before it touches any chart or calculation.

**Fields:**
- **Date** — defaults to today, can be set to any past date. This allows backfilling historical data (e.g. from a banking app) without being tied to when you're actually sitting at the app.
- **Amount** — numeric, no currency symbol.
- **Type** — three options: Income, Savings, Expenses. The type selection drives what categories are available.
- **Category** — changes depending on type:
  - *Income:* Starting Funds, Salary, Other
  - *Savings:* Flow, Other
  - *Expenses:* Groceries, Deliveries, Pets, Medical, Media, Subscriptions, Rent, Online, Shopping, Gifts, Transport, Personal, Savings
- **Note** — optional free-text field, visible in the transaction list.

**Starting Funds** is a special income category. It can only be added once and represents the opening balance before any income or expenses are tracked. Once set, it disappears from the category list.

**Savings** is a special *expense* category representing a **withdrawal from the reserve** — money taken out of savings in a critical situation (think of it as pulling cash off a savings/credit card). It is not consumption of income, so it behaves differently from every other expense category:
- It **reduces the Savings total** (net reserve balance = deposits − withdrawals) rather than adding to Total Expenses.
- It **does not affect Flow**, since the money comes from the reserve, not from income cash flow.
- It is **excluded from all expense analytics** — the Expenses by Category chart, the Home expense breakdown and spending trend, and the Behavior Analytics trends/heatmap/forecast — which stay focused on income-funded spending.

It still appears in the transaction list (as an outflow) so the withdrawal is on record.

**Backup (file operations)** — accessible via the file icon button, this panel slides open with three controls: a filename field, Export, and Import. Export saves the entire dataset as a `.json` file. Import replaces the current dataset with a file. Both operate on the full history, not a specific period.

---

### Staged Entries

Entries added via the form go into a staging area before they are committed. This is intentional — it lets you prepare a batch of entries (for example, an entire month of backfilled data) and review them before they affect any numbers.

Each staged entry shows date, amount, type, and category. Individual entries can be deleted from staging before committing. The **Apply** button commits all staged entries at once and updates every view in the app immediately. Until Apply is pressed, the Overview cards and all analytics remain unchanged.

---

### Overview

Four cards showing cumulative totals across the entire committed dataset (no period filter — these are all-time sums):

- **Income** — total of all income entries, including Starting Funds.
- **Savings** — net reserve balance: total of all savings entries minus any *Savings* withdrawals (Expenses type, Savings category).
- **Total Expenses** — sum of all expense entries across all categories.
- **Flow** — the net result: `Income − Savings (Flow type only) − Expenses`. This is what you actually have available after obligations are met. The Flow card is visually highlighted as it's the single most important number on the dashboard.

The distinction between Savings and Flow in the Flow formula is intentional: only savings categorised as *Flow* are deducted (money moved out of free cash), while savings categorised as *Other* are treated differently — the assumption being that "Other" savings may not directly reduce liquid funds in the same accounting period.

---

### Expenses by Category

A bar chart breaking down spending across all 12 expense categories for a selected time period. Categories are sorted descending by spend — the highest category always appears first, so the most impactful expenses are immediately visible without scanning.

Each bar is colour-coded and topped with the category icon rendered directly onto the chart canvas. Zero-spend categories are still shown at zero height, keeping the layout consistent regardless of which categories are active in a given period.

**Period picker** — two date inputs (start and end) that default to the current calendar month. Changing either date instantly re-renders the chart. The period selection is also used by the period-level export and import controls.

**Legend** — a toggleable panel listing all 12 categories with their icon and colour. Useful for reference when the chart bars are too narrow to read the icons clearly.

**Period file operations** — a secondary file panel (separate from the global backup) scoped to the selected period:
- *Export period* — saves only the entries within the selected date range as a `.json` file, with the period dates included in the filename automatically.
- *Import period* — imports a period file and merges it into the existing dataset. Entries within the period are replaced; entries outside the period are untouched. This allows updating a specific month without disturbing the rest of the history.

---

### Recent Transactions

A reverse-chronological list of all committed entries, displayed below the expenses chart. Shows date, amount, type, category, and note (if present) for each entry.

**Filters** — two dropdowns at the top of the section: type (Income / Savings / Expenses / All) and category. The category dropdown is context-aware — it only shows categories that actually appear in the entries matching the current type filter, not the full static list.

**Full History** — by default the list shows a compact view. Clicking *Full History* expands it into an overlay panel that covers the page, with a backdrop click to dismiss. This keeps the dashboard uncluttered day-to-day while still providing access to the complete record when needed.

---
