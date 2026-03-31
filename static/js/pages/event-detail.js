const EventDetailPage = {
    currentEvent: null,
    currentTab: 'brief',

    async render(container, eventId) {
        container.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto 16px"></div><p>Loading event...</p></div>';
        try {
            this.currentEvent = await API.getEvent(eventId);
            this.renderPage(container);
            // Auto-extract if PDF was uploaded but brief hasn't been extracted yet
            if (this.currentEvent.raw_text && !this.currentEvent.description) {
                this._autoExtract();
            }
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><p>Event not found</p><p class="empty-state-hint">${esc(err.message)}</p></div>`;
        }
    },

    async _autoExtract() {
        const indicator = document.getElementById('ai-indicator');
        const btn = document.getElementById('btn-extract-ai');
        if (btn) { btn.disabled = true; btn.textContent = 'Extracting...'; }
        if (indicator) indicator.classList.remove('hidden');
        try {
            const result = await API.extractBrief(this.currentEvent.id);
            this.currentEvent = result.event;
            const el = document.getElementById('tab-content');
            if (el && this.currentTab === 'brief') this.renderBriefTab(el);
            Toast.show('Brief extracted from uploaded document', 'success');
        } catch (err) {
            // Don't show error toast on auto-extract — user can click manually
            const btn2 = document.getElementById('btn-extract-ai');
            if (btn2) { btn2.disabled = false; btn2.textContent = 'Extract with AI'; }
        } finally {
            if (indicator) indicator.classList.add('hidden');
        }
    },

    renderPage(container) {
        const e = this.currentEvent;
        const voices_promise = API.listVoices();
        container.innerHTML = `
            <div class="event-header">
                <div class="event-header-info">
                    <div style="display:flex;align-items:center;gap:12px">
                        <h2 class="page-title" style="margin:0">${esc(e.name)}</h2>
                        <span class="badge badge-${e.status}">${e.status}</span>
                    </div>
                    <div class="event-meta">
                        ${e.brand_voice_name ? `<span class="event-meta-item">Voice: ${esc(e.brand_voice_name)}</span>` : ''}
                        ${e.target_audience ? `<span class="event-meta-item">Audience: ${esc(e.target_audience)}</span>` : ''}
                        ${e.theme ? `<span class="event-meta-item">Theme: ${esc(e.theme)}</span>` : ''}
                        ${e.location ? `<span class="event-meta-item">Location: ${esc(e.location)}</span>` : ''}
                    </div>
                </div>
                <div class="event-header-actions">
                    <select id="event-status-select" class="btn btn-secondary" style="padding:6px 12px">
                        <option value="draft"${e.status==='draft'?' selected':''}>Draft</option>
                        <option value="active"${e.status==='active'?' selected':''}>Active</option>
                        <option value="completed"${e.status==='completed'?' selected':''}>Completed</option>
                    </select>
                    <select id="event-voice-select" class="btn btn-secondary" style="padding:6px 12px">
                        <option value="">No voice</option>
                    </select>
                    <button class="btn btn-danger btn-sm" id="btn-delete-event">Delete</button>
                </div>
            </div>
            <div class="tabs" id="event-tabs">
                <div class="tab${this.currentTab==='brief'?' active':''}" data-tab="brief">Brief</div>
                <div class="tab${this.currentTab==='platforms'?' active':''}" data-tab="platforms">Platforms</div>
                <div class="tab${this.currentTab==='campaigns'?' active':''}" data-tab="campaigns">Campaigns</div>
                <div class="tab${this.currentTab==='content'?' active':''}" data-tab="content">Content Table</div>
            </div>
            <div id="tab-content"></div>
        `;

        // Load voices into select
        voices_promise.then(voices => {
            const sel = document.getElementById('event-voice-select');
            if (!sel) return;
            voices.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.textContent = v.name;
                if (v.id === e.brand_voice_id) opt.selected = true;
                sel.appendChild(opt);
            });
        });

        document.getElementById('event-voice-select').onchange = async (ev) => {
            const vid = ev.target.value ? parseInt(ev.target.value) : null;
            await API.updateEvent(e.id, { brand_voice_id: vid });
            this.currentEvent = await API.getEvent(e.id);
            Toast.success('Brand voice updated');
            Sidebar.updateStats();
        };

        document.getElementById('event-status-select').onchange = async (ev) => {
            await API.updateEvent(e.id, { status: ev.target.value });
            this.currentEvent.status = ev.target.value;
            Toast.success('Status updated');
        };

        document.getElementById('btn-delete-event').onclick = async () => {
            if (!confirm('Delete this event and all its content?')) return;
            await API.deleteEvent(e.id);
            Toast.success('Event deleted');
            location.hash = '#/events';
        };

        document.querySelectorAll('#event-tabs .tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('#event-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.renderTab();
            };
        });

        this.renderTab();
    },

    renderTab() {
        const el = document.getElementById('tab-content');
        switch (this.currentTab) {
            case 'brief': this.renderBriefTab(el); break;
            case 'platforms': this.renderPlatformsTab(el); break;
            case 'campaigns': this.renderCampaignsTab(el); break;
            case 'content': this.renderContentTab(el); break;
        }
    },

    renderBriefTab(el) {
        const e = this.currentEvent;
        let goalsStr = '';
        try { goalsStr = JSON.parse(e.goals || '[]').join(', '); } catch { goalsStr = e.goals || ''; }
        let datesStr = '';
        try {
            const d = JSON.parse(e.dates || '{}');
            datesStr = d.start ? `${d.start}${d.end ? ' to ' + d.end : ''}` : '';
        } catch { datesStr = e.dates || ''; }

        el.innerHTML = `
            <div style="margin-bottom:16px;display:flex;gap:8px">
                ${e.raw_text ? `<button class="btn btn-primary" id="btn-extract-ai">Extract with AI</button>` : ''}
                <button class="btn btn-secondary" id="btn-save-brief">Save Changes</button>
            </div>
            <div class="brief-form">
                <div class="form-group"><label class="form-label">Event Name</label><input class="form-input" id="bf-name" value="${esc(e.name || '')}"></div>
                <div class="form-group"><label class="form-label">Status</label><input class="form-input" id="bf-status" value="${esc(e.status || 'draft')}" readonly></div>
                <div class="form-group full-width"><label class="form-label">Description</label><textarea class="form-input" id="bf-desc" rows="3">${esc(e.description || '')}</textarea></div>
                <div class="form-group"><label class="form-label">Target Audience</label><input class="form-input" id="bf-audience" value="${esc(e.target_audience || '')}"></div>
                <div class="form-group"><label class="form-label">Theme</label><input class="form-input" id="bf-theme" value="${esc(e.theme || '')}"></div>
                <div class="form-group"><label class="form-label">Goals (comma-separated)</label><input class="form-input" id="bf-goals" value="${esc(goalsStr)}"></div>
                <div class="form-group"><label class="form-label">Dates</label><input class="form-input" id="bf-dates" value="${esc(datesStr)}"></div>
                <div class="form-group full-width"><label class="form-label">Location</label><input class="form-input" id="bf-location" value="${esc(e.location || '')}"></div>
            </div>
            ${e.raw_text ? `<div style="margin-top:24px"><h4 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary)">RAW EXTRACTED TEXT</h4><div style="background:var(--bg-tertiary);padding:16px;border-radius:var(--radius-md);max-height:300px;overflow-y:auto;font-size:12px;white-space:pre-wrap;color:var(--text-secondary)">${esc(e.raw_text)}</div></div>` : ''}
        `;

        if (e.raw_text) {
            document.getElementById('btn-extract-ai').onclick = async () => {
                const btn = document.getElementById('btn-extract-ai');
                btn.disabled = true;
                btn.textContent = 'Extracting...';
                document.getElementById('ai-indicator').classList.remove('hidden');
                try {
                    const result = await API.extractBrief(e.id);
                    this.currentEvent = result.event;
                    Toast.success('Brief extracted successfully!');
                    this.renderBriefTab(el);
                } catch (err) {
                    Toast.error('Extraction failed: ' + err.message);
                    btn.disabled = false;
                    btn.textContent = 'Extract with AI';
                } finally {
                    document.getElementById('ai-indicator').classList.add('hidden');
                }
            };
        }

        document.getElementById('btn-save-brief').onclick = async () => {
            const goals = document.getElementById('bf-goals').value.split(',').map(g => g.trim()).filter(Boolean);
            try {
                await API.updateEvent(e.id, {
                    name: document.getElementById('bf-name').value.trim(),
                    description: document.getElementById('bf-desc').value.trim(),
                    target_audience: document.getElementById('bf-audience').value.trim(),
                    theme: document.getElementById('bf-theme').value.trim(),
                    goals,
                    location: document.getElementById('bf-location').value.trim(),
                });
                this.currentEvent = await API.getEvent(e.id);
                Toast.success('Brief saved');
            } catch (err) { Toast.error(err.message); }
        };
    },

    async renderPlatformsTab(el) {
        const e = this.currentEvent;
        el.innerHTML = `
            <div style="margin-bottom:16px;display:flex;gap:8px">
                <button class="btn btn-primary" id="btn-suggest-platforms">Suggest Platforms with AI</button>
            </div>
            <div id="platforms-grid" class="platform-grid"></div>
        `;
        const platformLabels = {
            instagram: { label: 'Instagram', color: '#E1306C', icon: 'IG' },
            linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: 'Li' },
            twitter_x: { label: 'Twitter/X', color: '#1DA1F2', icon: 'X' },
            facebook: { label: 'Facebook', color: '#1877F2', icon: 'Fb' },
            tiktok: { label: 'TikTok', color: '#FF0050', icon: 'Tk' },
            youtube: { label: 'YouTube', color: '#FF0000', icon: 'YT' },
            google_ads: { label: 'Google Ads', color: '#4285F4', icon: 'GA' },
            meta_ads: { label: 'Meta Ads', color: '#0668E1', icon: 'MA' },
            linkedin_ads: { label: 'LinkedIn Ads', color: '#0A66C2', icon: 'LA' },
            tiktok_ads: { label: 'TikTok Ads', color: '#FF0050', icon: 'TA' },
        };

        const renderPlatforms = (platforms) => {
            const grid = document.getElementById('platforms-grid');
            if (!platforms.length) {
                grid.innerHTML = '<div class="empty-state"><p class="empty-state-text">No platforms suggested yet</p><p class="empty-state-hint">Click "Suggest Platforms with AI" to get recommendations</p></div>';
                return;
            }
            grid.innerHTML = platforms.map(p => {
                const info = platformLabels[p.platform] || { label: p.platform, color: '#6366f1', icon: '?' };
                return `
                    <div class="platform-card${p.is_selected ? ' selected' : ''}" data-platform="${p.platform}" onclick="EventDetailPage.togglePlatform('${p.platform}')">
                        <div class="platform-icon" style="background:${info.color}20;color:${info.color}">${info.icon}</div>
                        <div class="platform-info">
                            <div class="platform-name">${info.label}</div>
                            <div class="platform-reason">${esc(p.reasoning || '')}</div>
                        </div>
                        <div class="toggle"><input type="checkbox" ${p.is_selected ? 'checked' : ''}><span class="toggle-slider"></span></div>
                    </div>`;
            }).join('');
        };

        renderPlatforms(e.platforms || []);

        document.getElementById('btn-suggest-platforms').onclick = async () => {
            const btn = document.getElementById('btn-suggest-platforms');
            btn.disabled = true;
            btn.textContent = 'Generating suggestions...';
            document.getElementById('ai-indicator').classList.remove('hidden');
            try {
                const platforms = await API.suggestPlatforms(e.id);
                this.currentEvent.platforms = platforms;
                renderPlatforms(platforms);
                Toast.success('Platform suggestions generated!');
            } catch (err) { Toast.error(err.message); }
            finally {
                btn.disabled = false;
                btn.textContent = 'Suggest Platforms with AI';
                document.getElementById('ai-indicator').classList.add('hidden');
            }
        };
    },

    async togglePlatform(platform) {
        const platforms = this.currentEvent.platforms.map(p => ({
            ...p, is_selected: p.platform === platform ? (p.is_selected ? 0 : 1) : p.is_selected
        }));
        try {
            this.currentEvent.platforms = await API.updateEventPlatforms(this.currentEvent.id, platforms);
            this.renderPlatformsTab(document.getElementById('tab-content'));
        } catch (err) { Toast.error(err.message); }
    },

    async renderCampaignsTab(el) {
        const e = this.currentEvent;
        el.innerHTML = `
            <div style="margin-bottom:16px;display:flex;gap:8px">
                <button class="btn btn-primary" id="btn-add-campaign">Add Campaign</button>
            </div>
            <div id="campaigns-list"></div>
        `;
        const campaigns = await API.listCampaigns(e.id);
        const list = document.getElementById('campaigns-list');
        if (campaigns.length === 0) {
            list.innerHTML = '<div class="empty-state"><p class="empty-state-text">No campaigns yet</p><p class="empty-state-hint">Create a campaign to organize your content</p></div>';
        } else {
            list.innerHTML = campaigns.map(c => `
                <div class="accordion-item" id="campaign-${c.id}">
                    <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
                        <div>
                            <strong>${esc(c.name)}</strong>
                            <span style="color:var(--text-muted);font-size:12px;margin-left:8px">${c.phase || ''} &middot; ${c.content_count || 0} items</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px">
                            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();EventDetailPage.editCampaign(${c.id},'${esc(c.name)}','${esc(c.objective||'')}','${esc(c.phase||'')}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();EventDetailPage.deleteCampaign(${c.id})">Delete</button>
                            <span class="accordion-arrow">&#9654;</span>
                        </div>
                    </div>
                    <div class="accordion-body">
                        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">${esc(c.objective || 'No objective set')}</p>
                        <div style="display:flex;gap:8px">
                            <button class="btn btn-sm btn-primary" onclick="EventDetailPage.generateIdeas(${e.id},${c.id})">Generate Ideas with AI</button>
                            <button class="btn btn-sm btn-secondary" onclick="EventDetailPage.addContentToCampaign(${c.id})">Add Content</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('btn-add-campaign').onclick = () => this.showAddCampaignModal();
    },

    showAddCampaignModal() {
        Modal.open({
            title: 'Add Campaign',
            content: `
                <div class="form-group"><label class="form-label">Campaign Name</label><input class="form-input" id="camp-name" placeholder="e.g., Pre-Event Awareness"></div>
                <div class="form-group"><label class="form-label">Objective</label><textarea class="form-input" id="camp-obj" placeholder="What should this campaign achieve?" rows="2"></textarea></div>
                <div class="form-group"><label class="form-label">Phase</label>
                    <select class="form-input" id="camp-phase">
                        <option value="pre-event">Pre-Event</option>
                        <option value="during-event">During Event</option>
                        <option value="post-event">Post-Event</option>
                    </select>
                </div>
            `,
            footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button><button class="btn btn-primary" id="btn-save-campaign">Create</button>`
        });
        document.getElementById('btn-save-campaign').onclick = async () => {
            const name = document.getElementById('camp-name').value.trim();
            if (!name) { Toast.error('Name is required'); return; }
            await API.createCampaign(this.currentEvent.id, {
                name, objective: document.getElementById('camp-obj').value.trim(),
                phase: document.getElementById('camp-phase').value
            });
            Modal.close();
            Toast.success('Campaign created');
            this.renderCampaignsTab(document.getElementById('tab-content'));
            Sidebar.updateStats();
        };
    },

    async editCampaign(id, name, objective, phase) {
        Modal.open({
            title: 'Edit Campaign',
            content: `
                <div class="form-group"><label class="form-label">Campaign Name</label><input class="form-input" id="camp-name" value="${esc(name)}"></div>
                <div class="form-group"><label class="form-label">Objective</label><textarea class="form-input" id="camp-obj" rows="2">${esc(objective)}</textarea></div>
                <div class="form-group"><label class="form-label">Phase</label>
                    <select class="form-input" id="camp-phase">
                        <option value="pre-event"${phase==='pre-event'?' selected':''}>Pre-Event</option>
                        <option value="during-event"${phase==='during-event'?' selected':''}>During Event</option>
                        <option value="post-event"${phase==='post-event'?' selected':''}>Post-Event</option>
                    </select>
                </div>
            `,
            footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button><button class="btn btn-primary" id="btn-update-campaign">Save</button>`
        });
        document.getElementById('btn-update-campaign').onclick = async () => {
            await API.updateCampaign(id, {
                name: document.getElementById('camp-name').value.trim(),
                objective: document.getElementById('camp-obj').value.trim(),
                phase: document.getElementById('camp-phase').value
            });
            Modal.close();
            Toast.success('Campaign updated');
            this.renderCampaignsTab(document.getElementById('tab-content'));
        };
    },

    async deleteCampaign(id) {
        if (!confirm('Delete this campaign and all its content?')) return;
        await API.deleteCampaign(id);
        Toast.success('Campaign deleted');
        this.renderCampaignsTab(document.getElementById('tab-content'));
        Sidebar.updateStats();
    },

    async generateIdeas(eventId, campaignId) {
        document.getElementById('ai-indicator').classList.remove('hidden');
        try {
            const result = await API.generateIdeas(eventId, campaignId);
            Toast.success(`Generated ${result.content_pieces?.length || 0} content ideas!`);
            this.currentTab = 'content';
            document.querySelectorAll('#event-tabs .tab').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="content"]').classList.add('active');
            this.renderContentTab(document.getElementById('tab-content'));
            Sidebar.updateStats();
        } catch (err) { Toast.error('Failed to generate ideas: ' + err.message); }
        finally { document.getElementById('ai-indicator').classList.add('hidden'); }
    },

    async addContentToCampaign(campaignId) {
        await API.createContent(campaignId, { title: 'New Content Piece' });
        Toast.success('Content piece added');
        this.currentTab = 'content';
        document.querySelectorAll('#event-tabs .tab').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="content"]').classList.add('active');
        this.renderContentTab(document.getElementById('tab-content'));
        Sidebar.updateStats();
    },

    async renderContentTab(el) {
        el.innerHTML = '<div id="content-table-container"><div class="empty-state"><div class="spinner" style="margin:0 auto 16px"></div><p>Loading content...</p></div></div>';
        ContentTablePage.renderForEvent(document.getElementById('content-table-container'), this.currentEvent.id);
    }
};
