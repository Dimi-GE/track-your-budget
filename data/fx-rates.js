// fx-rates.js — approximate currency conversion for savings totals.
//
// Visual-phase currency support only records a code per entry; this layer adds
// the conversion used by the "≈ regional total" on Home's Total Saved card and
// the Dashboard Savings card. Nothing else in the app is converted (Flow and
// analytics stay all-regional, since only Savings → Other can be foreign).
//
// Rates are stored as "regional value of 1 unit" (regionalPerUnit): to convert
// an amount in currency X to the regional currency, multiply by rate[X].
//   • Live rates come from a free, no-key API (open.er-api.com), keyed to the
//     current regional currency as the base.
//   • A manual override per currency wins over the live rate.
// Rates are recomputed against the regional currency; changing the regional
// currency invalidates the cached live rates until the next Refresh.
//
// localStorage: currency_rates = { base, updated, rates:{X:regPerUnit}, overrides:{X:regPerUnit} }

const FxRates = (() => {
    const KEY        = 'currency_rates';
    const API        = 'https://open.er-api.com/v6/latest/';
    const MAX_AGE_MS = 12 * 60 * 60 * 1000;   // refresh at most ~twice a day

    function regional() {
        return (typeof getRegionalCurrency === 'function') ? getRegionalCurrency() : 'USD';
    }

    function blank(base) { return { base, updated: null, rates: {}, overrides: {} }; }

    // Cached rates, but only if they were computed against the current regional
    // currency — otherwise they are stale and treated as absent.
    function getRates() {
        let r = null;
        try { r = JSON.parse(localStorage.getItem(KEY)); } catch {}
        const base = regional();
        if (!r || r.base !== base) return blank(base);
        return { base, updated: r.updated || null, rates: r.rates || {}, overrides: r.overrides || {} };
    }

    function saveRates(r) { localStorage.setItem(KEY, JSON.stringify(r)); }

    // regionalPerUnit for a code: manual override > live rate > (1 for regional).
    // Returns null when no rate is known.
    function effectiveRate(code) {
        if (code === regional()) return 1;
        const r = getRates();
        if (r.overrides[code] != null) return r.overrides[code];
        if (r.rates[code]     != null) return r.rates[code];
        return null;
    }

    function hasRate(code) { return effectiveRate(code) != null; }

    // Convert an amount in `code` to the regional currency. An unknown rate
    // falls back to face value (rate 1) — the total is approximate by design.
    function convertToRegional(amount, code) {
        const rate = effectiveRate(code);
        return rate == null ? amount : amount * rate;
    }

    function setOverride(code, value) {
        const r = getRates();
        const n = parseFloat(value);
        if (value === '' || value == null || isNaN(n) || n <= 0) delete r.overrides[code];
        else r.overrides[code] = n;
        saveRates(r);
    }

    // Fetch fresh live rates for the current regional base, preserving overrides.
    async function refresh() {
        const base = regional();
        try {
            const res = await fetch(API + encodeURIComponent(base));
            if (!res.ok) return { ok: false, error: `Rates service error (${res.status}).` };
            const data = await res.json();
            if (data.result !== 'success' || !data.rates) {
                return { ok: false, error: `No live rates available for ${base}.` };
            }
            const rates = {};
            Object.keys(data.rates).forEach(code => {
                const perRegional = data.rates[code];       // units of X per 1 regional
                if (perRegional > 0) rates[code] = 1 / perRegional;  // regionalPerUnit
            });
            const prev    = getRates();
            const updated = data.time_last_update_utc || new Date().toISOString();
            saveRates({ base, updated, rates, overrides: prev.overrides });
            return { ok: true, updated };
        } catch (e) {
            return { ok: false, error: 'Network error reaching the rates service.' };
        }
    }

    function isStale() {
        const r = getRates();
        if (!r.updated) return true;
        const t = Date.parse(r.updated);
        return isNaN(t) || (Date.now() - t) > MAX_AGE_MS;
    }

    async function maybeRefresh() {
        if (!isStale()) return { ok: true, cached: true };
        return refresh();
    }

    // Net savings converted to regional: savings deposits (each by their own
    // currency) minus reserve withdrawals (regional). Mirrors the raw
    // net-reserve math used by the Savings/Total Saved figures.
    function netSavingsRegional(entries) {
        const base = regional();
        let total = 0;
        entries.forEach(e => {
            if (e.type === 'savings') {
                total += convertToRegional(e.amount, e.currency || base);
            } else if (typeof isSavingsWithdrawal === 'function' && isSavingsWithdrawal(e)) {
                total -= convertToRegional(e.amount, e.currency || base);
            }
        });
        return total;
    }

    return {
        getRates, saveRates, effectiveRate, hasRate, convertToRegional,
        setOverride, refresh, maybeRefresh, isStale, netSavingsRegional,
    };
})();

window.FxRates = FxRates;
