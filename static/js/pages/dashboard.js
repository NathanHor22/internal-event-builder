const DashboardPage = {
    async render(container) {
        container.innerHTML = '<div class="page-header"><div><h2 class="page-title">Dashboard</h2><p class="page-subtitle">Event marketing content overview</p></div></div><div id="dashboard-content"><div class="empty-state"><div class="spinner" style="margin:0 auto 16px"></div><p>Loading...</p></div></div>';
        try {
            const events = await API.listEvents();
            const totalCampaigns = events.reduce((s, e) => s + (e.campaign_count || 0), 0);
            const totalContent = events.reduce((s, e) => s + (e.content_count || 0), 0);
            const activeEvents = events.filter(e => e.status === 'active').length;

            const dc = document.getElementById('dashboard-content');
            dc.innerHTML = `
                <div class="stat-row">
                    <div class="card stat-card"><div class="stat-value">${events.length}</div><div class="stat-label">Total Events</div></div>
                    <div class="card stat-card"><div class="stat-value">${activeEvents}</div><div class="stat-label">Active Events</div></div>
                    <div class="card stat-card"><div class="stat-value">${totalCampaigns}</div><div class="stat-label">Campaigns</div></div>
                    <div class="card stat-card"><div class="stat-value">${totalContent}</div><div class="stat-label">Content Pieces</div></div>
                </div>
                <div class="dashboard-quick-actions">
                    <button class="btn btn-primary" onclick="location.hash='#/events/new'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        New Event
                    </button>
                    <button class="btn btn-secondary" onclick="location.hash='#/brand-voices'">Manage Brand Voices</button>
                </div>
                <div>
                    <h3 style="margin-bottom:12px;font-size:16px;font-weight:600">Recent Events</h3>
                    ${events.length === 0 ? '<div class="empty-state"><p class="empty-state-text">No events yet</p><p class="empty-state-hint">Upload an event brief or create one manually to get started</p></div>' :
                    '<div class="card-grid">' + events.slice(0, 6).map(e => `
                        <div class="card card-clickable" onclick="location.hash='#/events/${e.id}'">
                            <div class="card-header">
                                <span class="card-title">${esc(e.name)}</span>
                                <span class="badge badge-${e.status}">${e.status}</span>
                            </div>
                            <div class="card-body">
                                ${e.theme ? `<div style="margin-bottom:4px">Theme: ${esc(e.theme)}</div>` : ''}
                                ${e.brand_voice_name ? `<div style="margin-bottom:4px">Voice: ${esc(e.brand_voice_name)}</div>` : ''}
                                <div style="margin-top:8px;display:flex;gap:12px">
                                    <span>${e.campaign_count || 0} campaigns</span>
                                    <span>${e.content_count || 0} content</span>
                                </div>
                            </div>
                        </div>
                    `).join('') + '</div>'}
                </div>
            `;
        } catch (err) {
            document.getElementById('dashboard-content').innerHTML = `<div class="empty-state"><p class="empty-state-text">Failed to load dashboard</p><p class="empty-state-hint">${esc(err.message)}</p></div>`;
        }
    }
};
