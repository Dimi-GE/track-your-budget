// calculator.js — pure math, no UI
// Takes data from store, returns calculated values

function calculateFlow(funds, income, savings, expenses) {
    return funds + income - savings - expenses;
}

// Recalculates aggregate totals from a list of entries
function recalculateTotals(entries) {
    const t = { income: 0, savings: 0, savingsFromFlow: 0, expenses: 0, flow: 0, entries };
    entries.forEach(({ type, category, amount }) => {
        if (type === 'income') t.income += amount;
        else if (type === 'savings') {
            t.savings += amount;
            if (category === 'flow') t.savingsFromFlow += amount;
        }
        else if (type === 'expenses') t.expenses += amount;
    });
    t.flow = t.income - t.savingsFromFlow - t.expenses;
    return t;
}
