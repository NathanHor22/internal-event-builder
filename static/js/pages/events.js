const EventsPage = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div><h2 class="page-title">Events</h2><p class="page-subtitle">Manage your event marketing briefs</p></div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-primary" id="btn-new-event">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        New Event
                    </button>
                </div>
            </div>
            <div id="events-list"><div class="empty-state"><div class="spinner" style="margin:0 auto 16px"></div><p>Loading events...</p></div></div>
        `;
        document.getElementById('btn-new-event').onclick = () => this.showNewEventModal();
        this.loadEvents();
    },

    async loadEvents() {
        try {
            const events = await API.listEvents();
            const el = document.getElementById('events-list');
            if (events.length === 0) {
                el.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                        <p class="empty-state-text">No events yet</p>
                        <p class="empty-state-hint">Upload an event brief or create one manually</p>
                    </div>`;
                return;
            }
            el.innerHTML = '<div class="card-grid">' + events.map(e => `
                <div class="card card-clickable" onclick="location.hash='#/events/${e.id}'">
                    <div class="card-header">
                        <span class="card-title">${esc(e.name)}</span>
                        <span class="badge badge-${e.status}">${e.status}</span>
                    </div>
                    <div class="card-body">
                        ${e.description ? `<div style="margin-bottom:6px">${esc(e.description).substring(0, 100)}${e.description.length > 100 ? '...' : ''}</div>` : ''}
                        ${e.target_audience ? `<div style="margin-bottom:4px;font-size:12px">Audience: ${esc(e.target_audience)}</div>` : ''}
                        ${e.brand_voice_name ? `<div style="margin-bottom:4px;font-size:12px">Voice: ${esc(e.brand_voice_name)}</div>` : ''}
                        <div style="display:flex;gap:12px;margin-top:10px;font-size:12px;color:var(--text-muted)">
                            <span>${e.campaign_count || 0} campaigns</span>
                            <span>${e.content_count || 0} content</span>
                        </div>
                    </div>
                </div>
            `).join('') + '</div>';
        } catch (err) {
            document.getElementById('events-list').innerHTML = `<div class="empty-state"><p>${esc(err.message)}</p></div>`;
        }
    },

    showNewEventModal() {
        Modal.open({
            title: 'Create New Event',
            content: `
                <div id="upload-section" style="margin-bottom:24px">
                    <h4 style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--text-secondary)">UPLOAD BRIEF</h4>
                    <div id="file-upload-container"></div>
                </div>
                <div style="text-align:center;color:var(--text-muted);margin:16px 0;font-size:12px">- OR -</div>
                <h4 style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--text-secondary)">CREATE MANUALLY</h4>
                <div class="form-group">
                    <label class="form-label">Event Name</label>
                    <input class="form-input" id="new-event-name" placeholder="Enter event name">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-input" id="new-event-desc" placeholder="Brief description of the event" rows="3"></textarea>
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                <button class="btn btn-primary" id="btn-create-event-manual">Create Event</button>
            `
        });

        const uploadContainer = document.getElementById('file-upload-container');
        uploadContainer.appendChild(FileUpload.create(async (file) => {
            const indicator = document.getElementById('ai-indicator');
            indicator.classList.remove('hidden');
            uploadContainer.innerHTML = '<div style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto 12px"></div><p style="color:var(--text-secondary)">Uploading and parsing ' + esc(file.name) + '...</p></div>';
            try {
                const formData = new FormData();
                formData.append('file', file);
                const event = await API.uploadBrief(formData);
                Modal.close();
                Toast.success('Brief uploaded successfully!');
                location.hash = `#/events/${event.id}`;
            } catch (err) {
                Toast.error('Upload failed: ' + err.message);
                uploadContainer.innerHTML = '';
                uploadContainer.appendChild(FileUpload.create(arguments.callee));
            } finally {
                indicator.classList.add('hidden');
            }
        }));

        document.getElementById('btn-create-event-manual').onclick = async () => {
            const name = document.getElementById('new-event-name').value.trim();
            if (!name) { Toast.error('Event name is required'); return; }
            try {
                const event = await API.createEvent({
                    name,
                    description: document.getElementById('new-event-desc').value.trim()
                });
                Modal.close();
                Toast.success('Event created!');
                location.hash = `#/events/${event.id}`;
            } catch (err) { Toast.error(err.message); }
        };
    }
};
