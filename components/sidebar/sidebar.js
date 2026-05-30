// Sidebar navigation configuration
const sidebarNavigation = [
    { label: 'Home', view: 'home' },
    { label: 'Macros', view: 'macros' },
    { label: 'Weekly', view: 'weekly' },
];

// Create footer
const footer = document.createElement('div');
footer.className = 'sidebar-footer';
footer.textContent = 'GHST Admin Panel: Version 0.0.1c';
sidebar.appendChild(footer);

// Create sidebar button
function createSidebarButton(navItem) {
    const button = document.createElement('button');
    button.className = 'sidebar-action-button';
    button.textContent = navItem.label;
    button.onclick = () => {
        loadView(navItem.view);
        setActiveButton(button);
    };
    return button;
}

// Set active button styling
function setActiveButton(activeBtn) {
    document.querySelectorAll('.sidebar-action-button').forEach(btn => {
        btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
}

// Initialize sidebar
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    
    sidebarNavigation.forEach(navItem => {
        const button = createSidebarButton(navItem);
        sidebar.appendChild(button);
        
        // Set first button as active by default
        if (navItem.view === 'home') {
            button.classList.add('active');
        }
    });
}

// Run sidebar initialization
document.addEventListener('DOMContentLoaded', initSidebar);
