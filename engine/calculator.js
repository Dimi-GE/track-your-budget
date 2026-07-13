// calculator.js — pure math, no UI
// Takes data from store, returns calculated values

function calculateFlow(funds, income, savings, expenses) {
    return funds + income - savings - expenses;
}

// Recalculates aggregate totals from a list of entries.
// A "Savings" expense (category === 'savings') is a withdrawal from the
// reserve: it reduces the Savings balance and is NOT counted as an expense,
// so it never touches Flow. See isSavingsWithdrawal() in app.js.
// Starting Funds (category === 'starting_funds') is the opening balance: it is
// kept out of `income` (so it never spikes income analytics) and accumulated in
// a separate `funds` bucket that still feeds Flow. See isOpeningBalance().
// Potential (type === 'potential') is a partner's money stream reconciled
// monthly rather than tracked daily. It is intentionally NOT part of Flow or any
// controlled total — it accumulates in its own `potential` bucket (net of its
// 'income' and 'expenses' categories) and surfaces only as the Home "Available"
// sub-value. Every controlled analytic filters on the three known types, so a
// 'potential' entry is excluded from them automatically.
function recalculateTotals(entries) {
    const t = {
        funds: 0, income: 0, savings: 0, savingsFromFlow: 0, savingsWithdrawn: 0,
        expenses: 0, flow: 0,
        potentialIncome: 0, potentialExpenses: 0, potential: 0,
        entries,
    };
    entries.forEach((entry) => {
        const { type, category, amount } = entry;
        if (type === 'income') {
            if (isOpeningBalance(entry)) t.funds += amount;   // opening balance, not earned income
            else t.income += amount;
        }
        else if (type === 'savings') {
            t.savings += amount;
            if (category === 'flow') t.savingsFromFlow += amount;
        }
        else if (type === 'expenses') {
            if (category === 'savings') t.savingsWithdrawn += amount;
            else t.expenses += amount;
        }
        else if (type === 'potential') {
            if (category === 'expenses') t.potentialExpenses += amount;
            else t.potentialIncome += amount;             // 'income' is the default direction
        }
    });
    t.savings -= t.savingsWithdrawn;              // net reserve balance
    t.flow = t.funds + t.income - t.savingsFromFlow - t.expenses;
    t.potential = t.potentialIncome - t.potentialExpenses;   // growing partner pool, kept out of flow
    return t;
}
