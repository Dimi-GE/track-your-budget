let homeDonutChart = null;

function initHome() {
    const STORAGE_KEY = 'dashboard_committed';

    // Shared category definition from app.js (loaded globally). The donut only
    // needs key/label/colour; the icon field is simply unused here.
    const EXPENSE_CATS = EXPENSE_CATEGORIES;

    // --- Load committed entries ---
    let entries = [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) entries = JSON.parse(raw).entries || [];
    } catch (e) {}

    // --- All-time total saved (deposits minus reserve withdrawals) ---
    // Approximate, converted into the regional currency when FX rates are
    // available (savings may sit in foreign currencies via Savings → Other).
    let totalSaved = 0;
    if (window.FxRates) {
        totalSaved = FxRates.netSavingsRegional(entries);
    } else {
        entries.forEach(e => {
            if (e.type === 'savings') totalSaved += e.amount;
            else if (isSavingsWithdrawal(e)) totalSaved -= e.amount;
        });
    }

    // --- Resolve reference month ---
    // Use the current month if it has income; otherwise fall back to the most
    // recent past month that does. Health ratios require income to be meaningful.
    function getMonthBounds(year, month) {
        const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const last  = new Date(year, month + 1, 0).getDate();
        const end   = `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
        return { start, end };
    }

    function sumMonth(start, end) {
        const me = entries.filter(e => e.date >= start && e.date <= end);
        let income = 0, expenses = 0, savings = 0, savingsFlow = 0, rent = 0;
        me.forEach(e => {
            if (e.type === 'income') {
                if (!isOpeningBalance(e)) income += e.amount;   // opening balance is not earned income
            } else if (isSavingsWithdrawal(e)) {
                savings -= e.amount;              // reserve drawdown, not an expense
            } else if (e.type === 'expenses') {
                expenses += e.amount;
                if (e.category === 'rent') rent += e.amount;
            } else if (e.type === 'savings') {
                savings += e.amount;
                if (e.category === 'flow') savingsFlow += e.amount;
            }
        });
        return { entries: me, income, expenses, savings, savingsFlow, rent };
    }

    const now = new Date();
    let refYear = now.getFullYear();
    let refMonth = now.getMonth();
    let ref = sumMonth(...Object.values(getMonthBounds(refYear, refMonth)));

    if (ref.income === 0) {
        // Walk back up to 12 months to find one with income
        for (let i = 1; i <= 12; i++) {
            let m = now.getMonth() - i;
            let y = now.getFullYear() + Math.floor(m / 12);
            m = ((m % 12) + 12) % 12;
            const candidate = sumMonth(...Object.values(getMonthBounds(y, m)));
            if (candidate.income > 0) {
                ref = candidate;
                refYear = y;
                refMonth = m;
                break;
            }
        }
    }

    const { start: monthStart, end: monthEnd } = getMonthBounds(refYear, refMonth);
    const periodLabel = new Date(refYear, refMonth, 1)
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const periodEl = document.getElementById('home-health-period');
    if (periodEl) periodEl.textContent = periodLabel;
    const monthEntries     = ref.entries;
    const monthIncome      = ref.income;
    const monthExpenses    = ref.expenses;
    // Savings Rate measures income-funded saving, so it uses Flow-category
    // savings only — not net reserve movement. Otherwise a Savings → Other
    // deposit (external money) could push the rate over 100%, and a reserve
    // withdrawal could drive it negative.
    const monthSavingsFlow = ref.savingsFlow;
    const monthRent        = ref.rent;

    // All-time spendable balance: opening balance + earned income − Flow-category
    // savings − expenses. Uses the canonical Flow formula from calculator.js
    // (loaded globally in index.html) so it can never drift from the Overview.
    // `potential` is the partner's growing net pool (Potential type), kept out of
    // Flow and shown only as a sub-value here. See isPotential() / calculator.js.
    const totals    = recalculateTotals(entries);
    const available = totals.flow;
    const potential = totals.potential;

    // --- KPI Cards ---
    const totalSavedEl = document.getElementById('home-total-saved');
    totalSavedEl.textContent = '≈ ' + totalSaved.toFixed(2);
    totalSavedEl.title = 'Approximate total in ' + getRegionalCurrency();
    document.getElementById('home-monthly-income').textContent   = monthIncome.toFixed(2);
    document.getElementById('home-monthly-expenses').textContent = monthExpenses.toFixed(2);

    const availEl = document.getElementById('home-available');
    availEl.textContent = available.toFixed(2);
    availEl.classList.toggle('home-card__value--negative', available < 0);

    // Partner "Potential" sub-value. Only shown once any Potential entry exists,
    // so the solo-user layout is unchanged. "together" is the combined pool.
    const potentialBlock = document.getElementById('home-potential-block');
    const hasPotential = entries.some(isPotential);
    potentialBlock.hidden = !hasPotential;
    if (hasPotential) {
        const together = available + potential;
        const potEl = document.getElementById('home-potential');
        potEl.textContent = (potential >= 0 ? '+ ' : '− ') + Math.abs(potential).toFixed(2);
        potEl.classList.toggle('home-card__sub--negative', potential < 0);
        const togEl = document.getElementById('home-together');
        togEl.textContent = together.toFixed(2);
        togEl.classList.toggle('home-card__together--negative', together < 0);
    }

    // --- Recent Transactions ---
    const txList = document.getElementById('home-tx-list');
    // Newest first. Entries are day-level only, so ties on date fall back to
    // insertion order reversed (the most recently committed entry wins), which
    // is what "most recent" means when several share a date.
    const recent = entries
        .map((e, i) => [e, i])
        .sort((a, b) => b[0].date.localeCompare(a[0].date) || b[1] - a[1])
        .slice(0, 5)
        .map(([e]) => e);

    if (recent.length === 0) {
        txList.innerHTML = '<div class="home-no-data">No transactions yet</div>';
    } else {
        txList.innerHTML = recent.map(e => {
            // Potential rows carry their own direction in the category, so sign by
            // that; income/savings are inflows, everything else is an outflow.
            let sign;
            if (isPotential(e)) sign = e.category === 'expenses' ? '-' : '+';
            else sign = e.type === 'income' ? '+' : e.type === 'savings' ? '~' : '-';
            return `<div class="home-tx-item">
                <span class="home-tx-date">${e.date}</span>
                <span class="home-tx-cat">${e.categoryLabel}${isPotential(e) ? ' <span class="home-tx-tag">potential</span>' : ''}</span>
                <span class="home-tx-amount home-tx-amount--${e.type}">${sign}${e.amount.toFixed(2)}</span>
            </div>`;
        }).join('');
    }

    // --- Financial Health bars ---
    function setBar(fillId, valId, ratio, threshold, higherIsGood) {
        const fillEl = document.getElementById(fillId);
        const valEl  = document.getElementById(valId);
        if (!fillEl || !valEl) return;

        if (monthIncome === 0) {
            valEl.textContent    = '--';
            fillEl.style.width   = '0%';
            fillEl.dataset.status = '';
            return;
        }

        valEl.textContent  = (ratio * 100).toFixed(1) + '%';
        fillEl.style.width = Math.min(ratio / threshold, 1) * 100 + '%';

        let status;
        if (higherIsGood) {
            status = ratio >= threshold ? 'good' : ratio >= threshold * 0.5 ? 'warn' : 'bad';
        } else {
            status = ratio <= threshold * 0.85 ? 'good' : ratio <= threshold ? 'warn' : 'bad';
        }
        fillEl.dataset.status = status;
    }

    setBar('home-savings-rate-fill',  'home-savings-rate-val',  monthIncome > 0 ? monthSavingsFlow / monthIncome : 0, 0.20, true);
    setBar('home-expense-ratio-fill', 'home-expense-ratio-val', monthIncome > 0 ? monthExpenses / monthIncome : 0, 0.80, false);
    setBar('home-rent-burden-fill',   'home-rent-burden-val',   monthIncome > 0 ? monthRent / monthIncome     : 0, 0.30, false);

    // --- Savings Holdings sheet ---
    // Gross savings deposits grouped by currency + holding type (visual only,
    // no conversion). Withdrawals (reserve drawdowns) are not netted here.
    renderHomeHoldings(entries);

    // --- Charts ---
    if (homeDonutChart) { homeDonutChart.destroy(); homeDonutChart = null; }

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js')
        .then(() => {
            homeDonutChart = renderHomeDonut(monthEntries, EXPENSE_CATS);
            window.viewReady?.();
        });
}

function renderHomeHoldings(entries) {
    const el = document.getElementById('home-holdings');
    if (!el) return;

    const regional = getRegionalCurrency();
    const groups = {};
    entries.forEach(e => {
        if (e.type !== 'savings') return;
        const currency = e.currency || regional;
        const holding  = e.holding || 'other';
        const key = `${currency}|${holding}`;
        if (!groups[key]) groups[key] = { currency, holding, amount: 0 };
        groups[key].amount += e.amount;
    });

    const rows = Object.values(groups).sort((a, b) =>
        a.currency.localeCompare(b.currency) || b.amount - a.amount
    );

    if (rows.length === 0) {
        el.innerHTML = '<div class="home-no-data">No savings recorded yet</div>';
        return;
    }

    el.innerHTML = `
        <table class="holdings-table">
            <thead>
                <tr>
                    <th class="holdings-amount">Amount</th>
                    <th>Currency</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => {
                    const meta = getCurrencyMeta(r.currency);
                    const sym  = meta.symbol ? `${meta.symbol} ` : '';
                    return `<tr>
                        <td class="holdings-amount">${sym}${r.amount.toFixed(2)}</td>
                        <td><span class="holdings-currency">${r.currency}</span></td>
                        <td class="holdings-type">${getHoldingLabel(r.holding)}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

function renderHomeDonut(monthEntries, EXPENSE_CATS) {
    const canvas = document.getElementById('home-donut-chart');
    if (!canvas) return null;

    const totals = {};
    monthEntries.filter(e => e.type === 'expenses' && !isSavingsWithdrawal(e)).forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

    const active = EXPENSE_CATS.filter(c => totals[c.key] > 0);
    if (active.length === 0) {
        canvas.parentElement.innerHTML = '<div class="home-no-data">No expenses this month</div>';
        return null;
    }

    return new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: active.map(c => c.label),
            datasets: [{
                data: active.map(c => totals[c.key]),
                backgroundColor: active.map(c => c.color + '99'),
                borderColor:     active.map(c => c.color),
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: item => ` ${item.label}: ${item.parsed.toFixed(2)}` }
                }
            }
        }
    });
}
