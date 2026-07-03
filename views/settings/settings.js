function initSettings() {
    const STORAGE_KEYS = ['dashboard_committed', 'forecast_settings', 'tt_entries', 'tt_sessions', 'tt_settings'];

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

    // ── Gist remote backup ─────────────────────────────────────────────────
    const tokenInput  = document.getElementById('gist-token');
    const idInput     = document.getElementById('gist-id');
    const gistAction  = document.getElementById('gist-action');
    const gistStatus  = document.getElementById('gist-status');

    function setStatus(msg, kind) {
        gistStatus.textContent = msg;
        gistStatus.className = 'gist-status' + (kind ? ' ' + kind : '');
    }

    function renderConnected() {
        const { token, gistId } = GistSync.getConfig();
        tokenInput.value = token;
        idInput.value    = gistId;
        tokenInput.disabled = true;
        idInput.disabled    = true;
        gistAction.innerHTML = '<button class="btn-gist-disconnect" id="btn-gist-disconnect">Disconnect</button>';
        gistAction.querySelector('#btn-gist-disconnect').addEventListener('click', doDisconnect);
        setStatus('Connected — dashboard changes back up to this Gist.', 'connected');
    }

    function renderDisconnected() {
        tokenInput.disabled = false;
        idInput.disabled    = false;
        gistAction.innerHTML = '<button class="btn-backup" id="btn-gist-connect">Connect</button>';
        gistAction.querySelector('#btn-gist-connect').addEventListener('click', doConnect);
    }

    async function doConnect() {
        const token  = tokenInput.value.trim();
        const gistId = idInput.value.trim();
        const btn = gistAction.querySelector('#btn-gist-connect');
        btn.disabled = true;
        setStatus('Verifying…', '');
        const result = await GistSync.validate(token, gistId);
        if (!result.ok) {
            setStatus(result.error, 'error');
            btn.disabled = false;
            return;
        }
        GistSync.saveConfig(token, gistId);
        renderConnected();
        // Establish a baseline immediately (seed / pull / push as appropriate).
        try {
            const { action } = await GistSync.establishConnection();
            setStatus(CONNECT_MESSAGES[action] || CONNECT_MESSAGES.none, 'connected');
        } catch (e) {
            console.warn('[gist] establish on connect failed:', e.message);
            setStatus('Connected, but the initial sync failed — check the console. Changes will retry on Apply.', 'error');
        }
    }

    const CONNECT_MESSAGES = {
        seeded: 'Connected — your local data was uploaded to this Gist.',
        pulled: 'Connected — pulled newer data from this Gist. Reopen the Dashboard to see it.',
        pushed: 'Connected — your local data is now backed up to this Gist.',
        none:   'Connected — no data yet; changes will back up on Apply.',
    };

    function doDisconnect() {
        GistSync.clearConfig();
        tokenInput.value = '';
        idInput.value    = '';
        renderDisconnected();
        setStatus('', '');
    }

    if (GistSync.isConnected()) renderConnected();
    else renderDisconnected();

    window.viewReady?.();
}
