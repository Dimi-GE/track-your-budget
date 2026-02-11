// View management
const loadedViews = {}; // Cache for loaded views
let currentView = null;

// Load a view dynamically
function loadView(viewName) {
    const contentContainer = document.getElementById('content');
    
    // If view is already cached, just display it
    if (loadedViews[viewName]) {
        contentContainer.innerHTML = loadedViews[viewName].html;
        
        // Re-run the view's init function if it exists
        if (loadedViews[viewName].init) {
            loadedViews[viewName].init();
        }
        
        currentView = viewName;
        console.log(`Switched to cached view: ${viewName}`);
        return;
    }
    
    // Show loading state
    contentContainer.innerHTML = '<div style="text-align: center; padding: 50px;">Loading...</div>';
    
    // Fetch view HTML
    fetch(`views/${viewName}/${viewName}.html`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load view: ${viewName}`);
            }
            return response.text();
        })
        .then(html => {
            // Store HTML in cache
            loadedViews[viewName] = { html: html };
            
            // Inject HTML into content container
            contentContainer.innerHTML = html;
            
            // Load view-specific CSS
            loadCSS(`views/${viewName}/${viewName}.css`);
            
            // Load view-specific JS
            return loadScript(`views/${viewName}/${viewName}.js`);
        })
        .then(() => {
            // Check if view has an init function and store it
            const initFunctionName = `init${capitalize(viewName)}`;
            if (typeof window[initFunctionName] === 'function') {
                loadedViews[viewName].init = window[initFunctionName];
                window[initFunctionName]();
            }
            
            currentView = viewName;
            console.log(`Loaded view: ${viewName}`);
        })
        .catch(error => {
            console.error('Error loading view:', error);
            contentContainer.innerHTML = `
                <div style="text-align: center; padding: 50px; color: red;">
                    <h2>Error Loading View</h2>
                    <p>${error.message}</p>
                </div>
            `;
        });
}

// Dynamically load CSS file
function loadCSS(href) {
    // Check if CSS is already loaded
    if (document.querySelector(`link[href="${href}"]`)) {
        return;
    }
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

// Dynamically load JavaScript file
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Check if script is already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

// Utility: capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load default view (you can change this)
    loadView('home');
});