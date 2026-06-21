function initSettings() {
    const actionEl = document.getElementById('reset-action');

    function showResetButton() {
        actionEl.innerHTML = '<button class="btn-reset">Reset</button>';
        actionEl.querySelector('.btn-reset').addEventListener('click', showConfirm);
    }

    function showConfirm() {
        actionEl.innerHTML = `
            <div class="btn-confirm-row">
                <button class="btn-confirm-yes">Confirm reset</button>
                <button class="btn-confirm-no">Cancel</button>
            </div>
        `;
        actionEl.querySelector('.btn-confirm-yes').addEventListener('click', doReset);
        actionEl.querySelector('.btn-confirm-no').addEventListener('click', showResetButton);
    }

    function doReset() {
        ['dashboard_committed', 'forecast_settings', 'tt_entries', 'tt_sessions', 'tt_settings']
            .forEach(k => localStorage.removeItem(k));
        sessionStorage.setItem('activeView', 'home');
        location.reload();
    }

    showResetButton();
}
