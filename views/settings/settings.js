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
    window.viewReady?.();
}
