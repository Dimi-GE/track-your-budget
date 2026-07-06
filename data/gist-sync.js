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
    const CURRENCY_KEY = 'currency_config';
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
    // Resolves { data, date } where data is a bundle { committed, currency }
    // and date is its _meta.date, or null if the remote has no usable data.
    // Back-compat: gists written before the bundle stored the committed object
    // at the top level (its hallmark is a top-level `entries` array).
    async function pull() {
        const { token, gistId } = getConfig();
        if (!token || !gistId) return null;
        const res = await request(gistId, token);
        if (!res.ok) throw new Error(`Pull failed (${res.status})`);
        const parsed = await readFile(await res.json());
        if (!parsed) return null;
        const { _meta, ...rest } = parsed;
        const date = (_meta && _meta.date) || '';
        const bundle = ('committed' in rest)
            ? { committed: rest.committed || null, currency: rest.currency_config || null }
            : { committed: rest, currency: null };          // legacy shape
        return { data: bundle, date };
    }

    // ── Push local data ──────────────────────────────────────────────────
    // `bundle` is { committed, currency }; `date` is its local mtime. The
    // currency config is only written when present, so an absent one never
    // clobbers a remote copy with null.
    async function push(bundle, date) {
        const { token, gistId } = getConfig();
        if (!token || !gistId) return;
        const payload = { committed: bundle.committed, _meta: { date } };
        if (bundle.currency) payload.currency_config = bundle.currency;
        const content = JSON.stringify(payload, null, 2);
        const res = await request(gistId, token, {
            method: 'PATCH',
            body: JSON.stringify({ files: { [FILENAME]: { content } } }),
        });
        if (!res.ok) throw new Error(`Push failed (${res.status})`);
    }

    // ── Local dataset helpers ────────────────────────────────────────────
    // A bundle bundles everything that should travel together across devices:
    // the committed dashboard data plus the currency configuration.
    function getLocalBundle() {
        let committed = null, currency = null;
        try { committed = JSON.parse(localStorage.getItem(DATA_KEY)); } catch {}
        try { currency  = JSON.parse(localStorage.getItem(CURRENCY_KEY)); } catch {}
        return { committed, currency };
    }

    function applyRemoteBundle(bundle) {
        if (bundle.committed) localStorage.setItem(DATA_KEY, JSON.stringify(bundle.committed));
        if (bundle.currency)  localStorage.setItem(CURRENCY_KEY, JSON.stringify(bundle.currency));
    }

    function getLocalData() {
        return getLocalBundle().committed;
    }

    function hasLocalData() {
        const d = getLocalData();
        return Boolean(d && Array.isArray(d.entries) && d.entries.length > 0);
    }

    // Convenience: mark modified and push the current local bundle. Used by
    // Settings when currency config changes outside a Dashboard commit.
    async function pushLocal() {
        if (!isConnected()) return;
        const date = markLocalModified();
        await push(getLocalBundle(), date);
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
            await push(getLocalBundle(), date);
            return { action: 'seeded' };
        }

        let remoteNewer;
        if (!local)                          remoteNewer = true;   // nothing to lose locally
        else if (!localMtime || !remote.date) remoteNewer = false; // can't prove remote newer → keep local
        else                                  remoteNewer = remote.date > localMtime;

        if (remoteNewer) {
            applyRemoteBundle(remote.data);
            localStorage.setItem(KEY_MTIME, remote.date || new Date().toISOString());
            return { action: 'pulled' };
        }
        const date = localMtime || markLocalModified();
        await push(getLocalBundle(), date);
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

        applyRemoteBundle(remote.data);
        localStorage.setItem(KEY_MTIME, remote.date || new Date().toISOString());
        console.log('[gist] adopted remote data from', remote.date);
        return true;
    }

    return {
        FILENAME,
        getConfig, isConnected, saveConfig, clearConfig,
        markLocalModified, getLocalMtime, getLocalData, getLocalBundle, hasLocalData,
        validate, pull, push, pushLocal, establishConnection, reconcileOnOpen,
    };
})();

window.GistSync = GistSync;
