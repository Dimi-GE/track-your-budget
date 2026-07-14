function initSettings() {
    const STORAGE_KEYS = ['dashboard_committed', 'currency_config', 'currency_rates', 'forecast_settings'];

    // ── Backup ─────────────────────────────────────────────────────────────
    document.getElementById('btn-backup').addEventListener('click', () => {
        const backup = { _meta: { version: 1, date: new Date().toISOString() } };
        STORAGE_KEYS.forEach(k => {
            const val = localStorage.getItem(k);
            if (val !== null) backup[k] = JSON.parse(val);
        });
        const date = new Date().toISOString().split('T')[0];
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `financial-backup-${date}.json`; a.click();
        URL.revokeObjectURL(url);
    });

    // ── Restore ────────────────────────────────────────────────────────────
    const restoreActionEl  = document.getElementById('restore-action');
    const inputRestore     = document.getElementById('input-restore');

    function showRestoreButton() {
        restoreActionEl.innerHTML = '<button class="btn-restore" id="btn-restore">Restore</button>';
        restoreActionEl.querySelector('#btn-restore').addEventListener('click', showRestoreConfirm);
    }

    function showRestoreConfirm() {
        restoreActionEl.innerHTML = `
            <div class="btn-confirm-row">
                <label class="btn-confirm-yes btn-confirm-file">Choose file<input type="file" accept=".json" style="display:none"></label>
                <button class="btn-confirm-no">Cancel</button>
            </div>
        `;
        restoreActionEl.querySelector('input[type="file"]').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    STORAGE_KEYS.forEach(k => {
                        if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]));
                    });
                    sessionStorage.setItem('activeView', 'home');
                    location.reload();
                } catch (err) { console.error('Restore failed:', err); showRestoreButton(); }
            };
            reader.readAsText(file);
        });
        restoreActionEl.querySelector('.btn-confirm-no').addEventListener('click', showRestoreButton);
    }

    showRestoreButton();

    // ── Reset ──────────────────────────────────────────────────────────────
    const resetActionEl = document.getElementById('reset-action');

    function showResetButton() {
        resetActionEl.innerHTML = '<button class="btn-reset">Reset</button>';
        resetActionEl.querySelector('.btn-reset').addEventListener('click', showResetConfirm);
    }

    function showResetConfirm() {
        resetActionEl.innerHTML = `
            <div class="btn-confirm-row">
                <button class="btn-confirm-yes">Confirm reset</button>
                <button class="btn-confirm-no">Cancel</button>
            </div>
        `;
        resetActionEl.querySelector('.btn-confirm-yes').addEventListener('click', doReset);
        resetActionEl.querySelector('.btn-confirm-no').addEventListener('click', showResetButton);
    }

    function doReset() {
        STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
        sessionStorage.setItem('activeView', 'home');
        location.reload();
    }

    showResetButton();

    // ── Remote Backup — one token unlocks one full-snapshot Gist ────────────
    const tokenInput  = document.getElementById('gist-token');
    const tokenAction = document.getElementById('token-action');
    const tokenStatus = document.getElementById('token-status');
    const idInput     = document.getElementById('gist-id');
    const gistAction  = document.getElementById('gist-action');
    const gistStatus  = document.getElementById('gist-status');

    function setTokenStatus(msg, kind) {
        tokenStatus.textContent = msg || '';
        tokenStatus.className = 'gist-status' + (kind ? ' ' + kind : '');
    }
    function setGistStatus(msg, kind) {
        gistStatus.textContent = msg || '';
        gistStatus.className = 'gist-status' + (kind ? ' ' + kind : '');
    }

    const GIST_MESSAGES = {
        seeded: 'Connected — your data was uploaded to this Gist.',
        pulled: 'Connected — pulled newer data from this Gist. Reopen views to see it.',
        pushed: 'Connected — your data is now backed up to this Gist.',
        insync: 'Connected — already up to date.',
        none:   'Connected — no data yet; changes back up on Apply.',
    };

    // ── Token latch ────────────────────────────────────────────────────────
    function renderTokenConnected() {
        tokenInput.value    = GistBackup.getConfig().token;
        tokenInput.disabled = true;
        tokenAction.innerHTML = '<button class="btn-gist-disconnect" id="btn-token-disconnect">Disconnect</button>';
        tokenAction.querySelector('#btn-token-disconnect').addEventListener('click', doTokenDisconnect);
        setTokenStatus('Token verified.', 'connected');
    }

    function renderTokenDisconnected() {
        tokenInput.disabled = false;
        tokenAction.innerHTML = '<button class="btn-backup" id="btn-token-connect">Connect</button>';
        tokenAction.querySelector('#btn-token-connect').addEventListener('click', doTokenConnect);
    }

    async function doTokenConnect() {
        const token = tokenInput.value.trim();
        const btn = tokenAction.querySelector('#btn-token-connect');
        if (!token) { setTokenStatus('Enter an access token.', 'error'); return; }
        btn.disabled = true;
        setTokenStatus('Verifying…', '');
        const result = await GistBackup.validateToken(token);
        if (!result.ok) { setTokenStatus(result.error, 'error'); btn.disabled = false; return; }
        GistBackup.saveToken(token);
        renderTokenConnected();
        renderGistLatch();   // unlock the gist field
    }

    function doTokenDisconnect() {
        // Cascade: the gist cannot work without the token, so drop both.
        GistBackup.clearToken();
        tokenInput.value = '';
        idInput.value    = '';
        renderTokenDisconnected();
        renderGistLatch();
        setTokenStatus('', '');
        setGistStatus('', '');
    }

    // ── Gist latch (locked until a token is connected) ─────────────────────
    function renderGistLatch() {
        if (!GistBackup.hasToken())      renderGistLocked();
        else if (GistBackup.isConnected()) renderGistConnected();
        else                             renderGistDisconnected();
    }

    function renderGistLocked() {
        idInput.value = '';
        idInput.disabled = true;
        gistAction.innerHTML = '<button class="btn-backup" disabled>Connect</button>';
        setGistStatus('Connect a token first.', '');
    }

    function renderGistDisconnected() {
        idInput.disabled = false;
        gistAction.innerHTML = '<button class="btn-backup" id="btn-gist-connect">Connect</button>';
        gistAction.querySelector('#btn-gist-connect').addEventListener('click', doGistConnect);
        setGistStatus('', '');
    }

    function renderGistConnected() {
        idInput.value    = GistBackup.getConfig().gistId;
        idInput.disabled = true;
        gistAction.innerHTML = `
            <button class="btn-backup"  id="btn-gist-backup">Backup</button>
            <button class="btn-restore" id="btn-gist-restore">Restore</button>
            <button class="btn-gist-disconnect" id="btn-gist-disconnect">Disconnect</button>`;
        gistAction.querySelector('#btn-gist-backup').addEventListener('click', doGistBackup);
        gistAction.querySelector('#btn-gist-restore').addEventListener('click', showGistRestoreConfirm);
        gistAction.querySelector('#btn-gist-disconnect').addEventListener('click', doGistDisconnect);
        setGistStatus('Connected — backs up on every Apply.', 'connected');
    }

    async function doGistConnect() {
        const { token } = GistBackup.getConfig();
        const gistId = idInput.value.trim();
        const btn = gistAction.querySelector('#btn-gist-connect');
        if (!gistId) { setGistStatus('Enter a Gist ID.', 'error'); return; }
        btn.disabled = true;
        setGistStatus('Verifying…', '');
        const result = await GistBackup.validateGist(token, gistId);
        if (!result.ok) { setGistStatus(result.error, 'error'); btn.disabled = false; return; }
        GistBackup.saveGist(gistId);
        renderGistConnected();
        // Establish a baseline immediately (seed / pull / push as appropriate).
        try {
            const { action } = await GistBackup.establishConnection();
            setGistStatus(GIST_MESSAGES[action] || GIST_MESSAGES.none, 'connected');
        } catch (e) {
            console.warn('[gist] establish on connect failed:', e.message);
            setGistStatus('Connected, but the initial sync failed — check the console.', 'error');
        }
    }

    function doGistDisconnect() {
        GistBackup.clearGist();
        idInput.value = '';
        renderGistDisconnected();
    }

    async function doGistBackup() {
        setGistStatus('Backing up…', '');
        try {
            const date = await GistBackup.backupNow();
            setGistStatus(`Backed up all data at ${new Date(date).toLocaleString()}.`, 'connected');
        } catch (e) { setGistStatus(`Backup failed — ${e.message}`, 'error'); }
    }

    function showGistRestoreConfirm() {
        gistAction.innerHTML = `
            <button class="btn-confirm-yes">Confirm restore</button>
            <button class="btn-confirm-no">Cancel</button>`;
        gistAction.querySelector('.btn-confirm-yes').addEventListener('click', doGistRestore);
        gistAction.querySelector('.btn-confirm-no').addEventListener('click', renderGistConnected);
    }

    async function doGistRestore() {
        setGistStatus('Restoring…', '');
        try {
            await GistBackup.restoreNow();
            sessionStorage.setItem('activeView', 'home');
            location.reload();
        } catch (e) { setGistStatus(`Restore failed — ${e.message}`, 'error'); renderGistConnected(); }
    }

    if (GistBackup.hasToken()) renderTokenConnected();
    else renderTokenDisconnected();
    renderGistLatch();

    // ── Currencies ─────────────────────────────────────────────────────────
    const curListEl = document.getElementById('currency-list');
    const curCode   = document.getElementById('cur-code');
    const curSymbol = document.getElementById('cur-symbol');
    const curName   = document.getElementById('cur-name');
    const curMsgEl  = document.getElementById('currency-msg');
    let editingCode = null;   // code of the row currently in inline-edit mode

    function setCurMsg(msg, kind) {
        curMsgEl.textContent = msg || '';
        curMsgEl.className = 'currency-msg' + (kind ? ' ' + kind : '');
    }

    // Persist and propagate: back up the full snapshot too, so the currency
    // list follows the user across devices even without a Dashboard commit.
    function persistCurrency(cfg) {
        saveCurrencyConfig(cfg);
        pushSnapshotIfConnected();
    }

    // Stamp local freshness (connection-independent) and, when connected, push
    // the full snapshot so a settings-only change is backed up immediately.
    function pushSnapshotIfConnected() {
        window.GistBackup?.markLocalModified?.();
        if (window.GistBackup?.isConnected()) {
            GistBackup.backupNow().catch(e => console.warn('[gist] settings push failed:', e.message));
        }
    }

    function renderCurrencies() {
        const cfg = getCurrencyConfig();
        curListEl.innerHTML = cfg.list.map(c => {
            const isRegional = c.code === cfg.regional;
            if (c.code === editingCode) {
                // Inline edit form for this row.
                return `
                    <div class="currency-row currency-row--editing" data-code="${c.code}">
                        <input class="currency-input currency-edit-code" value="${c.code}" maxlength="6" autocomplete="off" spellcheck="false" title="Code">
                        <input class="currency-input currency-edit-sym" value="${c.symbol || ''}" maxlength="4" autocomplete="off" spellcheck="false" title="Symbol">
                        <input class="currency-input currency-edit-name" value="${c.name || ''}" maxlength="40" autocomplete="off" spellcheck="false" title="Name">
                        <button class="currency-save" data-code="${c.code}" title="Save"><i class="ti ti-check"></i></button>
                        <button class="currency-cancel" title="Cancel"><i class="ti ti-x"></i></button>
                    </div>`;
            }
            return `
                <div class="currency-row${isRegional ? ' currency-row--regional' : ''}">
                    <button class="currency-star" data-code="${c.code}" title="${isRegional ? 'Regional currency' : 'Set as regional'}">
                        <i class="ti ${isRegional ? 'ti-star-filled' : 'ti-star'}"></i>
                    </button>
                    <span class="currency-code">${c.code}</span>
                    <span class="currency-sym">${c.symbol || ''}</span>
                    <span class="currency-name">${c.name || ''}</span>
                    <button class="currency-edit" data-code="${c.code}" title="Edit">
                        <i class="ti ti-pencil"></i>
                    </button>
                    <button class="currency-remove" data-code="${c.code}" title="Remove"${isRegional || cfg.list.length <= 1 ? ' disabled' : ''}>
                        <i class="ti ti-x"></i>
                    </button>
                </div>`;
        }).join('');

        curListEl.querySelectorAll('.currency-star').forEach(btn =>
            btn.addEventListener('click', () => setRegional(btn.dataset.code)));
        curListEl.querySelectorAll('.currency-edit').forEach(btn =>
            btn.addEventListener('click', () => startEdit(btn.dataset.code)));
        curListEl.querySelectorAll('.currency-remove').forEach(btn =>
            btn.addEventListener('click', () => removeCurrency(btn.dataset.code)));
        curListEl.querySelectorAll('.currency-save').forEach(btn =>
            btn.addEventListener('click', () => saveEdit(btn.dataset.code)));
        curListEl.querySelectorAll('.currency-cancel').forEach(btn =>
            btn.addEventListener('click', cancelEdit));

        // Wire the edit form's keyboard shortcuts and focus the code field.
        const editRow = curListEl.querySelector('.currency-row--editing');
        if (editRow) {
            const codeInp = editRow.querySelector('.currency-edit-code');
            editRow.querySelectorAll('.currency-input').forEach(inp => {
                inp.addEventListener('keydown', e => {
                    if (e.key === 'Enter')  saveEdit(editingCode);
                    if (e.key === 'Escape') cancelEdit();
                });
            });
            codeInp.focus();
            codeInp.setSelectionRange(codeInp.value.length, codeInp.value.length);
        }
    }

    function startEdit(code) {
        editingCode = code;
        setCurMsg('', '');
        renderCurrencies();
    }

    function cancelEdit() {
        editingCode = null;
        setCurMsg('', '');
        renderCurrencies();
    }

    function saveEdit(oldCode) {
        const row = curListEl.querySelector('.currency-row--editing');
        if (!row) return;
        const code   = row.querySelector('.currency-edit-code').value.trim().toUpperCase();
        const symbol = row.querySelector('.currency-edit-sym').value.trim();
        const name   = row.querySelector('.currency-edit-name').value.trim();
        if (!code) { setCurMsg('Enter a currency code.', 'error'); return; }

        const cfg  = getCurrencyConfig();
        const codeChanged = code !== oldCode;
        if (codeChanged && cfg.list.some(c => c.code === code)) {
            setCurMsg(`${code} already exists.`, 'error');
            return;
        }
        const item = cfg.list.find(c => c.code === oldCode);
        if (!item) { editingCode = null; renderCurrencies(); return; }

        item.code = code; item.symbol = symbol; item.name = name;
        // Keep the regional pointer attached to the renamed currency.
        const wasRegional = cfg.regional === oldCode;
        if (codeChanged && wasRegional) cfg.regional = code;

        // Persist config first, then rewrite any entries tagged with the old
        // code, then push one snapshot that reflects both. (Currency is a visual
        // attribute on entries; a code rename must follow through or those rows
        // would keep a code no longer in the list.)
        saveCurrencyConfig(cfg);
        if (codeChanged) migrateEntryCurrency(oldCode, code);
        pushSnapshotIfConnected();

        editingCode = null;
        setCurMsg(`Updated ${code}.`, 'ok');
        renderCurrencies();

        // A regional code rename invalidates cached live rates (keyed to the
        // base code); otherwise just redraw so rate-row labels track the edit.
        renderRates();
        if (codeChanged && wasRegional) doRatesRefresh();
    }

    // Rewrite the currency code on any committed entry that used the old code,
    // so a rename never orphans historical transactions. The Dashboard reads
    // storage fresh on its next open, so no live re-render is needed here.
    function migrateEntryCurrency(oldCode, newCode) {
        try {
            const raw = localStorage.getItem('dashboard_committed');
            if (!raw) return;
            const data = JSON.parse(raw);
            if (!data || !Array.isArray(data.entries)) return;
            let changed = false;
            data.entries.forEach(e => {
                if (e.currency === oldCode) { e.currency = newCode; changed = true; }
            });
            if (changed) localStorage.setItem('dashboard_committed', JSON.stringify(data));
        } catch (e) {
            console.warn('[currency] entry code migration skipped:', e.message);
        }
    }

    function addCurrency() {
        const code = curCode.value.trim().toUpperCase();
        const symbol = curSymbol.value.trim();
        const name = curName.value.trim();
        if (!code) { setCurMsg('Enter a currency code.', 'error'); return; }
        const cfg = getCurrencyConfig();
        if (cfg.list.some(c => c.code === code)) { setCurMsg(`${code} already exists.`, 'error'); return; }
        cfg.list.push({ code, symbol, name });
        persistCurrency(cfg);
        curCode.value = curSymbol.value = curName.value = '';
        setCurMsg(`Added ${code}.`, 'ok');
        renderCurrencies();
    }

    function removeCurrency(code) {
        const cfg = getCurrencyConfig();
        if (cfg.list.length <= 1 || code === cfg.regional) return;
        cfg.list = cfg.list.filter(c => c.code !== code);
        persistCurrency(cfg);
        setCurMsg(`Removed ${code}.`, 'ok');
        renderCurrencies();
    }

    function setRegional(code) {
        const cfg = getCurrencyConfig();
        if (cfg.regional === code) return;
        cfg.regional = code;
        persistCurrency(cfg);
        setCurMsg(`${code} is now the regional currency.`, 'ok');
        renderCurrencies();
        // Changing the base invalidates cached live rates — refetch and redraw.
        renderRates();
        doRatesRefresh();
    }

    document.getElementById('btn-cur-add').addEventListener('click', addCurrency);
    curName.addEventListener('keydown', e => { if (e.key === 'Enter') addCurrency(); });
    renderCurrencies();

    // ── Exchange rates ──────────────────────────────────────────────────────
    const ratesListEl = document.getElementById('rates-list');
    const ratesMetaEl = document.getElementById('rates-meta');
    const ratesBaseEl = document.getElementById('rates-base');
    const btnRatesRefresh = document.getElementById('btn-rates-refresh');

    function setRatesMeta(msg, kind) {
        ratesMetaEl.textContent = msg || '';
        ratesMetaEl.className = 'rates-meta gist-status' + (kind ? ' ' + kind : '');
    }

    function renderRates() {
        const cfg  = getCurrencyConfig();
        const base = cfg.regional;
        ratesBaseEl.textContent = base;

        const stored  = FxRates.getRates();
        const foreign = cfg.list.filter(c => c.code !== base);

        if (foreign.length === 0) {
            ratesListEl.innerHTML = '<div class="rates-empty">Only the regional currency is defined — no conversion needed.</div>';
        } else {
            ratesListEl.innerHTML = foreign.map(c => {
                const override = stored.overrides[c.code];
                const live     = stored.rates[c.code];
                const src = override != null ? 'manual'
                          : live     != null ? 'live'
                          : 'no rate';
                const placeholder = live != null ? live.toFixed(4) : 'set rate';
                const value = override != null ? override : '';
                return `
                    <div class="rate-row">
                        <span class="rate-pair">1 <b>${c.code}</b> =</span>
                        <input type="number" class="rate-override" data-code="${c.code}"
                               step="0.0001" min="0" placeholder="${placeholder}" value="${value}">
                        <span class="rate-base-code">${base}</span>
                        <span class="rate-src rate-src--${src.replace(' ', '-')}">${src}</span>
                    </div>`;
            }).join('');

            ratesListEl.querySelectorAll('.rate-override').forEach(inp =>
                inp.addEventListener('change', () => {
                    FxRates.setOverride(inp.dataset.code, inp.value.trim());
                    pushSnapshotIfConnected();
                    renderRates();
                }));
        }

        const stamp = stored.updated ? new Date(stored.updated).toLocaleString() : null;
        if (stamp) setRatesMeta(`Live rates updated: ${stamp}.`, '');
        else       setRatesMeta('No live rates fetched yet — press Refresh.', '');
    }

    async function doRatesRefresh() {
        btnRatesRefresh.disabled = true;
        setRatesMeta('Refreshing…', '');
        const res = await FxRates.refresh();
        btnRatesRefresh.disabled = false;
        if (!res.ok) { setRatesMeta(res.error, 'error'); return; }
        renderRates();
    }

    btnRatesRefresh.addEventListener('click', doRatesRefresh);
    renderRates();

    window.viewReady?.();
}
