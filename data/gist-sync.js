// gist-sync.js — remote backup of dashboard data to a GitHub Gist.
//
// Syncs only `dashboard_committed` (the same structure the Dashboard exports),
// wrapped with a `_meta.date` timestamp so open-time reconciliation can pick
// the newer of the local / remote copies ("newest wins").
//
// Config lives in localStorage and never leaves this browser:
//   gist_token       personal access token with `gist` scope
//   gist_id          id of the target gist
//   gist_local_mtime ISO timestamp of the last local commit (for reconciliation)

const GistSync = (() => {
    const KEY_TOKEN  = 'gist_token';
    const KEY_ID     = 'gist_id';
    const KEY_MTIME  = 'gist_local_mtime';
    const DATA_KEY   = 'dashboard_committed';
    const FILENAME   = 'dashboard.json';
    const API        = 'https://api.github.com/gists/';

    // ── Config ───────────────────────────────────────────────────────────
    function getConfig() {
        return {
            token:  localStorage.getItem(KEY_TOKEN) || '',
            gistId: localStorage.getItem(KEY_ID)    || '',
        };
    }

    function isConnected() {
        const { token, gistId } = getConfig();
        return Boolean(token && gistId);
    }

    function saveConfig(token, gistId) {
        localStorage.setItem(KEY_TOKEN, token);
        localStorage.setItem(KEY_ID, gistId);
    }

    function clearConfig() {
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_ID);
        // Keep gist_local_mtime — it still describes the local dataset's age.
    }

    // ── Local modification time ──────────────────────────────────────────
    function markLocalModified() {
        const now = new Date().toISOString();
        localStorage.setItem(KEY_MTIME, now);
        return now;
    }

    function getLocalMtime() {
        return localStorage.getItem(KEY_MTIME) || '';
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

    // ── Validate token + gist (used by the Connect button) ───────────────
    // Resolves { ok:true } if the gist is reachable with this token, or
    // { ok:false, error } with a human-readable reason otherwise.
    async function validate(token, gistId) {
        if (!token)  return { ok: false, error: 'Enter an access token.' };
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

    // ── Read file content out of a gist response ─────────────────────────
    async function readFile(gist) {
        const file = gist.files && gist.files[FILENAME];
        if (!file) return null; // gist exists but has no dashboard file yet
        // GitHub truncates inline content above ~1MB; fall back to raw_url.
        const raw = file.truncated ? await (await fetch(file.raw_url)).text() : file.content;
        try { return JSON.parse(raw); }
        catch { return null; }
    }

    // ── Pull remote data ─────────────────────────────────────────────────
    // Resolves { data, date } where data is the committed structure and date
    // is its _meta.date, or null if the remote has no usable data.
    async function pull() {
        const { token, gistId } = getConfig();
        if (!token || !gistId) return null;
        const res = await request(gistId, token);
        if (!res.ok) throw new Error(`Pull failed (${res.status})`);
        const parsed = await readFile(await res.json());
        if (!parsed) return null;
        const { _meta, ...data } = parsed;
        return { data, date: (_meta && _meta.date) || '' };
    }

    // ── Push local data ──────────────────────────────────────────────────
    // `committed` is the dashboard structure; `date` is its local mtime.
    async function push(committed, date) {
        const { token, gistId } = getConfig();
        if (!token || !gistId) return;
        const content = JSON.stringify({ ...committed, _meta: { date } }, null, 2);
        const res = await request(gistId, token, {
            method: 'PATCH',
            body: JSON.stringify({ files: { [FILENAME]: { content } } }),
        });
        if (!res.ok) throw new Error(`Push failed (${res.status})`);
    }

    // ── Local dataset helpers ────────────────────────────────────────────
    function getLocalData() {
        try { return JSON.parse(localStorage.getItem(DATA_KEY)); }
        catch { return null; }
    }

    function hasLocalData() {
        const d = getLocalData();
        return Boolean(d && Array.isArray(d.entries) && d.entries.length > 0);
    }

    // ── Establish the link (smart connect) ───────────────────────────────
    // Runs once when the user clicks Connect. Leaves both sides consistent
    // with the newest data, without ever silently dropping the newer side:
    //   • empty remote          → push local to seed it        ('seeded')
    //   • remote strictly newer → adopt remote                 ('pulled')
    //   • local newer / a tie   → push local                   ('pushed')
    //   • both empty            → nothing                      ('none')
    // Ties and un-comparable timestamps favour keeping local (least
    // destructive), since a reader losing an update is worse than a re-push.
    async function establishConnection() {
        if (!isConnected()) return { action: 'none' };
        const remote     = await pull();
        const localMtime = getLocalMtime();
        const local      = hasLocalData();

        if (!remote) {
            if (!local) return { action: 'none' };
            const date = localMtime || markLocalModified();
            await push(getLocalData(), date);
            return { action: 'seeded' };
        }

        let remoteNewer;
        if (!local)                          remoteNewer = true;   // nothing to lose locally
        else if (!localMtime || !remote.date) remoteNewer = false; // can't prove remote newer → keep local
        else                                  remoteNewer = remote.date > localMtime;

        if (remoteNewer) {
            localStorage.setItem(DATA_KEY, JSON.stringify(remote.data));
            localStorage.setItem(KEY_MTIME, remote.date || new Date().toISOString());
            return { action: 'pulled' };
        }
        const date = localMtime || markLocalModified();
        await push(getLocalData(), date);
        return { action: 'pushed' };
    }

    // ── Reconcile on app open (newest wins) ──────────────────────────────
    // Pulls remote; if it is newer than the local copy (or local is absent),
    // overwrites dashboard_committed and adopts the remote timestamp.
    // Returns true if local data was replaced.
    async function reconcileOnOpen() {
        if (!isConnected()) return false;
        let remote;
        try { remote = await pull(); }
        catch (e) { console.warn('[gist] pull on open failed:', e.message); return false; }
        if (!remote) return false;

        const localMtime = getLocalMtime();
        const remoteNewer = !localMtime || (remote.date && remote.date > localMtime);
        if (!remoteNewer) return false;

        localStorage.setItem(DATA_KEY, JSON.stringify(remote.data));
        localStorage.setItem(KEY_MTIME, remote.date || new Date().toISOString());
        console.log('[gist] adopted remote data from', remote.date);
        return true;
    }

    return {
        FILENAME,
        getConfig, isConnected, saveConfig, clearConfig,
        markLocalModified, getLocalMtime, getLocalData, hasLocalData,
        validate, pull, push, establishConnection, reconcileOnOpen,
    };
})();

window.GistSync = GistSync;
