function initTimeTracking() {

    // ── Shared helpers ─────────────────────────────────────────────────────
    function pad(n) { return String(n).padStart(2, '0'); }

    function dateKey(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function formatDateDMY(date) {
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    }

    function formatDuration(ms) {
        const s = Math.floor(ms / 1000);
        return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    }

    function formatShort(ms) {
        const totalMin = Math.floor(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
    }

    const MONTH_NAMES    = ['January','February','March','April','May','June',
                            'July','August','September','October','November','December'];
    const now            = new Date();

    // ── Storage helpers ────────────────────────────────────────────────────
    function loadEntries()        { return JSON.parse(localStorage.getItem('tt_entries')  || '{}'); }
    function saveEntries(e)       { localStorage.setItem('tt_entries',  JSON.stringify(e)); }
    function loadSessions()       { return JSON.parse(localStorage.getItem('tt_sessions') || '{}'); }
    function saveSessions(s)      { localStorage.setItem('tt_sessions', JSON.stringify(s)); }
    function loadSettings()       { return JSON.parse(localStorage.getItem('tt_settings') || '{}'); }

    // ── Timer ──────────────────────────────────────────────────────────────
    const display    = document.getElementById('tt-display');
    const btnStart   = document.getElementById('tt-btn-start');
    const btnSubmit  = document.getElementById('tt-btn-submit');
    const sessionLbl = document.getElementById('tt-session-label');
    let running   = false;
    let startTime = null;
    let elapsed   = 0;
    let ticker    = null;

    function stopTimer() {
        if (running) {
            running  = false;
            elapsed += Date.now() - startTime;
            clearInterval(ticker);
            btnStart.textContent = 'Start';
            btnStart.classList.remove('running');
            display.classList.remove('running');
        }
    }

    function resetTimer() {
        elapsed = 0;
        display.textContent = '00:00:00';
    }

    btnStart.addEventListener('click', () => {
        if (!running) {
            running   = true;
            startTime = Date.now();
            ticker    = setInterval(() => {
                display.textContent = formatDuration(elapsed + (Date.now() - startTime));
            }, 1000);
            btnStart.textContent = 'Stop';
            btnStart.classList.add('running');
            display.classList.add('running');
        } else {
            stopTimer();
        }
    });

    btnSubmit.addEventListener('click', () => {
        const durationMs = elapsed + (running ? Date.now() - startTime : 0);
        if (durationMs < 1000) return; // nothing meaningful to submit

        stopTimer();

        const todayKey   = dateKey(new Date());
        const label      = sessionLbl.value.trim();
        const hours      = Math.round((durationMs / 3600000) * 100) / 100;

        // Merge into calendar entry
        const entries    = loadEntries();
        const existing   = entries[todayKey] || { hours: 0, tasks: [] };
        existing.hours   = Math.round((existing.hours + hours) * 100) / 100;
        if (label && !existing.tasks.includes(label)) existing.tasks.push(label);
        entries[todayKey] = existing;
        saveEntries(entries);

        // Reset
        resetTimer();
        sessionLbl.value = '';

        // Re-render
        renderCalendar();
    });

    // ── Settings ───────────────────────────────────────────────────────────
    const freelancerInput = document.getElementById('tt-freelancer');
    const companyInput    = document.getElementById('tt-company');

    function persistSettings() {
        localStorage.setItem('tt_settings', JSON.stringify({
            freelancer: freelancerInput.value.trim(),
            company:    companyInput.value.trim(),
        }));
    }

    (function applySettings() {
        const s = loadSettings();
        freelancerInput.value = s.freelancer || '';
        companyInput.value    = s.company    || '';
    })();

    [freelancerInput, companyInput].forEach(input => {
        input.addEventListener('blur', persistSettings);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
    });

    // ── Calendar ───────────────────────────────────────────────────────────
    let calYear  = now.getFullYear();
    let calMonth = now.getMonth();

    const calContainer = document.getElementById('tt-calendar');
    const calLabel     = document.getElementById('tt-cal-label');
    const btnCalPrev   = document.getElementById('tt-cal-prev');
    const btnCalNext   = document.getElementById('tt-cal-next');

    function getTimesheetWeeks(year, month) {
        const firstDay = new Date(year, month, 1);
        const toMonday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        const start    = new Date(year, month, 1 - toMonday);
        const lastDay  = new Date(year, month + 1, 0);
        const toSunday = lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay();
        const end      = new Date(year, month + 1, toSunday);

        const weeks = [];
        const cur   = new Date(start);
        while (cur <= end) {
            const week = [];
            for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
            weeks.push(week);
        }
        return weeks;
    }

    function renderCalendar() {
        const entries  = loadEntries();
        const todayKey = dateKey(now);
        const weeks    = getTimesheetWeeks(calYear, calMonth);

        calLabel.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;

        const prefix = `${calYear}-${pad(calMonth + 1)}-`;
        const monthTotalHours = Object.entries(entries)
            .filter(([k]) => k.startsWith(prefix))
            .reduce((sum, [, e]) => sum + (e.hours || 0), 0);
        const monthTotalEl = document.getElementById('tt-month-total');
        if (monthTotalEl) monthTotalEl.textContent = `${monthTotalHours}h`;

        const headers = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<div class="tt-cal-weekday">${d}</div>`).join('');
        let daysHtml  = '';

        weeks.forEach(week => {
            week.forEach(date => {
                const key       = dateKey(date);
                const entry     = entries[key];
                const isOther   = date.getMonth() !== calMonth;
                const isToday   = key === todayKey;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                let cls = 'tt-cal-day';
                if (isOther)   cls += ' tt-cal-day--other-month';
                if (isToday)   cls += ' tt-cal-day--today';
                if (isWeekend) cls += ' tt-cal-day--weekend';

                const hoursHtml = entry && entry.hours > 0
                    ? `<span class="tt-cal-day-hours">${entry.hours}h</span>` : '';
                const tasksHtml = entry && entry.tasks && entry.tasks.length
                    ? `<span class="tt-cal-day-tasks">${entry.tasks.join(', ')}</span>` : '';

                daysHtml += `<button class="${cls}" data-key="${key}">
                    <span class="tt-cal-day-num">${date.getDate()}</span>
                    ${hoursHtml}${tasksHtml}
                </button>`;
            });
        });

        calContainer.innerHTML = `
            <div class="tt-cal-weekdays">${headers}</div>
            <div class="tt-cal-days">${daysHtml}</div>`;

        calContainer.querySelectorAll('.tt-cal-day').forEach(btn => {
            btn.addEventListener('click', () => openModal(btn.dataset.key));
        });
    }

    btnCalPrev.addEventListener('click', () => {
        if (--calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
    });

    btnCalNext.addEventListener('click', () => {
        if (++calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
    });

    // ── File panel toggle ──────────────────────────────────────────────────
    const fileToggle = document.getElementById('tt-file-toggle');
    const filePanel  = document.getElementById('tt-file-panel');

    fileToggle.addEventListener('click', () => {
        const isOpen = filePanel.classList.toggle('open');
        fileToggle.classList.toggle('active', isOpen);
    });

    document.addEventListener('click', (e) => {
        if (filePanel.classList.contains('open') &&
            !filePanel.contains(e.target) &&
            e.target !== fileToggle) {
            filePanel.classList.remove('open');
            fileToggle.classList.remove('active');
        }
    });

    // ── Calendar JSON export ───────────────────────────────────────────────
    document.getElementById('tt-export-json').addEventListener('click', () => {
        const data = { entries: loadEntries(), sessions: loadSessions() };
        const filename = `timesheet-${calYear}-${pad(calMonth + 1)}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    });

    // ── Calendar JSON import ───────────────────────────────────────────────
    document.getElementById('tt-import-json').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.entries)  saveEntries(data.entries);
                if (data.sessions) saveSessions(data.sessions);
                renderCalendar();
            } catch (err) { console.error('Import failed:', err); }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    renderCalendar();

    // ── Modal ──────────────────────────────────────────────────────────────
    const backdrop     = document.getElementById('tt-modal-backdrop');
    const modalTitle   = document.getElementById('tt-modal-date-label');
    const modalHours   = document.getElementById('tt-modal-hours');
    const modalTasks   = document.getElementById('tt-modal-tasks');
    const btnModalSave = document.getElementById('tt-modal-save');
    const btnModalDel  = document.getElementById('tt-modal-delete');
    const btnModalCanc = document.getElementById('tt-modal-cancel');

    let activeKey = null;

    function openModal(key) {
        activeKey = key;
        const entry   = loadEntries()[key] || { hours: 0, tasks: [] };
        const [y,m,d] = key.split('-').map(Number);
        modalTitle.textContent = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        modalHours.value = entry.hours || '';
        modalTasks.value = (entry.tasks || []).join('\n');
        backdrop.classList.add('open');
        modalHours.focus();
    }

    function closeModal() {
        backdrop.classList.remove('open');
        activeKey = null;
    }

    btnModalSave.addEventListener('click', () => {
        if (!activeKey) return;
        const entries = loadEntries();
        entries[activeKey] = {
            hours: parseFloat(modalHours.value) || 0,
            tasks: modalTasks.value.split('\n').map(t => t.trim()).filter(Boolean),
        };
        saveEntries(entries);
        closeModal();
        renderCalendar();
    });

    btnModalDel.addEventListener('click', () => {
        if (!activeKey) return;
        const entries = loadEntries();
        delete entries[activeKey];
        saveEntries(entries);
        closeModal();
        renderCalendar();
    });

    btnModalCanc.addEventListener('click', closeModal);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });

    // ── PDF Export ─────────────────────────────────────────────────────────
    const JSPDF_CDN     = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    const AUTOTABLE_CDN = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';

    document.getElementById('tt-export-pdf').addEventListener('click', () => {
        const load = window.jspdf
            ? Promise.resolve()
            : loadScript(JSPDF_CDN).then(() => loadScript(AUTOTABLE_CDN));
        load.then(generatePDF);
    });

    function generatePDF() {
        const { jsPDF } = window.jspdf;
        const doc       = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const settings  = loadSettings();
        const entries   = loadEntries();
        const weeks     = getTimesheetWeeks(calYear, calMonth);

        const margin    = 14;
        const pageWidth = 297 - margin * 2;
        const labelColW = 20;
        const dayColW   = (pageWidth - labelColW) / 7;

        const COLOR_SALMON     = [244, 177, 131];
        const COLOR_SALMON_WKD = [252, 228, 214];
        const COLOR_HOURS      = [255, 204, 153];
        const COLOR_HOURS_WKD  = [255, 235, 210];
        const COLOR_GREY_FILL  = [217, 217, 217];
        const COLOR_WHITE      = [255, 255, 255];
        const COLOR_GREEN      = [198, 239, 206];
        const COLOR_BLACK      = [0, 0, 0];
        const COLOR_VIOLET     = [112, 48, 160];

        let y = margin;

        doc.setFont('helvetica', 'bold');   doc.setFontSize(14);
        doc.text('Time Sheet', margin, y);  y += 7;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.text(`Freelancer details: ${settings.freelancer || '—'}`, margin, y); y += 5.5;
        doc.text(settings.company || '—', margin, y);                             y += 5.5;
        doc.text(`Year: ${calYear}`, margin, y);                                  y += 5.5;
        doc.text(`Month: ${MONTH_NAMES[calMonth]}`, margin, y);                   y += 9;

        const colStyles = { 0: { cellWidth: labelColW } };
        for (let i = 1; i <= 7; i++) colStyles[i] = { cellWidth: dayColW };

        weeks.forEach(week => {
            const dayRow   = ['Day'];
            const hoursRow = ['Hours'];
            const tasksRow = ['Tasks'];

            week.forEach(date => {
                const entry = entries[dateKey(date)] || { hours: 0, tasks: [] };
                dayRow.push(formatDateDMY(date));
                hoursRow.push(entry.hours > 0 ? entry.hours : 0);
                tasksRow.push((entry.tasks || []).join('\n'));
            });

            doc.autoTable({
                startY: y, margin: { left: margin, right: margin },
                tableWidth: pageWidth, head: [], body: [dayRow, hoursRow, tasksRow],
                theme: 'grid', columnStyles: colStyles,
                styles: {
                    fontSize: 9.5, cellPadding: { top: 1.75, right: 3, bottom: 1.75, left: 3 },
                    overflow: 'linebreak', textColor: [30, 30, 30],
                    lineColor: COLOR_BLACK, lineWidth: 0.3,
                },
                didParseCell(data) {
                    if (data.column.index === 0) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = COLOR_VIOLET;
                        data.cell.styles.textColor = COLOR_WHITE;
                        return;
                    }
                    const date         = week[data.column.index - 1];
                    const isWeekend    = date.getDay() === 0 || date.getDay() === 6;
                    const isOtherMonth = date.getMonth() !== calMonth;
                    const isDimmed     = isWeekend || isOtherMonth;
                    const hasHours     = (entries[dateKey(date)] || {}).hours > 0;

                    if (data.row.index === 0) {
                        data.cell.styles.fillColor = hasHours ? COLOR_GREY_FILL
                                                   : isDimmed ? COLOR_SALMON_WKD : COLOR_SALMON;
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.halign    = 'center';
                    } else if (data.row.index === 1) {
                        data.cell.styles.fillColor = isDimmed ? COLOR_HOURS_WKD : COLOR_HOURS;
                        data.cell.styles.halign    = 'right';
                    } else {
                        data.cell.styles.fillColor    = COLOR_WHITE;
                    }
                },
            });

            y = doc.lastAutoTable.finalY + 5;
        });

        const totalHours = weeks.flat().reduce((sum, date) => {
            return sum + ((entries[dateKey(date)] || {}).hours || 0);
        }, 0);

        const emptyColW = labelColW + dayColW * 6;
        doc.autoTable({
            startY: y, margin: { left: margin, right: margin },
            tableWidth: pageWidth, head: [],
            body: [['', 'Total'], ['', totalHours]],
            theme: 'grid',
            columnStyles: { 0: { cellWidth: emptyColW }, 1: { cellWidth: dayColW } },
            styles: {
                fontSize: 8.5, cellPadding: { top: 1.5, right: 3, bottom: 1.5, left: 3 },
                textColor: [30, 30, 30], lineColor: COLOR_BLACK, lineWidth: 0.3,
            },
            didParseCell(data) {
                if (data.column.index === 1) {
                    if (data.row.index === 0) {
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.fillColor = COLOR_GREEN;
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.halign    = 'right';
                    }
                }
            },
        });

        doc.save(`${calYear}_${MONTH_NAMES[calMonth]}_TimeSheet.pdf`);
    }

    window.viewReady?.();
}
