function initTrends() {
    const STORAGE_KEY  = 'dashboard_committed';
    const SETTINGS_KEY = 'trends_settings';
    const MONTH_NAMES  = ['January','February','March','April','May','June',
                          'July','August','September','October','November','December'];

    let chart = null;
    const canvas      = document.getElementById('trends-chart');
    const ctx         = canvas.getContext('2d');
    const monthSelect = document.getElementById('trends-month-select');
    const yearSelect  = document.getElementById('trends-year-select');
    const curSym      = regionalCurrencySymbol();

    MONTH_NAMES.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = name;
        monthSelect.appendChild(opt);
    });

    const now = new Date();
    for (let y = now.getFullYear() - 4; y <= now.getFullYear(); y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    }

    function getEntries() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw).entries || []) : [];
        } catch (_) { return []; }
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return null;
    }

    function saveSettings(month, year) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ month, year }));
    }

    // Default to the earliest month that has data — where meaningful tracking
    // began. Mirrors Forecasting's default, but Trends keeps its own setting.
    function defaultStart(entries) {
        const keys = entries
            .filter(e => e.date)
            .map(e => e.date.slice(0, 7))
            .sort();
        if (keys.length > 0) {
            const parts = keys[0].split('-').map(Number);
            return { month: parts[1] - 1, year: parts[0] };
        }
        return { month: now.getMonth(), year: now.getFullYear() };
    }

    // Trends is the historical (actuals-only) twin of Forecasting: it shares the
    // same 12-month budget-year engine (buildForecast) so the two can never
    // drift, but drops the projected future months to null — the lines simply
    // end at the current month instead of extending with a projection.
    function aggregate(month, year) {
        const { months } = buildForecast(getEntries(), month, year);
        const labels = [], income = [], expenses = [], savings = [], cashflow = [];
        months.forEach(m => {
            const actual = m.status !== 'projected';
            labels.push(m.label);
            income.push(actual   ? m.income   : null);
            expenses.push(actual ? m.expenses : null);
            savings.push(actual  ? m.savings  : null);
            cashflow.push(actual ? m.cashflow : null);
        });
        return { labels, income, expenses, savings, cashflow };
    }

    function makeDataset(label, values, color, dashed) {
        return {
            label,
            data: values,
            borderColor: color,
            backgroundColor: color + '18',
            borderWidth: dashed ? 1.5 : 2,
            borderDash: dashed ? [5, 4] : [],
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: false,
        };
    }

    function render() {
        const month = parseInt(monthSelect.value);
        const year  = parseInt(yearSelect.value);
        saveSettings(month, year);

        const agg = aggregate(month, year);
        const datasets = [
            makeDataset('Income',    agg.income,   '#7bc67e', false),
            makeDataset('Expenses',  agg.expenses, '#e05c5c', false),
            makeDataset('Savings',   agg.savings,  '#4a9eff', false),
            makeDataset('Cash Flow', agg.cashflow, '#f5a80055', true),
        ];

        if (chart) {
            chart.data.labels   = agg.labels;
            chart.data.datasets = datasets;
            chart.update();
            return;
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: { labels: agg.labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#888',
                            boxWidth: 12,
                            padding: 16,
                            font: { size: 11 },
                        },
                    },
                    tooltip: {
                        backgroundColor: '#13131a',
                        borderColor: '#1e1e2e',
                        borderWidth: 1,
                        titleColor: '#ffffff',
                        bodyColor: '#888888',
                        callbacks: {
                            label: c => ` ${c.dataset.label}: ${curSym}${c.parsed.y.toFixed(2)}`,
                        },
                    },
                },
                scales: {
                    x: {
                        grid:  { color: '#1e1e2e' },
                        ticks: { color: '#888', font: { size: 10 } },
                    },
                    y: {
                        grid:  { color: '#1e1e2e' },
                        ticks: {
                            color: '#888',
                            font: { size: 10 },
                            callback: v => curSym + v.toLocaleString(),
                        },
                        beginAtZero: true,
                    },
                },
            },
        });
    }

    monthSelect.addEventListener('change', render);
    yearSelect.addEventListener('change', render);

    // Trends shares Forecasting's engine, so it needs forecast.js too. loadScript
    // dedupes by src, so both components requesting it is harmless.
    Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'),
        loadScript('engine/forecast.js'),
    ]).then(() => {
        const settings = loadSettings() || defaultStart(getEntries());
        monthSelect.value = settings.month;
        yearSelect.value  = settings.year;
        render();
    });
}
