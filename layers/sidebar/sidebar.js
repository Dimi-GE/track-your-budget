const NAV_ITEMS = [
    { icon: 'ti-home',              label: 'Home',         view: 'home' },
    { icon: 'ti-layout-dashboard', label: 'Dashboard',    view: 'dashboard' },
    { icon: 'ti-receipt',           label: 'Transactions', view: null },
    { icon: 'ti-chart-bar',         label: 'Analytics',   view: 'behavior-analytics' },
    { icon: 'ti-settings',          label: 'Settings',    view: null },
];

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.querySelector('.window-wrapper');

    const activeView = sessionStorage.getItem('activeView') || 'home';

    sidebar.innerHTML = `
        <nav class="sidebar-nav">
            ${NAV_ITEMS.map((item, i) => `
                <div class="nav-item${item.view === activeView ? ' active' : ''}${!item.view ? ' nav-item--disabled' : ''}" data-nav-index="${i}">
                    <i class="ti ${item.icon}"></i>
                    <span class="nav-label">${item.label}</span>
                </div>
            `).join('')}
        </nav>
        <button class="sidebar-toggle" id="sidebar-toggle" title="Toggle sidebar">
            <i class="ti ti-chevron-left"></i>
        </button>
    `;

    sidebar.querySelectorAll('.nav-item[data-nav-index]').forEach(el => {
        el.addEventListener('click', () => {
            const item = NAV_ITEMS[+el.dataset.navIndex];
            if (!item.view) return;
            sidebar.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            el.classList.add('active');
            loadView(item.view);
        });
    });

    const toggle = document.getElementById('sidebar-toggle');

    // Manual toggle
    toggle.addEventListener('click', () => {
        wrapper.classList.toggle('sidebar-collapsed');
    });

    // Auto-collapse on narrow screens
    const mq = window.matchMedia('(max-width: 768px)');
    mq.addEventListener('change', e => {
        wrapper.classList.toggle('sidebar-collapsed', e.matches);
    });
    if (mq.matches) wrapper.classList.add('sidebar-collapsed');
}

initSidebar();
