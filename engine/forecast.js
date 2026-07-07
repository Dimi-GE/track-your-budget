// forecast.js — pure forecasting logic, no UI
// Returns 12-month projection from a chosen budget year start, using
// a linearly-weighted average of historical months (newest = highest weight).

function buildForecast(entries, startMonth, startYear) {
    const TYPES = ['income', 'expenses', 'savings'];

    const byMonth = {};
    entries.forEach(e => {
        if (!e.date || !e.type || !TYPES.includes(e.type)) return;
        const key = e.date.slice(0, 7);
        if (!byMonth[key]) byMonth[key] = { income: 0, expenses: 0, savings: 0, savingsFlow: 0 };
        // A "Savings" expense is a reserve withdrawal: net it out of savings
        // rather than counting it as an expense.
        if (isSavingsWithdrawal(e)) byMonth[key].savings -= e.amount;
        // Opening balance is not earned income — keep it out of the income
        // series so it never inflates the weighted-average projection.
        else if (isOpeningBalance(e)) { /* excluded from all forecast series */ }
        else {
            byMonth[key][e.type] += e.amount;
            // Only Flow-category savings comes out of spendable cash, so only it
            // reduces cash flow. Other/withdrawal savings leave cash flow alone.
            if (e.type === 'savings' && e.category === 'flow') byMonth[key].savingsFlow += e.amount;
        }
    });

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const historicalKeys = Object.keys(byMonth)
        .filter(k => k <= currentKey)
        .sort();

    // Cash flow only subtracts Flow-category savings, so savingsFlow is
    // projected alongside the three entry types.
    const AVG_KEYS = ['income', 'expenses', 'savings', 'savingsFlow'];
    const weightedAvg = { income: 0, expenses: 0, savings: 0, savingsFlow: 0 };
    if (historicalKeys.length > 0) {
        let totalWeight = 0;
        historicalKeys.forEach((key, i) => {
            const w = i + 1;
            totalWeight += w;
            AVG_KEYS.forEach(t => { weightedAvg[t] += (byMonth[key][t] || 0) * w; });
        });
        AVG_KEYS.forEach(t => { weightedAvg[t] /= totalWeight; });
    }

    const months = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(startYear, startMonth + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const actual = byMonth[key];

        let status, income, expenses, savings, savingsFlow;
        if (key < currentKey) {
            status      = 'actual';
            income      = actual ? actual.income      : 0;
            expenses    = actual ? actual.expenses    : 0;
            savings     = actual ? actual.savings     : 0;
            savingsFlow = actual ? actual.savingsFlow : 0;
        } else if (key === currentKey) {
            status      = 'partial';
            income      = actual ? actual.income      : 0;
            expenses    = actual ? actual.expenses    : 0;
            savings     = actual ? actual.savings     : 0;
            savingsFlow = actual ? actual.savingsFlow : 0;
        } else {
            status      = 'projected';
            income      = weightedAvg.income;
            expenses    = weightedAvg.expenses;
            savings     = weightedAvg.savings;
            savingsFlow = weightedAvg.savingsFlow;
        }

        months.push({
            key, label, status,
            income, expenses, savings,
            // `savings` is net reserve movement (display line); cash flow only
            // nets out Flow-category savings, matching calculator.js / Overview.
            cashflow: income - expenses - savingsFlow,
        });
    }

    function sumMonths(filter) {
        return months.filter(filter).reduce(
            (acc, m) => ({
                income:   acc.income   + m.income,
                expenses: acc.expenses + m.expenses,
                savings:  acc.savings  + m.savings,
                cashflow: acc.cashflow + m.cashflow,
            }),
            { income: 0, expenses: 0, savings: 0, cashflow: 0 }
        );
    }

    const actuals            = sumMonths(m => m.status !== 'projected');
    const projectedRemaining = sumMonths(m => m.status === 'projected');
    const totals             = sumMonths(() => true);

    return { months, actuals, projectedRemaining, totals, dataMonths: historicalKeys.length };
}
