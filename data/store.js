// store.js — single source of truth
// Holds all financial data in memory for the current session

const store = {
    funds: 0,
    income: 0,
    savings: 0,
    expenses: 0,
    periods: [],      // income events that define period boundaries
    dailyEntries: [], // { date, amount } per day
};
