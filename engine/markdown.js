// markdown.js — fetch, parse, and render markdown as HTML or structured cards

const MARKED_CDN = 'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js';

// Changelog entry types — single source of truth for the timeline. Each entry's
// leading `word` tag maps to a fixed-size icon chip so every row's text aligns,
// with a legend (built from this same map) decoding the icons. To add/rename a
// type, edit only here. Icons are Tabler glyphs (ti-*), loaded app-wide.
const MD_BADGE_META = {
    feature:     { icon: 'ti-sparkles',    label: 'Feature',     bg: 'rgba(74,158,255,0.15)',   color: '#4a9eff' },
    improvement: { icon: 'ti-trending-up', label: 'Improvement', bg: 'rgba(123,198,126,0.15)',   color: '#7bc67e' },
    fix:         { icon: 'ti-tool',        label: 'Fix',         bg: 'rgba(224,92,92,0.15)',     color: '#e05c5c' },
    removed:     { icon: 'ti-trash',       label: 'Removed',     bg: 'rgba(245,168,0,0.15)',     color: '#f5a800' },
    docs:        { icon: 'ti-file-text',   label: 'Docs',        bg: 'rgba(150,150,150,0.15)',   color: '#888888' },
};
const MD_BADGE_FALLBACK = { icon: 'ti-point-filled', label: 'Other', bg: 'rgba(150,150,150,0.15)', color: '#888888' };

const MD_COLUMN_DOTS = {
    'Done':        'done',
    'In Progress': 'progress',
    'Planned':     'planned',
    'Ideas':       'idea',
};

// Call this once before using renderMarkdownAs* functions
function loadMarkdownEngine() {
    return loadScript(MARKED_CDN);
}

// Docs mode: render markdown as styled HTML
function renderMarkdownAsHtml(url, targetEl) {
    return fetch(url)
        .then(r => { if (!r.ok) throw new Error(`Cannot fetch: ${url}`); return r.text(); })
        .then(text => {
            targetEl.innerHTML = `<div class="md-content">${marked.parse(text)}</div>`;
        });
}

// Cards mode: render markdown as columns (H2=column, H3=card) or timeline (H2=version, list=entries)
function renderMarkdownAsCards(url, targetEl, options) {
    const layout = (options && options.layout) || 'columns';
    return fetch(url)
        .then(r => { if (!r.ok) throw new Error(`Cannot fetch: ${url}`); return r.text(); })
        .then(text => {
            const tokens = marked.lexer(text);
            if (layout === 'columns')  mdRenderColumns(tokens, targetEl);
            if (layout === 'timeline') mdRenderTimeline(tokens, targetEl);
        });
}

function mdRenderColumns(tokens, targetEl) {
    const sections = [];
    let section = null;
    let card    = null;

    tokens.forEach(t => {
        if (t.type === 'heading' && t.depth === 2) {
            section = { title: t.text, cards: [] };
            sections.push(section);
            card = null;
        } else if (t.type === 'heading' && t.depth === 3 && section) {
            card = { title: t.text, body: '' };
            section.cards.push(card);
        } else if (t.type === 'paragraph' && card) {
            card.body = t.text;
        }
    });

    targetEl.innerHTML = `<div class="roadmap-columns">${
        sections.map(s => `
            <div class="roadmap-column roadmap-column--${MD_COLUMN_DOTS[s.title] || 'idea'}">
                <div class="roadmap-column-header">
                    <span class="column-dot column-dot--${MD_COLUMN_DOTS[s.title] || 'idea'}"></span>
                    <span>${s.title}</span>
                </div>
                <div class="roadmap-items">${
                    s.cards.map(c => `
                        <div class="roadmap-item">
                            <div class="roadmap-item-title">${c.title}</div>
                            ${c.body ? `<div class="roadmap-item-body">${c.body}</div>` : ''}
                        </div>
                    `).join('')
                }</div>
            </div>
        `).join('')
    }</div>`;
}

function mdRenderTimeline(tokens, targetEl) {
    const groups = [];
    let group = null;

    tokens.forEach(t => {
        if (t.type === 'heading' && t.depth === 2) {
            const parts = t.text.split(/\s*[—–-]\s*/);
            group = { version: parts[0].trim(), date: parts[1] ? parts[1].trim() : '', entries: [] };
            groups.push(group);
        } else if (t.type === 'list' && group) {
            t.items.forEach(item => {
                const match = item.text.match(/^`(\w+)`\s*([\s\S]*)/);
                if (match) {
                    group.entries.push({ badge: match[1], text: match[2].trim() });
                } else {
                    group.entries.push({ badge: null, text: item.text.trim() });
                }
            });
        }
    });

    // A chip is a fixed-size icon square; identical width on every row is what
    // keeps the entry text aligned. `title` gives a hover tooltip of the label.
    const chip = (meta) =>
        `<span class="cl-badge" style="background:${meta.bg};color:${meta.color}" title="${meta.label}"><i class="ti ${meta.icon}"></i></span>`;

    const legend = `
        <div class="changelog-legend">
            <span class="changelog-legend-title">Legend</span>
            ${Object.values(MD_BADGE_META).map(m => `
                <span class="changelog-legend-item">
                    ${chip(m)}<span class="cl-legend-label">${m.label}</span>
                </span>
            `).join('')}
        </div>`;

    targetEl.innerHTML = legend + groups.map(g => `
        <div class="changelog-group">
            <div class="changelog-version">
                <span class="version-tag">${g.version}</span>
                ${g.date ? `<span class="version-date">${g.date}</span>` : ''}
            </div>
            <div class="changelog-entries">${
                g.entries.map(e => {
                    const meta = (e.badge && MD_BADGE_META[e.badge]) || MD_BADGE_FALLBACK;
                    return `
                        <div class="changelog-entry">
                            ${chip(meta)}
                            <span class="entry-text">${e.text}</span>
                        </div>
                    `;
                }).join('')
            }</div>
        </div>
    `).join('');
}
