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

    contentContainer.innerHTML = '<div style="text-align:center;padding:50px;color:#fff;">Loading...</div>';

    fetch(`views/${viewName}/${viewName}.html`)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load view: ${viewName}`);
            return response.text();
        })
        .then(html => {
            loadedViews[viewName] = { html };
            contentContainer.innerHTML = html;
            loadCSS(`views/${viewName}/${viewName}.css`);
            return loadScript(`views/${viewName}/${viewName}.js`);
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
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
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
