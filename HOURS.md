# FinancialWebApp — Hours Reports View

The Hours Reports view is a freelance timesheet. It is independent of the financial data in the Dashboard — it has its own storage keys and does not feed into any financial calculations or analytics. The view covers three concerns: settings that appear on the exported timesheet, a live timer for capturing sessions, and a calendar for logging and reviewing hours by day.

---

## Timesheet Settings

Two fields that persist automatically on blur:

- **Freelancer Name** — appears in the PDF export header as the person submitting the timesheet.
- **Company** — the client or company the timesheet is addressed to.

Both are stored in localStorage and restored on every visit.

---

## Timer

A running clock for tracking time against the current work session.

**Start / Stop** — toggles the timer. The button label and display colour change to reflect the running state.

**Task label** — a free-text field for naming what is being worked on. When the session is submitted, this label is merged into today's calendar entry as a task.

**Submit** — commits the elapsed time to today's calendar entry. Hours are accumulated — multiple submissions in a day stack on top of each other. The task label is appended to the day's task list if it is not already present. The timer resets to zero after submission. Submitting with less than 1 second elapsed is silently ignored.

---

## Calendar

A monthly calendar showing logged hours and tasks at the day level.

**Navigation** — previous and next arrow buttons step through months one at a time. The calendar opens on the current month.

**Day cells** — each day is a button. Days with logged hours show the hour count and any associated task labels. Today is highlighted. Weekend days and overflow days from adjacent months (the partial weeks at the start and end of a calendar grid) are visually distinguished. Clicking any day opens the entry modal.

**Month total** — a row below the calendar grid showing cumulative hours logged for the displayed month. Updates on every render including month navigation.

---

## Day Entry Modal

Clicking any calendar day opens a modal for viewing or editing that day's record directly, without going through the timer.

- **Hours** — numeric input, accepts decimals and 0.5 steps. Overwrites (does not add to) whatever hours are already logged for that day.
- **Tasks** — a text area with one task per line. Overwrites the existing task list for that day.

**Save** — writes the entry and re-renders the calendar.
**Clear** — deletes the day's entry entirely and re-renders.
**Cancel** — closes without making any changes.

The modal can also be dismissed by clicking the backdrop outside it.

---

## File Operations

A collapsible panel behind the file icon button in the calendar toolbar. Three actions:

**Export JSON** — downloads all calendar entries and session data as a single JSON file. The filename includes the currently displayed month and year. Use this for backup or to transfer data between devices.

**Import JSON** — replaces all calendar and session data with the contents of a chosen file, then re-renders the calendar immediately. This is a full replace — it does not merge with existing entries.

**Export PDF** — generates a formatted timesheet PDF using jsPDF. The layout is a weekly grid — one table block per week — with the freelancer name, company, year, and month from Timesheet Settings in the header. Logged days are shaded grey; weekends and overflow days use a lighter salmon fill. A total row at the bottom of the document sums all hours for the month.

The PDF libraries (jsPDF and jsPDF-AutoTable) are loaded from CDN on first use and cached for the session, so the first export may take a moment longer than subsequent ones.
