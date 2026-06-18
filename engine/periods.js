// periods.js — period boundary logic
// Determines which user-selected date range (period) a transaction belongs to

// Default period: the current calendar month, as 'YYYY-MM-DD' boundary strings
function getDefaultPeriod() {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toISODate(start), end: toISODate(end) };
}

function toISODate(date) {
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Returns true if the entry's date falls within the period (inclusive on both ends)
function isEntryInPeriod(entry, period) {
    return entry.date >= period.start && entry.date <= period.end;
}

// Filters entries to those falling within the period (inclusive on both ends)
function filterEntriesByPeriod(entries, period) {
    return entries.filter(e => isEntryInPeriod(e, period));
}
