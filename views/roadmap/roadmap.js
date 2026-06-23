function initRoadmap() {
    const tabs        = document.querySelectorAll('.roadmap-tab');
    const sections    = document.querySelectorAll('.roadmap-section');
    const changelogEl = document.getElementById('tab-changelog');
    const roadmapEl   = document.getElementById('tab-roadmap');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            sections.forEach(s => {
                s.classList.toggle('roadmap-section--hidden', s.id !== `tab-${target}`);
            });
        });
    });

    loadScript('engine/markdown.js')
        .then(() => loadMarkdownEngine())
        .then(() => Promise.all([
            renderMarkdownAsCards('content/changelog.md', changelogEl, { layout: 'timeline' }),
            renderMarkdownAsCards('content/roadmap.md',   roadmapEl,   { layout: 'columns'  }),
        ]))
        .then(() => window.viewReady?.());
}
