// gist-backup.js — full-snapshot remote backup to a *dedicated* GitHub Gist.
//
// Mirrors gist-sync.js (the live Dashboard sync) but for a complete snapshot of
// *all* app data, held in its own Gist so the two never fight over one file.
// Once connected it reconciles newest-wins on every app open (per session), and
// the manual Backup / Restore buttons force a push / pull. It reuses the same
// GitHub token (gist scope) as Gist Sync but its own Gist ID.
//
// Config in localStorage:
//   gist_token        shared with gist-sync (same PAT, gist scope)
//   gist_backup_id    id of the dedicated backup gist  (presence == connected)
//   gist_local_mtime  shared local-data freshness stamp (same key as gist-sync)
//
// Credentials are NEVER written into the backup payload — only app-data keys.

const GistBackup = (() => {
    const KEY_TOKEN     = 'gist_token';        // shared with gist-sync.js
    const KEY_BACKUP_ID = 'gist_backup_id';
    const KEY_MTIME     = 'gist_local_mtime';  // shared with gist-sync.js
    const FILENAME      = 'financial-backup.json';
    const API           = 'https://api.github.com/gists/';

    // App-data keys included in a full snapshot (same set as Settings' local
    // "Backup All Data" action). Credential keys are intentionally excluded.
    const KEYS = ['dashboard_committed', 'currency_config', 'currency_rates',
                  'forecast_settings', 'tt_entries', 'tt_sessions', 'tt_settings'];

    // ── Config ───────────────────────────────────────────────────────────
    function getConfig() {
        return {
            token:  localStorage.getItem(KEY_TOKEN)     || '',
            gistId: localStorage.getItem(KEY_BACKUP_ID) || '',
        };
    }

    function isConnected() {
        const { token, gistId } = getConfig();
        return Boolean(token && gistId);
    }

    function saveConfig(token, gistId) {
        localStorage.setItem(KEY_TOKEN, token);
        localStorage.setItem(KEY_BACKUP_ID, gistId);
    }

    function clearConfig() {
        // Keep the shared token (Gist Sync may still use it) — only drop the
        // backup gist id, which is what marks this feature as connected.
        localStorage.removeItem(KEY_BACKUP_ID);
    }

    // ── Local freshness (shared with gist-sync) ──────────────────────────
    function getLocalMtime() { return localStorage.getItem(KEY_MTIME) || ''; }
    function setLocalMtime(v) { localStorage.setItem(KEY_MTIME, v || new Date().toISOString()); }

    // ── Low-level request ────────────────────────────────────────────────
    function request(gistId, token, options = {}) {
        return fetch(API + gistId, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            },
        });
    }

    // ── Snapshot build / apply ───────────────────────────────────────────
    // Build the same structure Settings' local "Backup All Data" writes.
    function buildSnapshot() {
        const snap = { _meta: { version: 1, date: new Date().toISOString() } };
        KEYS.forEach(k => {
            const val = localStorage.getItem(k);
            if (val !== null) { try { snap[k] = JSON.parse(val); } catch {} }
        });
        return snap;
    }

    // Full replace of the app-data keys the snapshot contains. Pure — callers
    // own the mtime bookkeeping so pull/push stay in sync.
    function applySnapshot(data) {
        KEYS.forEach(k => {
            if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]));
        });
    }

    function hasLocalData() {
        try {
            const d = JSON.parse(localStorage.getItem('dashboard_committed'));
            if (d && Array.isArray(d.entries) && d.entries.length) return true;
        } catch {}
        return KEYS.some(k => localStorage.getItem(k) !== null);
    }

    // ── Pull / push ──────────────────────────────────────────────────────
    // pull → { data, date } (the snapshot and its _meta.date), or null if the
    // gist has no backup file yet. Throws on network / HTTP error.
    async function pull() {
        const { token, gistId } = getConfig();
        if (!token || !gistId) return null;
        const res = await request(gistId, token);
        if (!res.ok) throw new Error(`Pull failed (${res.status})`);
        const gist = await res.json();
        const file = gist.files && gist.files[FILENAME];
        if (!file) return null;
        const raw = file.truncated ? await (await fetch(file.raw_url)).text() : file.content;
        let data;
        try { data = JSON.parse(raw); } catch { return null; }
        return { data, date: (data._meta && data._meta.date) || '' };
    }

    // push → resolves the pushed snapshot's date. Throws on error.
    async function push() {
        const { token, gistId } = getConfig();
        if (!token || !gistId) return '';
        const snap    = buildSnapshot();
        const content = JSON.stringify(snap, null, 2);
        const res = await request(gistId, token, {
            method: 'PATCH',
            body: JSON.stringify({ files: { [FILENAME]: { content } } }),
        });
        if (!res.ok) throw new Error(`Push failed (${res.status})`);
        return snap._meta.date;
    }

    // ── Reconcile (newest wins) ──────────────────────────────────────────
    // Used both on Connect and on each app open. Leaves both sides consistent
    // with the newest data without ever silently dropping the newer side:
    //   • empty remote          → push local to seed it   ('seeded')
    //   • remote strictly newer → adopt remote            ('pulled')
    //   • local strictly newer  → push local              ('pushed')
    //   • same age              → nothing                 ('insync')
    //   • both empty            → nothing                 ('none')
    // Ties and un-comparable timestamps favour keeping local (least
    // destructive), matching gist-sync's stance.
    async function reconcile() {
        if (!isConnected()) return { action: 'none' };
        const remote     = await pull();
        const localMtime = getLocalMtime();
        const local      = hasLocalData();

        if (!remote) {
            if (!local) return { action: 'none' };
            setLocalMtime(await push());
            return { action: 'seeded' };
        }

        let remoteNewer;
        if (!local)                           remoteNewer = true;
        else if (!localMtime || !remote.date) remoteNewer = false;
        else                                  remoteNewer = remote.date > localMtime;

        if (remoteNewer) {
            applySnapshot(remote.data);
            setLocalMtime(remote.date);
            return { action: 'pulled' };
        }
        if (localMtime && remote.date && localMtime === remote.date) {
            return { action: 'insync' };
        }
        setLocalMtime(await push());
        return { action: 'pushed' };
    }

    // ── Manual actions (only offered while connected) ────────────────────
    async function backupNow() {
        const date = await push();
        setLocalMtime(date);
        return date;
    }

    async function restoreNow() {
        const remote = await pull();
        if (!remote) throw new Error('No backup found in this Gist yet.');
        applySnapshot(remote.data);
        setLocalMtime(remote.date);
        return remote.date;
    }

    return {
        KEYS, FILENAME,
        getConfig, isConnected, saveConfig, clearConfig,
        getLocalMtime,
        buildSnapshot, applySnapshot, hasLocalData,
        pull, push, reconcile,
        establishConnection: reconcile,   // alias: Connect uses the same logic
        reconcileOnOpen:     reconcile,   // and so does per-session open
        backupNow, restoreNow,
    };
})();

window.GistBackup = GistBackup;
