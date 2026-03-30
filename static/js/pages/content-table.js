const ContentTablePage = {
    async renderForEvent(container, eventId) {
        try {
            const pieces = await API.listEventContent(eventId);
            if (pieces.length === 0) {
                container.innerHTML = '<div class="empty-state"><p class="empty-state-text">No content pieces yet</p><p class="empty-state-hint">Go to the Campaigns tab to create campaigns and generate content ideas with AI</p></div>';
                return;
            }
            this.renderTable(container, pieces, eventId);
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><p>${esc(err.message)}</p></div>`;
        }
    },

    renderTable(container, pieces, eventId) {
        const formatOptions = [
            { value: 'video', label: 'Video' }, { value: 'poster', label: 'Poster' },
            { value: 'carousel', label: 'Carousel' }, { value: 'story', label: 'Story' },
            { value: 'reel', label: 'Reel' }
        ];
        const statusOptions = [
            { value: 'draft', label: 'Draft' }, { value: 'review', label: 'Review' },
            { value: 'approved', label: 'Approved' }, { value: 'published', label: 'Published' }
        ];
        const adPlatformOptions = [
            { value: '', label: 'None' }, { value: 'google_ads', label: 'Google Ads' },
            { value: 'social_media_ads', label: 'Social Media Ads' }
        ];

        container.innerHTML = `
            <div class="content-table-toolbar">
                <button class="btn btn-primary btn-sm" id="btn-recommend-ads">AI Ad Recommendations</button>
                <button class="btn btn-secondary btn-sm" id="btn-write-all">AI Write All Empty</button>
                <div class="toolbar-spacer"></div>
                <span style="font-size:12px;color:var(--text-muted)">${pieces.length} items</span>
            </div>
            <div class="content-table-wrapper">
                <table class="data-table content-table">
                    <thead>
                        <tr>
                            <th>Campaign</th>
                            <th>Title</th>
                            <th>Format</th>
                            <th>Platform</th>
                            <th>Copywriting</th>
                            <th>Video Script</th>
                            <th>Caption</th>
                            <th>Ad</th>
                            <th>Ad Platform</th>
                            <th>Budget</th>
                            <th>Ad Start</th>
                            <th>Ad End</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="content-tbody"></tbody>
                </table>
            </div>
        `;

        const tbody = document.getElementById('content-tbody');
        pieces.forEach(p => {
            const tr = document.createElement('tr');
            tr.dataset.status = p.status || 'draft';

            // Campaign name (read-only)
            const tdCampaign = document.createElement('td');
            tdCampaign.innerHTML = `<div style="font-size:12px"><strong>${esc(p.campaign_name || '')}</strong><br><span style="color:var(--text-muted)">${esc(p.campaign_phase || '')}</span></div>`;
            tr.appendChild(tdCampaign);

            // Editable fields
            const fields = [
                { field: 'title', value: p.title, type: 'text' },
                { field: 'format', value: p.format, type: 'select', options: formatOptions },
                { field: 'platform', value: p.platform, type: 'text' },
                { field: 'copywriting', value: p.copywriting, type: 'textarea' },
                { field: 'video_script', value: p.video_script, type: 'textarea' },
                { field: 'caption', value: p.caption, type: 'textarea' },
            ];

            fields.forEach(f => {
                const td = document.createElement('td');
                td.appendChild(EditableCell.create({ ...f, contentId: p.id }));
                tr.appendChild(td);
            });

            // Ad toggle
            const tdAd = document.createElement('td');
            tdAd.innerHTML = `<label class="toggle"><input type="checkbox" ${p.is_ad ? 'checked' : ''} onchange="ContentTablePage.toggleAd(${p.id}, this.checked)"><span class="toggle-slider"></span></label>`;
            tr.appendChild(tdAd);

            // Ad Platform
            const tdAdPlatform = document.createElement('td');
            tdAdPlatform.appendChild(EditableCell.create({ field: 'ad_platform', value: p.ad_platform, contentId: p.id, type: 'select', options: adPlatformOptions }));
            tr.appendChild(tdAdPlatform);

            // Budget
            const tdBudget = document.createElement('td');
            tdBudget.appendChild(EditableCell.create({ field: 'ad_budget', value: p.ad_budget, contentId: p.id, type: 'number' }));
            tr.appendChild(tdBudget);

            // Ad dates
            const tdStart = document.createElement('td');
            tdStart.appendChild(EditableCell.create({ field: 'ad_start_date', value: p.ad_start_date, contentId: p.id, type: 'date' }));
            tr.appendChild(tdStart);

            const tdEnd = document.createElement('td');
            tdEnd.appendChild(EditableCell.create({ field: 'ad_end_date', value: p.ad_end_date, contentId: p.id, type: 'date' }));
            tr.appendChild(tdEnd);

            // Status
            const tdStatus = document.createElement('td');
            tdStatus.appendChild(EditableCell.create({
                field: 'status', value: p.status, contentId: p.id, type: 'select', options: statusOptions,
                onSave: (val) => { tr.dataset.status = val; }
            }));
            tr.appendChild(tdStatus);

            // Actions
            const tdActions = document.createElement('td');
            tdActions.innerHTML = `
                <div style="display:flex;gap:4px">
                    <button class="btn btn-sm btn-secondary" onclick="ContentTablePage.writeContentAI(${p.id}, ${eventId})" title="Generate with AI">AI</button>
                    <button class="btn btn-sm btn-danger" onclick="ContentTablePage.deleteContent(${p.id}, ${eventId})" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                </div>
            `;
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

        // Toolbar actions
        document.getElementById('btn-recommend-ads').onclick = async () => {
            document.getElementById('ai-indicator').classList.remove('hidden');
            try {
                const recs = await API.recommendAds(eventId);
                Toast.success(`Got ${recs.length} ad recommendations!`);
                this.renderForEvent(container, eventId);
            } catch (err) { Toast.error(err.message); }
            finally { document.getElementById('ai-indicator').classList.add('hidden'); }
        };

        document.getElementById('btn-write-all').onclick = async () => {
            const empty = pieces.filter(p => !p.copywriting && !p.caption);
            if (empty.length === 0) { Toast.info('All content already has copy'); return; }
            document.getElementById('ai-indicator').classList.remove('hidden');
            let count = 0;
            for (const p of empty) {
                try {
                    await API.writeContent(p.id);
                    count++;
                } catch { /* continue */ }
            }
            document.getElementById('ai-indicator').classList.add('hidden');
            Toast.success(`Generated content for ${count} pieces`);
            this.renderForEvent(container, eventId);
        };
    },

    async toggleAd(contentId, isAd) {
        try {
            await API.updateContent(contentId, { is_ad: isAd ? 1 : 0 });
        } catch (err) { Toast.error(err.message); }
    },

    async writeContentAI(contentId, eventId) {
        document.getElementById('ai-indicator').classList.remove('hidden');
        try {
            await API.writeContent(contentId);
            Toast.success('Content generated!');
            const container = document.getElementById('content-table-container');
            if (container) this.renderForEvent(container, eventId);
        } catch (err) { Toast.error(err.message); }
        finally { document.getElementById('ai-indicator').classList.add('hidden'); }
    },

    async deleteContent(contentId, eventId) {
        if (!confirm('Delete this content piece?')) return;
        try {
            await API.deleteContent(contentId);
            Toast.success('Deleted');
            const container = document.getElementById('content-table-container');
            if (container) this.renderForEvent(container, eventId);
            Sidebar.updateStats();
        } catch (err) { Toast.error(err.message); }
    }
};
