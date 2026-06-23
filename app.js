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
    // Fallback
    other:          '#90a4ae',
};

function getCategoryColor(category) {
    return TX_CATEGORY_COLORS[category] || TX_CATEGORY_COLORS.other;
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

    contentContainer.innerHTML = '<div style="height:calc(100dvh - var(--header-height) - 40px);display:flex;align-items:center;justify-content:center;"><div id="loader-ring" style="width:28px;height:28px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;"></div></div>';

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

document.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem('activeView');
    loadView(saved || 'home');
});
