const BrandVoicesPage = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div><h2 class="page-title">Brand Voices</h2><p class="page-subtitle">Define the tone and style for your event content</p></div>
                <button class="btn btn-primary" id="btn-new-voice">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Voice
                </button>
            </div>
            <div id="voices-grid"><div class="empty-state"><div class="spinner" style="margin:0 auto 16px"></div><p>Loading...</p></div></div>
        `;
        document.getElementById('btn-new-voice').onclick = () => this.showVoiceModal();
        this.loadVoices();
    },

    async loadVoices() {
        try {
            const voices = await API.listVoices();
            const grid = document.getElementById('voices-grid');
            grid.innerHTML = '<div class="card-grid">' + voices.map(v => {
                let samples = [];
                try { samples = JSON.parse(v.sample_phrases || '[]'); } catch {}
                let dos = [];
                try { dos = JSON.parse(v.dos || '[]'); } catch {}
                return `
                    <div class="card voice-card card-clickable" onclick="BrandVoicesPage.showVoiceModal(${v.id})">
                        <div class="card-header">
                            <span class="card-title">${esc(v.name)}</span>
                            <span class="badge ${v.is_predefined ? 'badge-builtin' : 'badge-custom'}">${v.is_predefined ? 'Built-in' : 'Custom'}</span>
                        </div>
                        <div class="card-body">
                            <div style="color:var(--accent);font-size:12px;margin-bottom:6px">${esc(v.tone || '')}</div>
                            <div>${esc((v.description || '').substring(0, 120))}${(v.description || '').length > 120 ? '...' : ''}</div>
                            ${samples.length ? `<div class="voice-card-sample">"${esc(samples[0])}"</div>` : ''}
                            ${dos.length ? `<div class="voice-card-tags">${dos.slice(0, 3).map(d => `<span class="voice-card-tag">${esc(d)}</span>`).join('')}</div>` : ''}
                        </div>
                    </div>`;
            }).join('') + '</div>';
        } catch (err) {
            document.getElementById('voices-grid').innerHTML = `<div class="empty-state"><p>${esc(err.message)}</p></div>`;
        }
    },

    async showVoiceModal(voiceId = null) {
        let voice = { name: '', tone: '', description: '', sample_phrases: [], dos: [], donts: [] };
        let isEdit = false;
        if (voiceId) {
            const voices = await API.listVoices();
            const found = voices.find(v => v.id === voiceId);
            if (found) {
                voice = {
                    ...found,
                    sample_phrases: JSON.parse(found.sample_phrases || '[]'),
                    dos: JSON.parse(found.dos || '[]'),
                    donts: JSON.parse(found.donts || '[]')
                };
                isEdit = true;
            }
        }

        const listHtml = (items, id) => items.map((item, i) => `
            <div class="list-editor-item">
                <input class="form-input" value="${esc(item)}" data-list="${id}" data-index="${i}">
                <button class="btn-icon" onclick="this.parentElement.remove()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
        `).join('');

        Modal.open({
            title: isEdit ? 'Edit Brand Voice' : 'Create Brand Voice',
            cls: 'modal-lg',
            content: `
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="voice-name" value="${esc(voice.name)}" ${voice.is_predefined ? 'readonly' : ''}></div>
                    <div class="form-group"><label class="form-label">Tone</label><input class="form-input" id="voice-tone" value="${esc(voice.tone || '')}"></div>
                </div>
                <div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="voice-desc" rows="3">${esc(voice.description || '')}</textarea></div>
                <div class="form-group">
                    <label class="form-label">Sample Phrases</label>
                    <div class="list-editor" id="voice-samples">${listHtml(voice.sample_phrases, 'samples')}</div>
                    <div class="list-editor-add" onclick="BrandVoicesPage.addListItem('voice-samples','samples')">+ Add phrase</div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Do's</label>
                        <div class="list-editor" id="voice-dos">${listHtml(voice.dos, 'dos')}</div>
                        <div class="list-editor-add" onclick="BrandVoicesPage.addListItem('voice-dos','dos')">+ Add do</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Don'ts</label>
                        <div class="list-editor" id="voice-donts">${listHtml(voice.donts, 'donts')}</div>
                        <div class="list-editor-add" onclick="BrandVoicesPage.addListItem('voice-donts','donts')">+ Add don't</div>
                    </div>
                </div>
            `,
            footer: `
                ${isEdit && !voice.is_predefined ? `<button class="btn btn-danger" onclick="BrandVoicesPage.deleteVoice(${voiceId})" style="margin-right:auto">Delete</button>` : ''}
                <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                <button class="btn btn-primary" id="btn-save-voice">Save</button>
            `
        });

        document.getElementById('btn-save-voice').onclick = async () => {
            const data = {
                name: document.getElementById('voice-name').value.trim(),
                tone: document.getElementById('voice-tone').value.trim(),
                description: document.getElementById('voice-desc').value.trim(),
                sample_phrases: this.getListValues('voice-samples'),
                dos: this.getListValues('voice-dos'),
                donts: this.getListValues('voice-donts'),
            };
            if (!data.name) { Toast.error('Name is required'); return; }
            try {
                if (isEdit) await API.updateVoice(voiceId, data);
                else await API.createVoice(data);
                Modal.close();
                Toast.success(isEdit ? 'Voice updated' : 'Voice created');
                this.loadVoices();
            } catch (err) { Toast.error(err.message); }
        };
    },

    addListItem(containerId, listId) {
        const container = document.getElementById(containerId);
        const div = document.createElement('div');
        div.className = 'list-editor-item';
        div.innerHTML = `<input class="form-input" data-list="${listId}" placeholder="Enter value"><button class="btn-icon" onclick="this.parentElement.remove()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
        container.appendChild(div);
        div.querySelector('input').focus();
    },

    getListValues(containerId) {
        return Array.from(document.querySelectorAll(`#${containerId} input`))
            .map(i => i.value.trim()).filter(Boolean);
    },

    async deleteVoice(id) {
        if (!confirm('Delete this custom voice?')) return;
        try {
            await API.deleteVoice(id);
            Modal.close();
            Toast.success('Voice deleted');
            this.loadVoices();
        } catch (err) { Toast.error(err.message); }
    }
};
