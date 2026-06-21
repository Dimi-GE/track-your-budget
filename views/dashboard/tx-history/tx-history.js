let allTxEntries = [];

function initTxHistory() {
    const txContainer   = document.getElementById('tx-container');
    const txList        = document.getElementById('tx-list');
    const btnTxToggle   = document.getElementById('btn-tx-toggle');
    const txBackdrop    = document.getElementById('tx-backdrop');
    const filterType    = document.getElementById('tx-filter-type');
    const filterCat     = document.getElementById('tx-filter-category');

    let expanded = false;

    function expand() {
        expanded = true;
        txList.classList.add('expanded');
        txContainer.classList.add('expanded');
        txBackdrop.classList.add('active');
        btnTxToggle.textContent = 'Collapse';
    }

    function collapse() {
        expanded = false;
        txList.classList.remove('expanded');
        txContainer.classList.remove('expanded');
        txBackdrop.classList.remove('active');
        btnTxToggle.textContent = 'Full History';
    }

    btnTxToggle.addEventListener('click', () => expanded ? collapse() : expand());
    txBackdrop.addEventListener('click', collapse);

    // Rebuild category options from entries matching the selected type
    function repopulateCategories() {
        const type = filterType.value;
        const entries = type ? allTxEntries.filter(e => e.type === type) : allTxEntries;

        const seen = new Map();
        entries.forEach(e => {
            if (!seen.has(e.category)) seen.set(e.category, e.categoryLabel);
        });

        filterCat.innerHTML = '<option value="">All categories</option>';
        seen.forEach((label, value) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = label;
            filterCat.appendChild(opt);
        });
    }

    filterType.addEventListener('change', () => {
        repopulateCategories();
        applyFilters();
    });

    filterCat.addEventListener('change', applyFilters);

    function applyFilters() {
        const type = filterType.value;
        const cat  = filterCat.value;
        const filtered = allTxEntries.filter(e =>
            (!type || e.type === type) &&
            (!cat  || e.category === cat)
        );
        renderTxRows(filtered);
    }

    // Expose so renderTxList can trigger a re-filter after data update
    window._txApplyFilters = applyFilters;
    window._txRepopulateCategories = repopulateCategories;
}

function renderTxList(entries) {
    allTxEntries = [...entries].reverse();

    if (window._txRepopulateCategories) window._txRepopulateCategories();
    if (window._txApplyFilters) {
        window._txApplyFilters();
    } else {
        renderTxRows(allTxEntries);
    }
}

function renderTxRows(entries) {
    const txList = document.getElementById('tx-list');
    if (!txList) return;

    if (entries.length === 0) {
        txList.innerHTML = '<div class="entries-empty">No transactions yet</div>';
        return;
    }

    txList.innerHTML = '';
    entries.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'tx-item';
        item.innerHTML = `
            <div class="tx-body">
                <div class="tx-meta">
                    <span class="tx-date">${entry.date}</span>
                    <span class="tx-amount">${entry.amount.toFixed(2)}</span>
                    <span class="tx-type"><i class="ti ${TX_TYPE_ICONS[entry.type]}" style="color:${TX_TYPE_COLORS[entry.type]};"></i> ${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}</span>
                    <span class="tx-category" style="background-color:${getCategoryColor(entry.category)}22;color:${getCategoryColor(entry.category)};">${entry.categoryLabel}</span>
                    ${entry.note ? `<span class="tx-note">${entry.note}</span>` : ''}
                </div>
            </div>
        `;
        txList.appendChild(item);
    });
}