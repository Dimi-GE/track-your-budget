// calculator.js — pure math, no UI
// Takes data from store, returns calculated values

function calculateFlow(funds, income, savings, expenses) {
    return funds + income - savings - expenses;
}

// Recalculates aggregate totals from a list of entries.
// A "Savings" expense (category === 'savings') is a withdrawal from the
// reserve: it reduces the Savings balance and is NOT counted as an expense,
// so it never touches Flow. See isSavingsWithdrawal() in app.js.
function recalculateTotals(entries) {
    const t = { income: 0, savings: 0, savingsFromFlow: 0, savingsWithdrawn: 0, expenses: 0, flow: 0, entries };
    entries.forEach(({ type, category, amount }) => {
        if (type === 'income') t.income += amount;
        else if (type === 'savings') {
            t.savings += amount;
            if (category === 'flow') t.savingsFromFlow += amount;
        }
        else if (type === 'expenses') {
            if (category === 'savings') t.savingsWithdrawn += amount;
            else t.expenses += amount;
        }
    });
    t.savings -= t.savingsWithdrawn;              // net reserve balance
    t.flow = t.income - t.savingsFromFlow - t.expenses;
    return t;
}
