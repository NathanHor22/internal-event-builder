const ExportPage = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div><h2 class="page-title">Export</h2><p class="page-subtitle">Download your content plan</p></div>
            </div>
            <div class="form-group" style="max-width:400px;margin-bottom:24px">
                <label class="form-label">Select Event</label>
                <select class="form-input" id="export-event-select"><option value="">Loading events...</option></select>
            </div>
            <div id="export-options" style="display:none">
                <div class="export-options">
                    <div class="card export-card" onclick="ExportPage.doExport('csv')">
                        <div class="export-card-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
                        <div class="export-card-name">CSV</div>
                        <div class="export-card-desc">Spreadsheet-compatible comma-separated values</div>
                    </div>
                    <div class="card export-card" onclick="ExportPage.doExport('excel')">
                        <div class="export-card-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--info)" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><rect x="8" y="12" width="8" height="6" rx="1"/></svg></div>
                        <div class="export-card-name">Excel (.xlsx)</div>
                        <div class="export-card-desc">Formatted spreadsheet with event overview and content</div>
                    </div>
                    <div class="card export-card" onclick="ExportPage.doExport('pdf')">
                        <div class="export-card-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg></div>
                        <div class="export-card-name">PDF Report</div>
                        <div class="export-card-desc">Formatted content plan document</div>
                    </div>
                </div>
            </div>
        `;

        try {
            const events = await API.listEvents();
            const sel = document.getElementById('export-event-select');
            sel.innerHTML = '<option value="">Select an event...</option>' +
                events.map(e => `<option value="${e.id}">${esc(e.name)} (${e.content_count || 0} items)</option>`).join('');
            sel.onchange = () => {
                document.getElementById('export-options').style.display = sel.value ? 'block' : 'none';
            };
        } catch (err) { Toast.error(err.message); }
    },

    doExport(format) {
        const eventId = document.getElementById('export-event-select').value;
        if (!eventId) { Toast.error('Select an event first'); return; }
        let url;
        switch (format) {
            case 'csv': url = API.exportCSV(eventId); break;
            case 'excel': url = API.exportExcel(eventId); break;
            case 'pdf': url = API.exportPDF(eventId); break;
        }
        window.open(url, '_blank');
        Toast.success(`Downloading ${format.toUpperCase()} export...`);
    }
};
