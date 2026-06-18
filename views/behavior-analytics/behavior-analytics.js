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

    Promise.all([
        loadComponent(document.getElementById('spending-heatmap-slot'), 'spending-heatmap'),
        loadComponent(document.getElementById('earnings-heatmap-slot'), 'earnings-heatmap'),
    ]).then(() => {
        initSpendingHeatmap();
        initEarningsHeatmap();
    });
}
