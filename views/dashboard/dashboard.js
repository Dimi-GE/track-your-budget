function initDashboard() {
    console.log('Dashboard view initialized');

    const STORAGE_KEY = 'dashboard_committed';

    const categories = {
        income:   ['Starting Funds', 'Salary', 'Other'],
        savings:  ['Flow', 'Other'],
        // Spend categories come from the shared EXPENSE_CATEGORIES (app.js); the
        // "Savings" reserve-withdrawal category is appended as it is special.
        expenses: [
            ...EXPENSE_CATEGORIES.map(c => c.label),
            'Savings'   // withdrawal from the reserve (nets down Savings, not an expense)
        ],
        potential: ['Income', 'Expenses'],   // partner stream, direction only; see isPotential()
    };

    let committed = {
        income: 0, savings: 0, savingsFromFlow: 0,
        expenses: 0, flow: 0, entries: [],
    };
    let staged = [];
    let startingFundsLocked = false;

    // --- Elements ---
    const selectType    = document.getElementById('select-type');
    const selectCategory= document.getElementById('select-category');
    const selectCurrency= document.getElementById('select-currency');
    const selectHolding = document.getElementById('select-holding');
    const inputDate     = document.getElementById('input-date');
    const inputAmount   = document.getElementById('input-amount');
    const btnAdd        = document.getElementById('btn-add');
    const btnApply      = document.getElementById('btn-apply');
    const historyEl     = document.getElementById('entries-history');
    const inputNote     = document.getElementById('input-note');
    const btnExport     = document.getElementById('btn-export');
    const inputImport   = document.getElementById('input-import');
    const inputFilename = document.getElementById('input-filename');
    const btnFileToggle = document.getElementById('btn-file-toggle');
    const fileOpsPanel  = document.getElementById('file-ops-panel');

    inputDate.value     = new Date().toISOString().split('T')[0];
    inputFilename.value = `dashboard-${new Date().toISOString().split('T')[0]}`;

    // --- File ops toggle ---
    btnFileToggle.addEventListener('click', () => {
        const isOpen = fileOpsPanel.classList.toggle('open');
        btnFileToggle.classList.toggle('active', isOpen);
    });

    document.addEventListener('click', (e) => {
        if (fileOpsPanel.classList.contains('open') &&
            !fileOpsPanel.contains(e.target) &&
            e.target !== btnFileToggle) {
            fileOpsPanel.classList.remove('open');
            btnFileToggle.classList.remove('active');
        }
    });

    // --- localStorage ---
    function saveToStorage() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(committed)); }
        catch(e) { console.warn('Could not save:', e); }
    }

    function loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                committed = JSON.parse(raw);
                startingFundsLocked = committed.entries.some(e => e.category === 'starting_funds');
                populateCategories();
                renderTxList(committed.entries);
            }
        } catch(e) { console.warn('Could not load:', e); }
        renderExpensesChart(committed.entries);
    }

    // --- Categories ---
    function populateCategories() {
        const type = selectType.value;
        selectCategory.innerHTML = '';
        categories[type].forEach(cat => {
            if (cat === 'Starting Funds' && startingFundsLocked) return;
            const opt = document.createElement('option');
            opt.value = cat.toLowerCase().replace(/ /g, '_');
            opt.textContent = cat;
            selectCategory.appendChild(opt);
        });
    }

    // --- Currency & holding ---
    // Currency defaults to the regional currency and stays locked, except for a
    // Savings → Other entry (money entering the reserve from outside the Flow),
    // which may be in a foreign currency. Holding type only applies to Savings.
    function populateCurrency() {
        const cfg = getCurrencyConfig();
        selectCurrency.innerHTML = '';
        cfg.list.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.textContent = c.symbol ? `${c.code} ${c.symbol}` : c.code;
            selectCurrency.appendChild(opt);
        });
        selectHolding.innerHTML = '';
        HOLDING_TYPES.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.key;
            opt.textContent = h.label;
            selectHolding.appendChild(opt);
        });
    }

    function updateCurrencyHoldingState() {
        const type     = selectType.value;
        const category = selectCategory.value;
        const regional = getRegionalCurrency();
        const foreignAllowed = type === 'savings' && category === 'other';

        selectHolding.style.display = type === 'savings' ? '' : 'none';

        if (foreignAllowed) {
            selectCurrency.disabled = false;
        } else {
            selectCurrency.value = regional;
            selectCurrency.disabled = true;
        }
    }

    populateCurrency();

    selectType.addEventListener('change', () => { populateCategories(); updateCurrencyHoldingState(); });
    selectCategory.addEventListener('change', updateCurrencyHoldingState);
    populateCategories();
    updateCurrencyHoldingState();

    // --- Staged entries ---
    function renderHistory() {
        if (staged.length === 0) {
            historyEl.innerHTML = '<div class="entries-empty">No staged entries yet</div>';
            btnApply.disabled = true;
            return;
        }
        historyEl.innerHTML = '';
        staged.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'entry-item';
            item.innerHTML = `
                <div class="entry-body">
                    <div class="entry-meta">
                        <span class="entry-date">${entry.date}</span>
                        <span class="entry-amount">${entry.amount.toFixed(2)}</span>
                        <span class="entry-type">${capitalize(entry.type)}</span>
                        <span class="entry-category">${entry.categoryLabel}</span>
                        <span class="entry-currency">${entry.currency || getRegionalCurrency()}</span>
                        ${entry.holding ? `<span class="entry-holding">${getHoldingLabel(entry.holding)}</span>` : ''}
                    </div>
                    ${entry.note ? `<div class="entry-note">${entry.note}</div>` : ''}
                </div>
                <button class="entry-delete" data-index="${index}">🗑</button>
            `;
            historyEl.appendChild(item);
        });
        btnApply.disabled = false;
        historyEl.querySelectorAll('.entry-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.index);
                if (staged[i].category === 'starting_funds') {
                    startingFundsLocked = false;
                    populateCategories();
                }
                staged.splice(i, 1);
                renderHistory();
            });
        });
    }

    // --- Add ---
    btnAdd.addEventListener('click', () => {
        const amount = parseFloat(inputAmount.value);
        if (isNaN(amount)) return;
        const type          = selectType.value;
        const category      = selectCategory.value;
        const categoryLabel = selectCategory.options[selectCategory.selectedIndex].text;
        const date          = inputDate.value;
        if (category === 'starting_funds') { startingFundsLocked = true; populateCategories(); }
        const note = inputNote.value.trim();
        const currency = selectCurrency.disabled ? getRegionalCurrency() : selectCurrency.value;
        const holding  = type === 'savings' ? selectHolding.value : undefined;
        staged.push({
            date, amount, type, category, categoryLabel, currency,
            ...(holding && { holding }),
            ...(note && { note }),
        });
        renderHistory();
        inputAmount.value = '';
        inputNote.value   = '';
    });

    // --- Apply ---
    btnApply.addEventListener('click', () => {
        applyCommitted([...committed.entries, ...staged]);
        staged = [];
        renderHistory();
    });

    // --- Commit a new set of entries and refresh all views ---
    function applyCommitted(entries) {
        committed = recalculateTotals(entries);
        startingFundsLocked = committed.entries.some(e => e.category === 'starting_funds');
        populateCategories();
        renderTxList(committed.entries);
        renderExpensesChart(committed.entries);
        saveToStorage();
        // Stamp local freshness on every commit, independent of any sync
        // connection, so a later Connect can compare ages correctly.
        window.GistBackup?.markLocalModified?.();
        pushToGist();
    }
    window.applyPeriodImport = applyCommitted;

    // --- Entry editor (edit committed entries from the Full History list) ---
    let editorEls   = null;
    let editingEntry = null;

    function escHandler(e) { if (e.key === 'Escape') closeEditor(); }

    function buildEditor() {
        // Drop any editor left over from a previous init of this view.
        document.querySelectorAll('.entry-editor-backdrop, .entry-editor').forEach(el => el.remove());

        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div class="entry-editor-backdrop" id="entry-editor-backdrop"></div>
            <div class="entry-editor" id="entry-editor" role="dialog" aria-modal="true" aria-label="Edit entry">
                <div class="entry-editor__title">Edit Entry</div>
                <div class="entry-editor__grid">
                    <label class="entry-editor__field"><span>Date</span><input type="date" id="edit-date"></label>
                    <label class="entry-editor__field"><span>Amount</span><input type="number" id="edit-amount" step="0.01"></label>
                    <label class="entry-editor__field"><span>Type</span>
                        <select id="edit-type">
                            <option value="income">Income</option>
                            <option value="savings">Savings</option>
                            <option value="expenses">Expenses</option>
                            <option value="potential">Potential</option>
                        </select>
                    </label>
                    <label class="entry-editor__field"><span>Category</span><select id="edit-category"></select></label>
                    <label class="entry-editor__field" id="edit-currency-field"><span>Currency</span><select id="edit-currency"></select></label>
                    <label class="entry-editor__field" id="edit-holding-field"><span>Holding</span><select id="edit-holding"></select></label>
                    <label class="entry-editor__field entry-editor__field--full"><span>Note</span><input type="text" id="edit-note" placeholder="Note (optional)"></label>
                </div>
                <div class="entry-editor__actions">
                    <button class="btn-secondary" id="edit-cancel">Cancel</button>
                    <button class="btn-apply" id="edit-save">Save</button>
                </div>
            </div>`;
        document.body.appendChild(wrap);

        editorEls = {
            backdrop:      wrap.querySelector('#entry-editor-backdrop'),
            modal:         wrap.querySelector('#entry-editor'),
            date:          wrap.querySelector('#edit-date'),
            amount:        wrap.querySelector('#edit-amount'),
            type:          wrap.querySelector('#edit-type'),
            category:      wrap.querySelector('#edit-category'),
            currency:      wrap.querySelector('#edit-currency'),
            holding:       wrap.querySelector('#edit-holding'),
            currencyField: wrap.querySelector('#edit-currency-field'),
            holdingField:  wrap.querySelector('#edit-holding-field'),
            note:          wrap.querySelector('#edit-note'),
            save:          wrap.querySelector('#edit-save'),
            cancel:        wrap.querySelector('#edit-cancel'),
        };

        editorEls.holding.innerHTML = HOLDING_TYPES
            .map(h => `<option value="${h.key}">${h.label}</option>`).join('');

        editorEls.type.addEventListener('change', () => {
            populateEditCategories();
            updateEditCurrencyHolding();
        });
        editorEls.category.addEventListener('change', updateEditCurrencyHolding);
        editorEls.cancel.addEventListener('click', closeEditor);
        editorEls.backdrop.addEventListener('click', closeEditor);
        editorEls.save.addEventListener('click', saveEditor);
    }

    // Options mirror the New Entry form, minus Starting Funds when it is locked
    // (unless this very entry is the Starting Funds record).
    function populateEditCategories(selected) {
        editorEls.category.innerHTML = '';
        categories[editorEls.type.value].forEach(cat => {
            const value = cat.toLowerCase().replace(/ /g, '_');
            if (value === 'starting_funds' && startingFundsLocked && selected !== 'starting_funds') return;
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = cat;
            editorEls.category.appendChild(opt);
        });
        if (selected) editorEls.category.value = selected;
    }

    function updateEditCurrencyHolding() {
        const type     = editorEls.type.value;
        const category = editorEls.category.value;
        const regional = getRegionalCurrency();
        editorEls.holdingField.style.display = type === 'savings' ? '' : 'none';
        if (type === 'savings' && category === 'other') {
            editorEls.currency.disabled = false;
        } else {
            editorEls.currency.value = regional;
            editorEls.currency.disabled = true;
        }
    }

    function openEntryEditor(entry) {
        if (!editorEls) buildEditor();
        editingEntry = entry;

        editorEls.currency.innerHTML = getCurrencyConfig().list
            .map(c => `<option value="${c.code}">${c.symbol ? c.code + ' ' + c.symbol : c.code}</option>`).join('');

        editorEls.date.value   = entry.date;
        editorEls.amount.value = entry.amount;
        editorEls.type.value   = entry.type;
        populateEditCategories(entry.category);
        editorEls.holding.value = entry.holding || HOLDING_TYPES[0].key;
        editorEls.note.value    = entry.note || '';
        updateEditCurrencyHolding();
        // Restore the entry's currency where the field is editable (Savings → Other).
        editorEls.currency.value = editorEls.currency.disabled
            ? getRegionalCurrency()
            : (entry.currency || getRegionalCurrency());

        editorEls.backdrop.classList.add('open');
        editorEls.modal.classList.add('open');
        document.addEventListener('keydown', escHandler);
    }
    window.openEntryEditor = openEntryEditor;

    function closeEditor() {
        document.removeEventListener('keydown', escHandler);
        if (!editorEls) return;
        editorEls.backdrop.classList.remove('open');
        editorEls.modal.classList.remove('open');
        editingEntry = null;
    }

    function saveEditor() {
        if (!editingEntry) return;
        const amount = parseFloat(editorEls.amount.value);
        if (isNaN(amount)) { editorEls.amount.focus(); return; }
        const type          = editorEls.type.value;
        const category      = editorEls.category.value;
        const categoryLabel = editorEls.category.options[editorEls.category.selectedIndex]?.text || category;
        const note          = editorEls.note.value.trim();
        const currency      = editorEls.currency.disabled ? getRegionalCurrency() : editorEls.currency.value;

        editingEntry.date          = editorEls.date.value;
        editingEntry.amount        = amount;
        editingEntry.type          = type;
        editingEntry.category      = category;
        editingEntry.categoryLabel = categoryLabel;
        editingEntry.currency      = currency;
        if (type === 'savings') editingEntry.holding = editorEls.holding.value;
        else delete editingEntry.holding;
        if (note) editingEntry.note = note; else delete editingEntry.note;

        closeEditor();
        applyCommitted([...committed.entries]);   // recalc, persist, push, re-render
    }

    // --- Remote backup (push full snapshot on commit if connected) ---
    function pushToGist() {
        if (!window.GistBackup?.isConnected()) return;
        GistBackup.backupNow()
            .then(date => console.log('[gist] pushed at', date))
            .catch(e => console.warn('[gist] push failed:', e.message));
    }

    // --- Export ---
    btnExport.addEventListener('click', () => {
        const filename = (inputFilename.value.trim() || 'dashboard-backup') + '.json';
        // Export only `entries` — the source of truth. Totals are derived on
        // import via recalculateTotals(), so writing them here would be
        // misleading (hand-editing them has no effect).
        const blob = new Blob([JSON.stringify({ entries: committed.entries }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    });

    // --- Import ---
    inputImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                applyCommitted(data.entries || []);
            } catch(err) { console.error('Import failed:', err); }
        };
        reader.readAsText(file);
        inputImport.value = '';
    });

    function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

    // --- Load Chart.js then components ---
    const chartSlot = document.getElementById('expenses-chart-slot');
    const txSlot    = document.getElementById('tx-history-slot');

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js')
        .then(() => loadScript('engine/periods.js'))
        .then(() => loadScript('engine/calculator.js'))
        .then(() => fetch('views/dashboard/expenses-chart/expenses-chart.html'))
        .then(r => r.text())
        .then(html => {
            chartSlot.innerHTML = html;
            loadCSS('views/dashboard/expenses-chart/expenses-chart.css');
            return loadScript('views/dashboard/expenses-chart/expenses-chart.js');
        })
        .then(() => {
            initExpensesChart();
            return fetch('views/dashboard/tx-history/tx-history.html');
        })
        .then(r => r.text())
        .then(html => {
            txSlot.innerHTML = html;
            loadCSS('views/dashboard/tx-history/tx-history.css');
            return loadScript('views/dashboard/tx-history/tx-history.js');
        })
        .then(() => {
            initTxHistory();
            loadFromStorage();
            window.viewReady?.();
        });
}
