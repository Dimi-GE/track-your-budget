// gist-backup.js — the single remote backend: a full snapshot of *all* app data
// in one GitHub Gist.
//
// The token and the gist are two independent latches: a verified token unlocks
// the gist field, and connecting the gist (token + id) enables sync. Once
// connected the snapshot reconciles newest-wins on every app open, the Dashboard
// Apply pushes the whole snapshot, and manual Backup / Restore force a push /
// pull. (This absorbs the former live "sync" gist — the app only tracks a budget
// now, so there is nothing left to split across two gists.)
//
// Config in localStorage:
//   gist_token        GitHub PAT with gist scope (presence == token connected)
//   gist_id           id of the backup gist       (token + id == connected)
//   gist_local_mtime  local-data freshness stamp for newest-wins reconciliation
//
// Credentials are NEVER written into the backup payload — only app-data keys.

const GistBackup = (() => {
    const KEY_TOKEN   = 'gist_token';
    const KEY_GIST_ID = 'gist_id';
    const KEY_MTIME   = 'gist_local_mtime';
    const FILENAME    = 'financial-backup.json';
    const API         = 'https://api.github.com/gists/';
    const LIST_API    = 'https://api.github.com/gists';

    // One-time migration: the app used to keep two Gists — a live "sync" gist
    // (key gist_id) and a dedicated full-snapshot "backup" gist (gist_backup_id).
    // They are now one full-snapshot Gist. Adopt the old backup gist as the
    // single gist id (it already holds the snapshot format), then drop the legacy
    // key. Idempotent — a no-op once gist_backup_id is gone.
    (function migrateSingleGist() {
        const legacy = localStorage.getItem('gist_backup_id');
        if (legacy) {
            localStorage.setItem(KEY_GIST_ID, legacy);
            localStorage.removeItem('gist_backup_id');
        }
    })();

    // App-data keys included in a full snapshot (same set as Settings' local
    // "Backup All Data" action). Credential keys are intentionally excluded.
    const KEYS = ['dashboard_committed', 'currency_config', 'currency_rates',
                  'forecast_settings'];

    // ── Config: token and gist are independent latches ───────────────────
    function getConfig() {
        return {
            token:  localStorage.getItem(KEY_TOKEN)   || '',
            gistId: localStorage.getItem(KEY_GIST_ID) || '',
        };
    }

    function hasToken() { return Boolean(localStorage.getItem(KEY_TOKEN)); }

    function isConnected() {
        const { token, gistId } = getConfig();
        return Boolean(token && gistId);
    }

    function saveToken(token) { localStorage.setItem(KEY_TOKEN, token); }
    function saveGist(gistId) { localStorage.setItem(KEY_GIST_ID, gistId); }

    // Disconnecting the token cascades: the gist cannot work without it, so drop
    // both. Disconnecting only the gist keeps the verified token in place.
    function clearToken() {
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_GIST_ID);
    }
    function clearGist() { localStorage.removeItem(KEY_GIST_ID); }

    // ── Local freshness stamp ────────────────────────────────────────────
    function getLocalMtime() { return localStorage.getItem(KEY_MTIME) || ''; }
    function setLocalMtime(v) { localStorage.setItem(KEY_MTIME, v || new Date().toISOString()); }
    function markLocalModified() {
        const now = new Date().toISOString();
        localStorage.setItem(KEY_MTIME, now);
        return now;
    }

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

    // ── Validation (used by the Connect buttons) ─────────────────────────
    // Verify the token alone by listing the user's gists — confirms it is valid
    // and carries gist scope, before the gist field is unlocked.
    async function validateToken(token) {
        if (!token) return { ok: false, error: 'Enter an access token.' };
        try {
            const res = await fetch(LIST_API, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });
            if (res.status === 401)                    return { ok: false, error: 'Invalid or expired token.' };
            if (res.status === 403 || res.status === 404) return { ok: false, error: 'Token lacks gist scope.' };
            if (!res.ok)                               return { ok: false, error: `GitHub error (${res.status}).` };
            return { ok: true };
        } catch (e) {
            return { ok: false, error: 'Network error reaching GitHub.' };
        }
    }

    // Verify the gist is reachable with the (already verified) token.
    async function validateGist(token, gistId) {
        if (!gistId) return { ok: false, error: 'Enter a Gist ID.' };
        try {
            const res = await request(gistId, token);
            if (res.status === 401) return { ok: false, error: 'Invalid or expired token.' };
            if (res.status === 404) return { ok: false, error: 'Gist not found, or token lacks gist scope.' };
            if (!res.ok)            return { ok: false, error: `GitHub error (${res.status}).` };
            return { ok: true };
        } catch (e) {
            return { ok: false, error: 'Network error reaching GitHub.' };
        }
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

    // "Has local data" means real budget entries worth protecting — NOT merely
    // some key being present. A fresh device writes currency_rates on first open
    // (FxRates.maybeRefresh) and may hold a default currency_config; counting
    // those as data made reconcile() think an empty device had something to keep,
    // so on connect it pushed an empty snapshot over a Gist full of real data.
    // Gating on entries means an entry-less device always pulls instead.
    function hasLocalData() {
        try {
            const d = JSON.parse(localStorage.getItem('dashboard_committed'));
            return Boolean(d && Array.isArray(d.entries) && d.entries.length);
        } catch {}
        return false;
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
    // with the newest data without ever silently dropping the newer side. Here
    // "local" means the device holds real budget entries (see hasLocalData) — a
    // device that has only opened the app (currency/rates but no entries) counts
    // as empty, so it can never push over a Gist that has data:
    //   • empty remote          → push local to seed it   ('seeded')
    //   • local empty, remote has data → adopt remote     ('pulled')
    //   • remote strictly newer → adopt remote            ('pulled')
    //   • local strictly newer  → push local              ('pushed')
    //   • same age              → nothing                 ('insync')
    //   • both empty            → nothing                 ('none')
    // Ties and un-comparable timestamps favour keeping local (least
    // destructive) — but only ever when local actually has entries.
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
        getConfig, hasToken, isConnected,
        saveToken, saveGist, clearToken, clearGist,
        getLocalMtime, markLocalModified,
        validateToken, validateGist,
        buildSnapshot, applySnapshot, hasLocalData,
        pull, push, reconcile,
        establishConnection: reconcile,   // Connect uses the same reconcile logic
        reconcileOnOpen:     reconcile,   // and so does per-session open
        backupNow, restoreNow,
    };
})();

window.GistBackup = GistBackup;
