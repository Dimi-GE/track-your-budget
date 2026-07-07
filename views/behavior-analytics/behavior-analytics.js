function initBehaviorAnalytics() {
    const syncBtn = document.getElementById('sync-toggle');
    let syncEnabled = true;

    window.onHeatmapPeriodChange = function(source, year, quarter) {
        if (!syncEnabled) return;
        if (source === 'spending' && typeof setEarningsPeriod === 'function') {
            setEarningsPeriod(year, quarter);
        } else if (source === 'earnings' && typeof setSpendingPeriod === 'function') {
            setSpendingPeriod(year, quarter);
        }
    };

    syncBtn.addEventListener('click', () => {
        syncEnabled = !syncEnabled;
        syncBtn.classList.toggle('active', syncEnabled);
    });

    function loadComponent(slot, name) {
        const base = `views/behavior-analytics/${name}/${name}`;
        return fetch(`${base}.html`).then(r => r.text()).then(html => {
            slot.innerHTML = html;
            loadCSS(`${base}.css`);
            return loadScript(`${base}.js`);
        });
    }

    // Preload shared deps (Chart.js + the forecast engine used by both Trends and
    // Forecasting) before any component inits, so component-level loadScript calls
    // dedupe against an already-executed script rather than racing each other.
    Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'),
        loadScript('engine/forecast.js'),
    ]).then(() => {
        Promise.all([
            loadComponent(document.getElementById('spending-heatmap-slot'), 'spending-heatmap'),
            loadComponent(document.getElementById('earnings-heatmap-slot'), 'earnings-heatmap'),
            loadComponent(document.getElementById('trends-component-slot'), 'trends'),
            loadComponent(document.getElementById('forecasting-component-slot'), 'forecasting'),
        ]).then(() => {
            initSpendingHeatmap();
            initEarningsHeatmap();
            initTrends();
            initForecasting();
            window.viewReady?.();
        });
    });
}
