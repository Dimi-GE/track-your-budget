function initTrends() {
    const STORAGE_KEY = 'dashboard_committed';
    let granularity = 'month';
    let chart = null;

    const canvas = document.getElementById('trends-chart');
    const ctx    = canvas.getContext('2d');
    const btns   = document.querySelectorAll('.granularity-btn');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.g === granularity) return;
            granularity = btn.dataset.g;
            btns.forEach(b => b.classList.toggle('active', b.dataset.g === granularity));
            render();
        });
    });

    function getEntries() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw).entries || []) : [];
        } catch (_) { return []; }
    }

    function weekStart(date) {
        const d = new Date(date);
        d.setDate(d.getDate() - (d.getDay() + 6) % 7);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function buildPeriods() {
        const now = new Date();

        if (granularity === 'month') {
            return Array.from({ length: 12 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
                return {
                    label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    start: new Date(d.getFullYear(), d.getMonth(), 1),
                    end:   new Date(d.getFullYear(), d.getMonth() + 1, 0),
                };
            });
        }

        if (granularity === 'quarter') {
            const cq = Math.floor(now.getMonth() / 3);
            return Array.from({ length: 8 }, (_, i) => {
                let q = cq - (7 - i);
                let y = now.getFullYear();
                while (q < 0) { q += 4; y--; }
                return {
                    label: `Q${q + 1} '${String(y).slice(2)}`,
                    start: new Date(y, q * 3, 1),
                    end:   new Date(y, q * 3 + 3, 0),
                };
            });
        }

        // week
        const ws = weekStart(now);
        return Array.from({ length: 16 }, (_, i) => {
            const start = new Date(ws);
            start.setDate(start.getDate() - (15 - i) * 7);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return {
                label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                start,
                end,
            };
        });
    }

    function aggregate() {
        const entries = getEntries();
        const periods = buildPeriods();
        const income = [], expenses = [], savings = [], cashflow = [];

        periods.forEach(p => {
            const inRange = entries.filter(e => {
                if (!e.date) return false;
                const d = new Date(e.date + 'T00:00:00');
                return d >= p.start && d <= p.end;
            });
            const inc = inRange.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
            const exp = inRange.filter(e => e.type === 'expenses').reduce((s, e) => s + e.amount, 0);
            const sav = inRange.filter(e => e.type === 'savings').reduce((s, e) => s + e.amount, 0);
            income.push(inc);
            expenses.push(exp);
            savings.push(sav);
            cashflow.push(inc - exp - sav);
        });

        return { labels: periods.map(p => p.label), income, expenses, savings, cashflow };
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
        const agg = aggregate();
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
                            label: c => ` ${c.dataset.label}: $${c.parsed.y.toFixed(2)}`,
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
                            callback: v => '$' + v.toLocaleString(),
                        },
                        beginAtZero: true,
                    },
                },
            },
        });
    }

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js')
        .then(render);
}
