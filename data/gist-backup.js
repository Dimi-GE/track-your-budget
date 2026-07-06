// gist-backup.js — full-snapshot remote backup to a *dedicated* GitHub Gist.
//
// Distinct from gist-sync.js: that keeps the live Dashboard data continuously
// reconciled ("newest wins"); this is a manual, all-data snapshot you push and
// pull with explicit Backup / Restore buttons — the remote twin of Settings'
// "Backup All Data" file. It reuses the same GitHub token (gist scope) but a
// separate Gist, so the two never fight over one file.
//
// Config in localStorage:
//   gist_token       shared with gist-sync (same PAT, gist scope)
//   gist_backup_id   id of the dedicated backup gist
//
// Credentials (tokens / gist ids / mtime) are NEVER written into the backup
// payload — only app-data keys.

const GistBackup = (() => {
    const KEY_TOKEN     = 'gist_token';        // shared with gist-sync.js
    const KEY_BACKUP_ID = 'gist_backup_id';
    const FILENAME      = 'financial-backup.json';
    const API           = 'https://api.github.com/gists/';

    // App-data keys included in a full snapshot (same set as Settings' local
    // "Backup All Data" action). Credential keys are intentionally excluded.
    const KEYS = ['dashboard_committed', 'currency_config', 'forecast_settings',
                  'tt_entries', 'tt_sessions', 'tt_settings'];

    function getConfig() {
        return {
            token:  localStorage.getItem(KEY_TOKEN)     || '',
            gistId: localStorage.getItem(KEY_BACKUP_ID) || '',
        };
    }

    function saveConfig(token, gistId) {
        localStorage.setItem(KEY_TOKEN, token);
        localStorage.setItem(KEY_BACKUP_ID, gistId);
    }

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

    // Map an HTTP status to a human-readable reason, or '' when ok.
    function statusError(status) {
        if (status === 401) return 'Invalid or expired token.';
        if (status === 404) return 'Gist not found, or token lacks gist scope.';
        return `GitHub error (${status}).`;
    }

    // Build the same structure Settings' local "Backup All Data" writes.
    function buildSnapshot() {
        const snap = { _meta: { version: 1, date: new Date().toISOString() } };
        KEYS.forEach(k => {
            const val = localStorage.getItem(k);
            if (val !== null) { try { snap[k] = JSON.parse(val); } catch {} }
        });
        return snap;
    }

    // Push a full snapshot to the backup gist.
    // Resolves { ok:true, date } or { ok:false, error }.
    async function backup(token, gistId) {
        if (!token)  return { ok: false, error: 'Enter an access token.' };
        if (!gistId) return { ok: false, error: 'Enter a backup Gist ID.' };
        const snap    = buildSnapshot();
        const content = JSON.stringify(snap, null, 2);
        try {
            const res = await request(gistId, token, {
                method: 'PATCH',
                body: JSON.stringify({ files: { [FILENAME]: { content } } }),
            });
            if (!res.ok) return { ok: false, error: statusError(res.status) };
            saveConfig(token, gistId);
            return { ok: true, date: snap._meta.date };
        } catch (e) {
            return { ok: false, error: 'Network error reaching GitHub.' };
        }
    }

    // Fetch the snapshot from the backup gist (does not apply it).
    // Resolves { ok:true, data } or { ok:false, error }.
    async function fetchSnapshot(token, gistId) {
        if (!token)  return { ok: false, error: 'Enter an access token.' };
        if (!gistId) return { ok: false, error: 'Enter a backup Gist ID.' };
        try {
            const res = await request(gistId, token);
            if (!res.ok) return { ok: false, error: statusError(res.status) };
            const gist = await res.json();
            const file = gist.files && gist.files[FILENAME];
            if (!file) return { ok: false, error: 'No backup found in this Gist yet.' };
            // GitHub truncates inline content above ~1MB; fall back to raw_url.
            const raw = file.truncated ? await (await fetch(file.raw_url)).text() : file.content;
            let data;
            try { data = JSON.parse(raw); }
            catch { return { ok: false, error: 'Backup file is not valid JSON.' }; }
            saveConfig(token, gistId);
            return { ok: true, data };
        } catch (e) {
            return { ok: false, error: 'Network error reaching GitHub.' };
        }
    }

    // Apply a fetched snapshot to localStorage (full replace of the app-data
    // keys it contains). Bumps the live-sync mtime so a subsequent open-time
    // reconcile treats this restored data as the freshest local state instead
    // of overwriting it from the live-sync gist.
    function applySnapshot(data) {
        KEYS.forEach(k => {
            if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]));
        });
        if (window.GistSync?.markLocalModified) GistSync.markLocalModified();
    }

    return { KEYS, FILENAME, getConfig, saveConfig, buildSnapshot, backup, fetchSnapshot, applySnapshot };
})();

window.GistBackup = GistBackup;
