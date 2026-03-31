const ApiKeyManager = {
    STORAGE_KEY: 'ce_api_accounts',
    MODELS: [
        { id: 'claude-sonnet-4-6',        label: 'Claude Sonnet 4.6' },
        { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6' },
        { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    ],

    _load() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || { accounts: [], activeId: null };
        } catch {
            return { accounts: [], activeId: null };
        }
    },

    _save(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        this._updateTopbar();
    },

    getActive() {
        const data = this._load();
        return data.accounts.find(a => a.id === data.activeId) || null;
    },

    setActive(id) {
        const data = this._load();
        data.activeId = id;
        this._save(data);
    },

    add(name, key, model) {
        const data = this._load();
        const account = { id: Date.now().toString(36), name, key, model };
        data.accounts.push(account);
        if (!data.activeId) data.activeId = account.id;
        this._save(data);
        return account;
    },

    remove(id) {
        const data = this._load();
        data.accounts = data.accounts.filter(a => a.id !== id);
        if (data.activeId === id) {
            data.activeId = data.accounts[0]?.id || null;
        }
        this._save(data);
    },

    // --- Topbar indicator ---

    _updateTopbar() {
        const dot = document.getElementById('api-key-dot');
        const label = document.getElementById('api-key-label');
        if (!dot || !label) return;
        const active = this.getActive();
        if (active) {
            dot.className = 'api-key-dot connected';
            label.textContent = active.name;
        } else {
            dot.className = 'api-key-dot';
            label.textContent = 'Connect Claude';
        }
    },

    // --- Modal ---

    openModal() {
        Modal.open({
            title: 'Claude Accounts',
            content: this._renderModalContent(),
            cls: 'modal-api-keys',
        });
        this._bindModalEvents();
    },

    _renderModalContent() {
        const data = this._load();
        const modelLabel = (id) => this.MODELS.find(m => m.id === id)?.label || id;

        const accountsHtml = data.accounts.length === 0
            ? '<p class="api-keys-empty">No accounts saved yet.</p>'
            : data.accounts.map(a => {
                const isActive = a.id === data.activeId;
                const masked = a.key.length > 12
                    ? a.key.slice(0, 10) + '••••••••' + a.key.slice(-4)
                    : '••••••••';
                return `
                <div class="api-key-row${isActive ? ' active' : ''}" data-id="${a.id}">
                    <div class="api-key-row-info">
                        <div class="api-key-row-name">
                            ${isActive ? '<span class="api-key-active-dot"></span>' : ''}
                            ${esc(a.name)}
                        </div>
                        <div class="api-key-row-meta">
                            <span class="api-key-masked">${masked}</span>
                            <span class="badge badge-builtin" style="font-size:10px">${esc(modelLabel(a.model))}</span>
                        </div>
                    </div>
                    <div class="api-key-row-actions">
                        ${!isActive ? `<button class="btn btn-sm btn-secondary api-key-use" data-id="${a.id}">Use</button>` : '<span class="api-key-active-label">Active</span>'}
                        <button class="btn-icon api-key-delete" data-id="${a.id}" title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                    </div>
                </div>`;
            }).join('');

        const modelOptions = this.MODELS.map(m =>
            `<option value="${m.id}"${m.id === 'claude-sonnet-4-6' ? ' selected' : ''}>${m.label}</option>`
        ).join('');

        return `
        <div class="api-keys-section">
            <div class="api-keys-section-title">Saved Accounts</div>
            <div id="api-key-list">${accountsHtml}</div>
        </div>

        <div class="api-keys-section" style="margin-top:20px">
            <div class="api-keys-section-title">Add Account</div>
            <div class="form-group">
                <label class="form-label">Name</label>
                <input id="ak-name" class="form-input" type="text" placeholder="e.g. Work, Personal">
            </div>
            <div class="form-group">
                <label class="form-label">API Key</label>
                <div style="display:flex;gap:8px">
                    <input id="ak-key" class="form-input" type="password" placeholder="sk-ant-api03-...">
                    <button class="btn btn-secondary btn-sm" id="ak-toggle-vis" type="button" style="flex-shrink:0">Show</button>
                </div>
                <div class="form-help">Get yours at console.anthropic.com</div>
            </div>
            <div class="form-group">
                <label class="form-label">Model</label>
                <select id="ak-model" class="form-input">${modelOptions}</select>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
                <button class="btn btn-secondary btn-sm" id="ak-test">Test Connection</button>
                <button class="btn btn-primary btn-sm" id="ak-save">Save Account</button>
                <span id="ak-status" style="font-size:12px"></span>
            </div>
        </div>`;
    },

    _bindModalEvents() {
        // Toggle visibility
        document.getElementById('ak-toggle-vis')?.addEventListener('click', () => {
            const input = document.getElementById('ak-key');
            const btn = document.getElementById('ak-toggle-vis');
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Hide';
            } else {
                input.type = 'password';
                btn.textContent = 'Show';
            }
        });

        // Use account
        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            const useBtn = e.target.closest('.api-key-use');
            if (useBtn) {
                this.setActive(useBtn.dataset.id);
                this.openModal(); // re-render
                return;
            }
            const delBtn = e.target.closest('.api-key-delete');
            if (delBtn) {
                this.remove(delBtn.dataset.id);
                this.openModal(); // re-render
                return;
            }
        });

        // Test connection
        document.getElementById('ak-test')?.addEventListener('click', async () => {
            await this._testKey();
        });

        // Save
        document.getElementById('ak-save')?.addEventListener('click', async () => {
            await this._saveAccount();
        });
    },

    async _testKey() {
        const key = document.getElementById('ak-key')?.value.trim();
        const status = document.getElementById('ak-status');
        if (!key) { status.textContent = 'Enter an API key first.'; status.style.color = 'var(--warning)'; return; }
        status.textContent = 'Testing...'; status.style.color = 'var(--text-muted)';
        try {
            const res = await fetch('/api/ai/verify-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: key }),
            });
            const data = await res.json();
            if (data.valid) {
                status.textContent = 'Connection successful!';
                status.style.color = 'var(--success)';
            } else {
                status.textContent = data.error || 'Invalid key.';
                status.style.color = 'var(--error)';
            }
        } catch {
            status.textContent = 'Connection failed.';
            status.style.color = 'var(--error)';
        }
    },

    async _saveAccount() {
        const name = document.getElementById('ak-name')?.value.trim();
        const key = document.getElementById('ak-key')?.value.trim();
        const model = document.getElementById('ak-model')?.value;
        const status = document.getElementById('ak-status');

        if (!name) { status.textContent = 'Name is required.'; status.style.color = 'var(--warning)'; return; }
        if (!key) { status.textContent = 'API key is required.'; status.style.color = 'var(--warning)'; return; }

        status.textContent = 'Verifying...'; status.style.color = 'var(--text-muted)';
        try {
            const res = await fetch('/api/ai/verify-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: key }),
            });
            const data = await res.json();
            if (!data.valid) {
                status.textContent = data.error || 'Invalid API key — account not saved.';
                status.style.color = 'var(--error)';
                return;
            }
        } catch {
            status.textContent = 'Could not verify key.';
            status.style.color = 'var(--error)';
            return;
        }

        this.add(name, key, model);
        Toast.show(`Account "${name}" saved and set as active`, 'success');
        this.openModal(); // re-render
    },
};

// Styles
const _akStyle = document.createElement('style');
_akStyle.textContent = `
.modal-api-keys { max-width: 520px; }
.api-keys-section-title { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
.api-keys-empty { font-size: 13px; color: var(--text-muted); padding: 10px 0; }
.api-key-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-md);
    margin-bottom: 8px; background: var(--bg-tertiary); gap: 12px;
}
.api-key-row.active { border-color: var(--accent); background: var(--accent-dim); }
.api-key-row-info { flex: 1; min-width: 0; }
.api-key-row-name { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.api-key-row-meta { display: flex; align-items: center; gap: 8px; }
.api-key-masked { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); }
.api-key-row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.api-key-active-label { font-size: 11px; font-weight: 600; color: var(--accent); }
.api-key-active-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex-shrink: 0; display: inline-block; }

.api-key-btn {
    display: flex; align-items: center; gap: 7px; padding: 5px 12px;
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    font-size: 12px; font-weight: 500; color: var(--text-secondary);
    background: var(--bg-tertiary); cursor: pointer; transition: all var(--transition);
}
.api-key-btn:hover { border-color: var(--border-light); color: var(--text-primary); }
.api-key-dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted);
    flex-shrink: 0; transition: background var(--transition);
}
.api-key-dot.connected { background: var(--success); box-shadow: 0 0 0 2px var(--success-dim); }
`;
document.head.appendChild(_akStyle);
