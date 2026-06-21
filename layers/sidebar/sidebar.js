const NAV_ITEMS = [
    { icon: 'ti-home',              label: 'Home',          view: 'home' },
    { icon: 'ti-layout-dashboard',  label: 'Dashboard',     view: 'dashboard' },
    { icon: 'ti-receipt',           label: 'Transactions',  view: null, hidden: true },
    { icon: 'ti-chart-bar',         label: 'Analytics',     view: 'behavior-analytics' },
    { icon: 'ti-clock-hour-4',      label: 'Time',          view: 'time-tracking' },
    { icon: 'ti-map-2',             label: 'Roadmap',       view: 'roadmap' },
    { icon: 'ti-settings',          label: 'Settings',      view: 'settings' },
];

function buildNavHTML(activeView) {
    return NAV_ITEMS.map((item, i) => item.hidden ? '' : `
        <div class="nav-item${item.view === activeView ? ' active' : ''}${!item.view ? ' nav-item--disabled' : ''}" data-nav-index="${i}">
            <i class="ti ${item.icon}"></i>
            <span class="nav-label">${item.label}</span>
        </div>
    `).join('');
}

function setActiveInContainer(container, index) {
    container.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const el = container.querySelector(`[data-nav-index="${index}"]`);
    if (el) el.classList.add('active');
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.querySelector('.window-wrapper');
    const activeView = sessionStorage.getItem('activeView') || 'home';

    // ── Desktop sidebar ──
    sidebar.innerHTML = `
        <nav class="sidebar-nav">
            ${buildNavHTML(activeView)}
        </nav>
        <button class="sidebar-toggle" id="sidebar-toggle" title="Toggle sidebar">
            <i class="ti ti-chevron-left"></i>
        </button>
    `;

    sidebar.querySelectorAll('.nav-item[data-nav-index]').forEach(el => {
        el.addEventListener('click', () => {
            const item = NAV_ITEMS[+el.dataset.navIndex];
            if (!item.view) return;
            setActiveInContainer(sidebar, +el.dataset.navIndex);
            loadView(item.view);
        });
    });

    const toggle = document.getElementById('sidebar-toggle');
    toggle.addEventListener('click', () => wrapper.classList.toggle('sidebar-collapsed'));

    const mq = window.matchMedia('(max-width: 768px)');
    mq.addEventListener('change', e => wrapper.classList.toggle('sidebar-collapsed', e.matches));
    if (mq.matches) wrapper.classList.add('sidebar-collapsed');

    // ── Mobile drawer ──
    const backdrop = document.createElement('div');
    backdrop.className = 'mobile-backdrop';
    document.body.appendChild(backdrop);

    const drawer = document.createElement('nav');
    drawer.className = 'mobile-drawer';
    drawer.innerHTML = buildNavHTML(activeView);
    document.body.appendChild(drawer);

    const hamburger = document.createElement('button');
    hamburger.className = 'mobile-hamburger';
    hamburger.title = 'Menu';
    hamburger.innerHTML = '<i class="ti ti-menu-2"></i>';
    document.body.appendChild(hamburger);

    function openDrawer() {
        drawer.classList.add('open');
        backdrop.classList.add('open');
    }

    function closeDrawer() {
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
    }

    hamburger.addEventListener('click', openDrawer);
    backdrop.addEventListener('click', closeDrawer);

    drawer.querySelectorAll('.nav-item[data-nav-index]').forEach(el => {
        el.addEventListener('click', () => {
            const item = NAV_ITEMS[+el.dataset.navIndex];
            if (!item.view) return;
            setActiveInContainer(drawer, +el.dataset.navIndex);
            setActiveInContainer(sidebar, +el.dataset.navIndex);
            closeDrawer();
            loadView(item.view);
        });
    });
}

initSidebar();
