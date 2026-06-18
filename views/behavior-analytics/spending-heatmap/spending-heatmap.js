function initSpendingHeatmap() {
    const STORAGE_KEY = 'dashboard_committed';
    const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const COL_PX      = 23;

    const now = new Date();
    let year    = now.getFullYear();
    let quarter = Math.floor(now.getMonth() / 3) + 1;

    const yearUpBtn   = document.getElementById('spending-year-up');
    const yearDownBtn = document.getElementById('spending-year-down');
    const yearSlots   = document.getElementById('spending-year-slots');
    const qContainer  = document.getElementById('spending-quarter-btns');
    const grid        = document.getElementById('spending-heatmap-grid');
    const monthLabels = document.getElementById('spending-month-labels');

    function dateStr(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function updateYearPicker() {
        const cy = new Date().getFullYear();
        yearUpBtn.disabled   = false;
        yearDownBtn.disabled = year >= cy;

        yearSlots.innerHTML = '';
        for (let offset = -2; offset <= 2; offset++) {
            const slotYear = year + offset;
            const slot = document.createElement('div');
            slot.className   = 'year-slot';
            slot.textContent = slotYear;
            if (offset === 0) {
                slot.dataset.selected = '';
            } else if (slotYear > cy) {
                slot.dataset.future = '';
            } else {
                slot.dataset.offset = Math.abs(offset);
                slot.addEventListener('click', () => { year += offset; render(); });
            }
            yearSlots.appendChild(slot);
        }
    }

    function updateQButtons() {
        const cy = new Date().getFullYear();
        const cq = Math.floor(new Date().getMonth() / 3) + 1;
        qContainer.querySelectorAll('.quarter-btn').forEach(btn => {
            const q = +btn.dataset.q;
            btn.classList.toggle('active', q === quarter);
            btn.disabled = year === cy && q > cq;
        });
    }

    function renderGrid() {
        const startMonth = (quarter - 1) * 3;
        const startDate  = new Date(year, startMonth, 1);
        const endDate    = new Date(year, startMonth + 3, 0);
        const totalDays  = Math.round((endDate - startDate) / 86400000) + 1;
        const startDow   = (startDate.getDay() + 6) % 7;

        const totals = {};
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                (JSON.parse(raw).entries || [])
                    .filter(e => e.type === 'expenses')
                    .forEach(e => {
                        if (!e.date) return;
                        const d = new Date(e.date + 'T00:00:00');
                        if (d >= startDate && d <= endDate)
                            totals[e.date] = (totals[e.date] || 0) + e.amount;
                    });
            }
        } catch (_) {}

        const vals = Object.values(totals).filter(v => v > 0).sort((a, b) => a - b);
        const thr  = vals.length
            ? [vals[Math.floor(0.25*(vals.length-1))], vals[Math.floor(0.5*(vals.length-1))], vals[Math.floor(0.75*(vals.length-1))]]
            : [Infinity, Infinity, Infinity];

        function level(amount) {
            if (!amount)         return 0;
            if (amount < thr[0]) return 1;
            if (amount < thr[1]) return 2;
            if (amount < thr[2]) return 3;
            return 4;
        }

        grid.innerHTML        = '';
        monthLabels.innerHTML = '';
        const totalCells = startDow + totalDays;

        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell spending-cell';
            if (i < startDow) {
                cell.dataset.level    = '0';
                cell.style.visibility = 'hidden';
            } else {
                const dayIndex = i - startDow;
                const date     = new Date(year, startMonth, dayIndex + 1);
                const ds       = dateStr(date);
                const amount   = totals[ds] || 0;
                cell.dataset.level = level(amount);
                cell.title = amount > 0 ? `${ds}  ·  $${amount.toFixed(2)}` : ds;
                if (date.getDate() === 1) {
                    const lbl       = document.createElement('span');
                    lbl.className   = 'heatmap-month-label';
                    lbl.textContent = MONTHS[date.getMonth()];
                    lbl.style.left  = (Math.floor(i / 7) * COL_PX) + 'px';
                    monthLabels.appendChild(lbl);
                }
            }
            grid.appendChild(cell);
        }
    }

    function render(notifySync = true) {
        updateYearPicker();
        updateQButtons();
        renderGrid();
        if (notifySync && typeof onHeatmapPeriodChange === 'function') {
            onHeatmapPeriodChange('spending', year, quarter);
        }
    }

    window.setSpendingPeriod = function(y, q) {
        year    = y;
        quarter = q;
        render(false);
    };

    yearUpBtn.addEventListener('click',   () => { year--; render(); });
    yearDownBtn.addEventListener('click', () => { year++; render(); });

    qContainer.querySelectorAll('.quarter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            quarter = +btn.dataset.q;
            render();
        });
    });

    render(false);
}
