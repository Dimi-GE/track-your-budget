function initForecasting() {
    const STORAGE_KEY  = 'dashboard_committed';
    const SETTINGS_KEY = 'forecast_settings';
    const MONTH_NAMES  = ['January','February','March','April','May','June',
                          'July','August','September','October','November','December'];

    let chart = null;
    const canvasEl    = document.getElementById('forecast-chart');
    const canvasCtx   = canvasEl.getContext('2d');
    const monthSelect = document.getElementById('forecast-month-select');
    const yearSelect  = document.getElementById('forecast-year-select');
    const dataLabel   = document.getElementById('forecast-data-label');
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

    function fmt(v) {
        const abs = Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return (v < 0 ? '-' : '') + curSym + abs;
    }

    function fmtDelta(v) {
        const abs = Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return (v < 0 ? '-' : '+') + curSym + abs;
    }

    function render() {
        const month = parseInt(monthSelect.value);
        const year  = parseInt(yearSelect.value);
        saveSettings(month, year);

        const entries = getEntries();
        const { months, actuals, projectedRemaining, totals, dataMonths } = buildForecast(entries, month, year);

        dataLabel.textContent = dataMonths > 0
            ? `Based on ${dataMonths} month${dataMonths !== 1 ? 's' : ''} of data`
            : 'No data yet — add entries to generate a forecast';

        let splitIndex = -1;
        months.forEach((m, i) => { if (m.status !== 'projected') splitIndex = i; });

        function mkDataset(label, values, color) {
            return {
                label,
                data: values,
                borderColor: color,
                backgroundColor: color + '12',
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.3,
                fill: false,
                segment: {
                    borderDash: sc => sc.p0DataIndex >= splitIndex ? [5, 4] : [],
                },
                pointBackgroundColor: months.map(m => m.status === 'projected' ? 'transparent' : color),
                pointBorderColor: months.map(() => color),
                pointBorderWidth: 1.5,
            };
        }

        const labels   = months.map(m => m.label);
        const datasets = [
            mkDataset('Income',    months.map(m => m.income),   '#7bc67e'),
            mkDataset('Expenses',  months.map(m => m.expenses), '#e05c5c'),
            mkDataset('Savings',   months.map(m => m.savings),  '#4a9eff'),
            mkDataset('Cash Flow', months.map(m => m.cashflow), '#f5a800'),
        ];

        if (chart) {
            chart.data.labels   = labels;
            chart.data.datasets = datasets;
            chart.update();
        } else {
            chart = new Chart(canvasCtx, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { color: '#888', boxWidth: 12, padding: 16, font: { size: 11 } },
                        },
                        tooltip: {
                            backgroundColor: '#13131a',
                            borderColor: '#1e1e2e',
                            borderWidth: 1,
                            titleColor: '#ffffff',
                            bodyColor: '#888888',
                            callbacks: {
                                afterTitle: items => {
                                    const s = months[items[0].dataIndex].status;
                                    if (s === 'projected') return '(projected)';
                                    if (s === 'partial')   return '(month in progress)';
                                    return '';
                                },
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

        function setCard(key, actualVal, remainingVal, totalVal) {
            document.getElementById(`fc-actual-${key}`).textContent    = fmt(actualVal);
            document.getElementById(`fc-remaining-${key}`).textContent = fmtDelta(remainingVal);
            const totalEl = document.getElementById(`fc-total-${key}`);
            totalEl.textContent = fmt(totalVal);
            totalEl.className   = 'forecast-card-total' + (totalVal < 0 ? ' negative' : '');
            document.getElementById(`fc-actual-${key}`).className   =
                'forecast-card-actual'   + (actualVal < 0   ? ' negative' : '');
            document.getElementById(`fc-remaining-${key}`).className =
                'forecast-card-remaining' + (remainingVal < 0 ? ' negative' : '');
        }

        setCard('income',   actuals.income,   projectedRemaining.income,   totals.income);
        setCard('expenses', actuals.expenses, projectedRemaining.expenses, totals.expenses);
        setCard('savings',  actuals.savings,  projectedRemaining.savings,  totals.savings);
        setCard('cashflow', actuals.cashflow, projectedRemaining.cashflow, totals.cashflow);
    }

    monthSelect.addEventListener('change', render);
    yearSelect.addEventListener('change', render);

    loadScript('engine/forecast.js').then(() => {
        const entries  = getEntries();
        const settings = loadSettings() || defaultStart(entries);
        monthSelect.value = settings.month;
        yearSelect.value  = settings.year;
        render();
    });
}
