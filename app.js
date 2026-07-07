const TX_CATEGORY_COLORS = {
    // Income
    starting_funds: '#ffd54f',
    salary:         '#66bb6a',
    // Savings
    flow:           '#42a5f5',
    // Expenses — mirrors EXPENSE_CATEGORIES in expenses-chart.js
    groceries:      '#4caf7d',
    deliveries:     '#f5a800',
    pets:           '#e05c5c',
    medical:        '#e57373',
    media:          '#ba68c8',
    subscriptions:  '#4fc3f7',
    rent:           '#ff8a65',
    online:         '#a1887f',
    shopping:       '#f06292',
    gifts:          '#ce93d8',
    transport:      '#80cbc4',
    personal:       '#fff176',
    // Expenses — reserve drawdown (Expenses type, "Savings" category)
    savings:        '#5c6bc0',
    // Fallback
    other:          '#90a4ae',
};

function getCategoryColor(category) {
    return TX_CATEGORY_COLORS[category] || TX_CATEGORY_COLORS.other;
}

// A "Savings" expense is a withdrawal from the reserve — it nets down the
// Savings balance and is NOT consumption of income. Every aggregation of
// expenses/savings across the app routes through this so the semantics stay
// consistent. See DASHBOARD.md / HOME.md.
function isSavingsWithdrawal(entry) {
    return entry.type === 'expenses' && entry.category === 'savings';
}

// ── Currency configuration ───────────────────────────────────────────────
// The list of tracked currencies and which one is "regional" (the default
// applied to every transaction that isn't an explicit foreign holding). Kept
// separate from entries so Settings can edit it and the Gist bundle can sync
// it. Phase 1 is visual only — no conversion or cross-currency math.
const CURRENCY_CONFIG_KEY = 'currency_config';
const DEFAULT_CURRENCY_CONFIG = {
    regional: 'USD',
    list: [{ code: 'USD', symbol: '$', name: 'US Dollar' }],
};

// Where a savings balance physically sits. A visual-only grouping dimension
// for the Home savings sheet; captured on Savings entries in the Dashboard.
const HOLDING_TYPES = [
    { key: 'cash', label: 'Cash' },
    { key: 'card', label: 'Card' },
    { key: 'bank', label: 'Bank' },
    { key: 'other', label: 'Other' },
];

function getCurrencyConfig() {
    try {
        const cfg = JSON.parse(localStorage.getItem(CURRENCY_CONFIG_KEY));
        if (cfg && Array.isArray(cfg.list) && cfg.list.length && cfg.regional) return cfg;
    } catch (e) {}
    return structuredClone(DEFAULT_CURRENCY_CONFIG);
}

function saveCurrencyConfig(cfg) {
    localStorage.setItem(CURRENCY_CONFIG_KEY, JSON.stringify(cfg));
}

function getRegionalCurrency() {
    return getCurrencyConfig().regional;
}

function getCurrencyMeta(code) {
    return getCurrencyConfig().list.find(c => c.code === code)
        || { code: code || '', symbol: '', name: code || '' };
}

function getHoldingLabel(key) {
    const h = HOLDING_TYPES.find(h => h.key === key);
    return h ? h.label : (key ? capitalize(key) : '—');
}

const TX_TYPE_ICONS = {
    income:   'ti-trending-up',
    savings:  'ti-coin',
    expenses: 'ti-trending-down',
};

const TX_TYPE_COLORS = {
    income:   '#4caf7d',
    savings:  '#f5a800',
    expenses: '#e05c5c',
};

const loadedViews = {};
let currentView = null;

function loadView(viewName) {
    const contentContainer = document.getElementById('content');

    if (loadedViews[viewName]) {
        contentContainer.innerHTML = loadedViews[viewName].html;
        if (loadedViews[viewName].init) {
            loadedViews[viewName].init();
        }
        currentView = viewName;
        sessionStorage.setItem('activeView', viewName);
        return;
    }

    contentContainer.innerHTML = '<div style="height:calc(100dvh - var(--header-height) - 40px);display:flex;align-items:center;justify-content:center;"><div class="loader-ring"></div></div>';

    fetch(`views/${viewName}/${viewName}.html`)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load view: ${viewName}`);
            return response.text();
        })
        .then(html => {
            loadedViews[viewName] = { html };
            return loadCSS(`views/${viewName}/${viewName}.css`).then(() => {
                contentContainer.innerHTML = html;
                return loadScript(`views/${viewName}/${viewName}.js`);
            });
        })
        .then(() => {
            const initFn = `init${capitalize(viewName)}`;
            if (typeof window[initFn] === 'function') {
                const overlay = document.createElement('div');
                overlay.className = 'view-loader-overlay';
                overlay.innerHTML = '<div class="loader-ring"></div>';
                contentContainer.appendChild(overlay);

                const t0 = performance.now();
                const safetyTimer = setTimeout(() => window.viewReady?.(), 8000);
                window.viewReady = () => {
                    clearTimeout(safetyTimer);
                    console.log(`[${viewName}] ready in ${Math.round(performance.now() - t0)}ms`);
                    if (!overlay.isConnected) return;
                    overlay.style.opacity = '0';
                    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
                    setTimeout(() => { if (overlay.isConnected) overlay.remove(); }, 350);
                    window.viewReady = null;
                };

                loadedViews[viewName].init = window[initFn];
                window[initFn]();
            }
            currentView = viewName;
            sessionStorage.setItem('activeView', viewName);
        })
        .catch(error => {
            contentContainer.innerHTML = `
                <div style="text-align:center;padding:50px;color:red;">
                    <h2>Error Loading View</h2>
                    <p>${error.message}</p>
                </div>`;
        });
}

function loadCSS(href) {
    return new Promise((resolve) => {
        if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload  = resolve;
        link.onerror = resolve;
        document.head.appendChild(link);
    });
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

function capitalize(str) {
    return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    // Pull remote backup once on open; newest copy wins before any view renders.
    if (window.GistSync?.isConnected()) {
        try { await GistSync.reconcileOnOpen(); }
        catch (e) { console.warn('[gist] reconcile skipped:', e.message); }
    }
    // Full-snapshot backup: per-session reconcile (pull or push by newest).
    if (window.GistBackup?.isConnected()) {
        try {
            const { action } = await GistBackup.reconcileOnOpen();
            if (action && action !== 'none' && action !== 'insync') {
                console.log('[gist-backup] session reconcile:', action);
            }
        } catch (e) { console.warn('[gist-backup] reconcile skipped:', e.message); }
    }
    // Refresh FX rates if stale, but never let a slow rates service block the
    // UI — cap the wait and fall back to cached rates (totals are approximate).
    if (window.FxRates) {
        const cap = new Promise(res => setTimeout(res, 2500));
        try { await Promise.race([FxRates.maybeRefresh(), cap]); }
        catch (e) { console.warn('[fx] rate refresh skipped:', e.message); }
    }
    // Views unwired from the UI (kept in code, unavailable to users).
    const DISABLED_VIEWS = ['time-tracking'];
    const saved = sessionStorage.getItem('activeView');
    loadView(saved && !DISABLED_VIEWS.includes(saved) ? saved : 'home');
});
