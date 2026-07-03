let homeTrendChart = null;
let homeDonutChart = null;

function initHome() {
    const STORAGE_KEY = 'dashboard_committed';

    const EXPENSE_CATS = [
        { key: 'groceries',     label: 'Groceries',     color: '#4caf7d' },
        { key: 'deliveries',    label: 'Deliveries',    color: '#f5a800' },
        { key: 'pets',          label: 'Pets',          color: '#e05c5c' },
        { key: 'medical',       label: 'Medical',       color: '#e57373' },
        { key: 'media',         label: 'Media',         color: '#ba68c8' },
        { key: 'subscriptions', label: 'Subscriptions', color: '#4fc3f7' },
        { key: 'rent',          label: 'Rent',          color: '#ff8a65' },
        { key: 'online',        label: 'Online',        color: '#a1887f' },
        { key: 'shopping',      label: 'Shopping',      color: '#f06292' },
        { key: 'gifts',         label: 'Gifts',         color: '#ce93d8' },
        { key: 'transport',     label: 'Transport',     color: '#80cbc4' },
        { key: 'personal',      label: 'Personal',      color: '#fff176' },
    ];

    // --- Load committed entries ---
    let entries = [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) entries = JSON.parse(raw).entries || [];
    } catch (e) {}

    // --- All-time total saved (deposits minus reserve withdrawals) ---
    let totalSaved = 0;
    entries.forEach(e => {
        if (e.type === 'savings') totalSaved += e.amount;
        else if (isSavingsWithdrawal(e)) totalSaved -= e.amount;
    });

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
                income += e.amount;
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
    const monthEntries  = ref.entries;
    const monthIncome   = ref.income;
    const monthExpenses = ref.expenses;
    const monthSavings  = ref.savings;
    const monthSavingsFlow = ref.savingsFlow;
    const monthRent     = ref.rent;
    const monthCashFlow = monthIncome - monthSavingsFlow - monthExpenses;

    // --- KPI Cards ---
    document.getElementById('home-total-saved').textContent      = totalSaved.toFixed(2);
    document.getElementById('home-monthly-income').textContent   = monthIncome.toFixed(2);
    document.getElementById('home-monthly-expenses').textContent = monthExpenses.toFixed(2);

    const cfEl = document.getElementById('home-cash-flow');
    cfEl.textContent = monthCashFlow.toFixed(2);
    cfEl.classList.toggle('home-card__value--negative', monthCashFlow < 0);

    // --- Recent Transactions ---
    const txList = document.getElementById('home-tx-list');
    const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

    if (recent.length === 0) {
        txList.innerHTML = '<div class="home-no-data">No transactions yet</div>';
    } else {
        txList.innerHTML = recent.map(e => {
            const sign  = e.type === 'income' ? '+' : e.type === 'savings' ? '~' : '-';
            const color = getCategoryColor(e.category);
            return `<div class="home-tx-item">
                <span class="home-tx-date">${e.date}</span>
                <span class="home-tx-cat" style="color:${color};">${e.categoryLabel}</span>
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

    setBar('home-savings-rate-fill',  'home-savings-rate-val',  monthIncome > 0 ? monthSavings / monthIncome  : 0, 0.20, true);
    setBar('home-expense-ratio-fill', 'home-expense-ratio-val', monthIncome > 0 ? monthExpenses / monthIncome : 0, 0.80, false);
    setBar('home-rent-burden-fill',   'home-rent-burden-val',   monthIncome > 0 ? monthRent / monthIncome     : 0, 0.30, false);

    // --- Charts ---
    if (homeTrendChart) { homeTrendChart.destroy(); homeTrendChart = null; }
    if (homeDonutChart) { homeDonutChart.destroy(); homeDonutChart = null; }

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js')
        .then(() => {
            homeTrendChart = renderHomeTrend(entries);
            homeDonutChart = renderHomeDonut(monthEntries, EXPENSE_CATS);
            window.viewReady?.();
        });
}

function renderHomeTrend(entries) {
    const canvas = document.getElementById('home-trend-chart');
    if (!canvas) return null;

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({ key, label: d.toLocaleDateString('en-US', { month: 'short' }), expenses: 0 });
    }
    entries.forEach(e => {
        if (e.type !== 'expenses' || isSavingsWithdrawal(e) || !e.date) return;
        const m = months.find(m => m.key === e.date.slice(0, 7));
        if (m) m.expenses += e.amount;
    });

    return new Chart(canvas, {
        type: 'line',
        data: {
            labels: months.map(m => m.label),
            datasets: [{
                data: months.map(m => m.expenses),
                borderColor: '#e05c5c',
                backgroundColor: 'rgba(224, 92, 92, 0.08)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#e05c5c',
                fill: true,
                tension: 0.35,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: item => ` ${item.parsed.y.toFixed(2)}` }
                }
            },
            scales: {
                x: {
                    ticks:  { color: '#888', font: { size: 11 } },
                    grid:   { color: '#1e1e2e' },
                    border: { color: '#1e1e2e' },
                },
                y: {
                    ticks:  { color: '#888', font: { size: 11 }, callback: v => v.toFixed(0) },
                    grid:   { color: '#1e1e2e' },
                    border: { color: '#1e1e2e' },
                }
            }
        }
    });
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
