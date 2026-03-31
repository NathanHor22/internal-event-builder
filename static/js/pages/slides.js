const SlidesPage = {
    STEPS: [
        {
            id: 'basics',
            title: 'Event Basics',
            description: 'Core details about the event.',
        },
        {
            id: 'concept',
            title: 'Event Concept',
            description: 'The strategic thinking behind this event.',
        },
        {
            id: 'finishing',
            title: 'Finishing Touches',
            description: 'Budget, gimmicks, and visual references.',
        },
    ],

    currentStep: 0,
    answers: {},
    pdfFile: null,
    imageFiles: [],
    isGenerating: false,
    result: null,

    async render(container) {
        this.currentStep = 0;
        this.answers = {};
        this.pdfFile = null;
        this.imageFiles = [];
        this.isGenerating = false;
        this.result = null;

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h2 class="page-title">Slide Deck Generator</h2>
                    <p class="page-subtitle">Build a Synapze-style event proposal deck in minutes</p>
                </div>
            </div>
            <div id="slides-wizard"></div>`;

        this._renderWizard();
    },

    _renderWizard() {
        const container = document.getElementById('slides-wizard');
        if (!container) return;

        if (this.result) {
            container.innerHTML = this._renderResult();
            this._bindResultEvents();
            return;
        }

        if (this.isGenerating) {
            container.innerHTML = this._renderGenerating();
            return;
        }

        const step = this.STEPS[this.currentStep];
        const progress = (this.currentStep / this.STEPS.length) * 100;

        container.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-progress">
                    <div class="wizard-progress-bar" style="width:${progress}%"></div>
                </div>
                <div class="wizard-steps-nav">
                    ${this.STEPS.map((s, i) => `
                        <div class="wizard-step-dot ${i < this.currentStep ? 'done' : i === this.currentStep ? 'active' : ''}" title="${s.title}">
                            ${i < this.currentStep
                                ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
                                : i + 1
                            }
                        </div>
                    `).join('')}
                </div>

                <div class="wizard-body">
                    <div class="wizard-step-header">
                        <div class="wizard-step-num">Step ${this.currentStep + 1} of ${this.STEPS.length}</div>
                        <h3 class="wizard-step-title">${step.title}</h3>
                        <p class="wizard-step-desc">${step.description}</p>
                    </div>

                    <div class="wizard-fields" id="wizard-fields-body">
                        ${this._renderStepFields(this.currentStep)}
                    </div>

                    <div class="wizard-actions">
                        ${this.currentStep > 0
                            ? `<button class="btn btn-secondary" id="wizard-back">Back</button>`
                            : '<div></div>'
                        }
                        <div style="display:flex;gap:8px;align-items:center">
                            ${this.currentStep < this.STEPS.length - 1
                                ? `<button class="btn btn-secondary btn-sm" id="wizard-skip">Skip</button>
                                   <button class="btn btn-primary" id="wizard-next">Next →</button>`
                                : `<button class="btn btn-primary" id="wizard-generate">
                                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                       Generate Deck
                                   </button>`
                            }
                        </div>
                    </div>
                </div>
            </div>`;

        this._bindWizardEvents();
        this._bindFileInputs();
    },

    _renderStepFields(stepIdx) {
        const a = this.answers;
        if (stepIdx === 0) return `
            <div class="form-group">
                <label class="form-label">Event Name <span style="color:var(--error)">*</span></label>
                <input id="wf-event_name" class="form-input" type="text"
                    placeholder="e.g. ESG Advantage 2026"
                    value="${esc(a.event_name || '')}">
            </div>
            <div class="form-group">
                <label class="form-label">Prepared For (Client)</label>
                <input id="wf-client_name" class="form-input" type="text"
                    placeholder="e.g. MATRADE"
                    value="${esc(a.client_name || '')}">
            </div>
            <div class="wizard-row">
                <div class="form-group">
                    <label class="form-label">Event Date / Period</label>
                    <input id="wf-event_date" class="form-input" type="text"
                        placeholder="e.g. 15–16 July 2026"
                        value="${esc(a.event_date || '')}">
                </div>
                <div class="form-group">
                    <label class="form-label">Venue / Location</label>
                    <input id="wf-location" class="form-input" type="text"
                        placeholder="e.g. MATRADE Hall, MECC KL"
                        value="${esc(a.location || '')}">
                </div>
            </div>
            <div class="wizard-row">
                <div class="form-group">
                    <label class="form-label">Event Format</label>
                    <select id="wf-event_format" class="form-input">
                        ${['Conference','Exhibition','Conference + Exhibition','Forum','Summit','Workshop','Gala / Awards Dinner','Hybrid','Other'].map(o =>
                            `<option value="${esc(o)}" ${(a.event_format||'Conference')===o?'selected':''}>${esc(o)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Expected Attendance</label>
                    <input id="wf-attendance" class="form-input" type="text"
                        placeholder="e.g. 1,000+ delegates"
                        value="${esc(a.attendance || '')}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Upload Client Brief (PDF) <span class="form-hint">— optional, replaces manual answers if provided</span></label>
                <div class="file-drop-zone" id="pdf-drop-zone">
                    <div class="file-drop-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div id="pdf-drop-label" class="file-drop-label">
                        ${this.pdfFile ? `<span style="color:var(--success)">${esc(this.pdfFile.name)}</span>` : 'Drop PDF here or <label for="pdf-input" class="file-drop-link">browse</label>'}
                    </div>
                    <input id="pdf-input" type="file" accept=".pdf" style="display:none">
                </div>
            </div>`;

        if (stepIdx === 1) return `
            <div class="form-group">
                <label class="form-label">Why Are We Doing This?</label>
                <p class="form-hint" style="margin-bottom:6px">Background, market context, and the problem or opportunity this event addresses.</p>
                <textarea id="wf-rationale" class="form-input wizard-textarea" rows="5"
                    placeholder="e.g. Malaysia's 7,000 export-ready companies are losing access to premium global markets because they haven't mastered ESG compliance. This event bridges that gap...">${esc(a.rationale || '')}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Strategic Objectives / Goals</label>
                <textarea id="wf-objectives" class="form-input wizard-textarea" rows="4"
                    placeholder="e.g. Attract 50 institutional investors, position Malaysia as the ASEAN ESG hub, generate RM 2M in sponsorship revenue, launch the official ESG Readiness Toolkit...">${esc(a.objectives || '')}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Synapze's Role in This Event</label>
                <textarea id="wf-synapze_role" class="form-input wizard-textarea" rows="3"
                    placeholder="e.g. End-to-end event management, sponsorship conversion, digital infrastructure, strategic curation and stakeholder engagement">${esc(a.synapze_role || '')}</textarea>
            </div>`;

        if (stepIdx === 2) return `
            <div class="form-group">
                <label class="form-label">Key Visuals Concept</label>
                <p class="form-hint" style="margin-bottom:6px">Describe the visual direction. Upload reference images below.</p>
                <textarea id="wf-key_visuals" class="form-input wizard-textarea" rows="3"
                    placeholder="e.g. Clean corporate blue with gold accents, ocean-inspired gradients, tech-forward dark theme...">${esc(a.key_visuals || '')}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Visual References <span class="form-hint">— optional images</span></label>
                <div class="image-upload-zone" id="image-drop-zone">
                    <div class="file-drop-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                    <div class="file-drop-label">
                        Drop images here or <label for="image-input" class="file-drop-link">browse</label>
                    </div>
                    <input id="image-input" type="file" accept="image/*" multiple style="display:none">
                </div>
                <div id="image-preview-grid" class="image-preview-grid">
                    ${this._renderImagePreviews()}
                </div>
            </div>
            <div class="wizard-row">
                <div class="form-group">
                    <label class="form-label">Client Budget (if set)</label>
                    <input id="wf-client_budget" class="form-input" type="text"
                        placeholder="e.g. RM 500,000 total event budget"
                        value="${esc(a.client_budget || '')}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Special Gimmicks & Interactions</label>
                <textarea id="wf-special_gimmicks" class="form-input wizard-textarea" rows="4"
                    placeholder="e.g. Live AI demo station where attendees test ESG diagnostic tools, Ministerial signing ceremony, Real-time deal matchmaking board, Book launch, Award ceremony with live voting...">${esc(a.special_gimmicks || '')}</textarea>
            </div>`;

        return '';
    },

    _renderImagePreviews() {
        if (!this.imageFiles.length) return '';
        return this.imageFiles.map((f, i) => `
            <div class="img-preview-item">
                <img src="${URL.createObjectURL(f)}" alt="${esc(f.name)}">
                <button class="img-preview-remove" data-idx="${i}" title="Remove">×</button>
            </div>`).join('');
    },

    _collectStepValues(stepIdx) {
        const fields = {
            0: ['event_name', 'client_name', 'event_date', 'location', 'event_format', 'attendance'],
            1: ['rationale', 'objectives', 'synapze_role'],
            2: ['key_visuals', 'client_budget', 'special_gimmicks'],
        };
        for (const id of (fields[stepIdx] || [])) {
            const el = document.getElementById(`wf-${id}`);
            if (el) this.answers[id] = el.value.trim();
        }
    },

    _bindFileInputs() {
        // PDF input
        const pdfInput = document.getElementById('pdf-input');
        if (pdfInput) {
            pdfInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type === 'application/pdf') {
                    this.pdfFile = file;
                    const label = document.getElementById('pdf-drop-label');
                    if (label) label.innerHTML = `<span style="color:var(--success)">${esc(file.name)}</span> <button id="pdf-clear" class="btn-link" style="font-size:11px;margin-left:8px">Remove</button>`;
                    document.getElementById('pdf-clear')?.addEventListener('click', () => {
                        this.pdfFile = null;
                        pdfInput.value = '';
                        const lbl = document.getElementById('pdf-drop-label');
                        if (lbl) lbl.innerHTML = 'Drop PDF here or <label for="pdf-input" class="file-drop-link">browse</label>';
                    });
                }
            });

            const dropZone = document.getElementById('pdf-drop-zone');
            dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
            dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
            dropZone?.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file?.type === 'application/pdf') {
                    this.pdfFile = file;
                    const label = document.getElementById('pdf-drop-label');
                    if (label) label.innerHTML = `<span style="color:var(--success)">${esc(file.name)}</span>`;
                }
            });
        }

        // Image input
        const imgInput = document.getElementById('image-input');
        if (imgInput) {
            imgInput.addEventListener('change', (e) => {
                for (const f of e.target.files) this.imageFiles.push(f);
                this._refreshImagePreviews();
            });

            const imgDropZone = document.getElementById('image-drop-zone');
            imgDropZone?.addEventListener('dragover', (e) => { e.preventDefault(); imgDropZone.classList.add('drag-over'); });
            imgDropZone?.addEventListener('dragleave', () => imgDropZone.classList.remove('drag-over'));
            imgDropZone?.addEventListener('drop', (e) => {
                e.preventDefault();
                imgDropZone.classList.remove('drag-over');
                for (const f of e.dataTransfer.files) {
                    if (f.type.startsWith('image/')) this.imageFiles.push(f);
                }
                this._refreshImagePreviews();
            });

            // Remove individual images
            document.getElementById('image-preview-grid')?.addEventListener('click', (e) => {
                const btn = e.target.closest('.img-preview-remove');
                if (btn) {
                    this.imageFiles.splice(parseInt(btn.dataset.idx), 1);
                    this._refreshImagePreviews();
                }
            });
        }
    },

    _refreshImagePreviews() {
        const grid = document.getElementById('image-preview-grid');
        if (grid) grid.innerHTML = this._renderImagePreviews();
        // Re-bind remove buttons
        grid?.addEventListener('click', (e) => {
            const btn = e.target.closest('.img-preview-remove');
            if (btn) {
                this.imageFiles.splice(parseInt(btn.dataset.idx), 1);
                this._refreshImagePreviews();
            }
        });
    },

    _bindWizardEvents() {
        document.getElementById('wizard-back')?.addEventListener('click', () => {
            this._collectStepValues(this.currentStep);
            this.currentStep--;
            this._renderWizard();
        });

        document.getElementById('wizard-next')?.addEventListener('click', () => {
            if (!this._validateStep()) return;
            this._collectStepValues(this.currentStep);
            this.currentStep++;
            this._renderWizard();
        });

        document.getElementById('wizard-skip')?.addEventListener('click', () => {
            this._collectStepValues(this.currentStep);
            this.currentStep++;
            this._renderWizard();
        });

        document.getElementById('wizard-generate')?.addEventListener('click', () => {
            if (!this._validateStep()) return;
            this._collectStepValues(this.currentStep);
            this._generate();
        });
    },

    _validateStep() {
        if (this.currentStep === 0) {
            const name = document.getElementById('wf-event_name')?.value.trim();
            if (!name) {
                document.getElementById('wf-event_name')?.focus();
                Toast.show('Event name is required', 'error');
                return false;
            }
        }
        return true;
    },

    _renderGenerating() {
        return `
            <div class="wizard-container wizard-generating">
                <div class="generating-icon">
                    <div class="spinner" style="width:40px;height:40px;border-width:3px"></div>
                </div>
                <h3 style="margin:16px 0 8px;color:var(--text-primary)">Building Your Deck...</h3>
                <p style="color:var(--text-muted);font-size:13px">Claude is crafting your slide content. This usually takes 20–40 seconds.</p>
                <div class="generating-steps">
                    <div class="gen-step active" id="gen-step-0">Analysing your event brief</div>
                    <div class="gen-step" id="gen-step-1">Generating narrative structure</div>
                    <div class="gen-step" id="gen-step-2">Writing slide content</div>
                    <div class="gen-step" id="gen-step-3">Building PowerPoint file</div>
                </div>
            </div>`;
    },

    _renderResult() {
        const r = this.result;
        return `
            <div class="wizard-container wizard-result">
                <div class="result-icon">
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#cc785c" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                </div>
                <h3 class="result-title">Your Deck is Ready!</h3>
                <p class="result-subtitle">${esc(r.deck_title)}</p>
                <p class="result-meta">${r.slide_count} slides</p>
                <div class="result-actions">
                    <a href="${esc(API.slidesDownloadUrl(r.filename))}"
                       class="btn btn-primary result-download" download>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download PowerPoint
                    </a>
                    <button class="btn btn-secondary" id="slides-new">Build Another Deck</button>
                </div>
                <div class="result-note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Open in PowerPoint and apply your brand theme, colours, and logo.
                </div>
            </div>`;
    },

    _bindResultEvents() {
        document.getElementById('slides-new')?.addEventListener('click', () => {
            this.currentStep = 0;
            this.answers = {};
            this.pdfFile = null;
            this.imageFiles = [];
            this.result = null;
            this._renderWizard();
        });
    },

    async _generate() {
        this.isGenerating = true;
        this._renderWizard();

        // Animate steps
        let stepIdx = 1;
        const stepInterval = setInterval(() => {
            const el = document.getElementById(`gen-step-${stepIdx}`);
            if (el) el.classList.add('active');
            stepIdx++;
        }, 9000);

        try {
            const formData = new FormData();
            formData.append('answers', JSON.stringify(this.answers));
            if (this.pdfFile) formData.append('client_brief', this.pdfFile);
            this.imageFiles.forEach((f, i) => formData.append(`image_${i}`, f));

            const result = await API.post('/api/slides/generate', formData);
            clearInterval(stepInterval);
            this.isGenerating = false;
            this.result = result;
            this._renderWizard();
        } catch (err) {
            clearInterval(stepInterval);
            this.isGenerating = false;
            Toast.show(err.message || 'Generation failed. Please try again.', 'error');
            this.currentStep = this.STEPS.length - 1;
            this._renderWizard();
        }
    },
};

// ── Styles ────────────────────────────────────────────────────────────────────
const _slidesStyle = document.createElement('style');
_slidesStyle.textContent = `
.wizard-container { max-width: 700px; margin: 0 auto; padding: 0 0 40px; }
.wizard-progress { height: 3px; background: var(--bg-tertiary); border-radius: 2px; margin-bottom: 24px; overflow: hidden; }
.wizard-progress-bar { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s ease; }
.wizard-steps-nav { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.wizard-step-dot {
    width: 30px; height: 30px; border-radius: 50%; background: var(--bg-tertiary);
    border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; color: var(--text-muted); flex-shrink: 0;
}
.wizard-step-dot.active { background: var(--accent); border-color: var(--accent); color: white; }
.wizard-step-dot.done { background: var(--success); border-color: var(--success); color: white; }
.wizard-body { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 28px; }
.wizard-step-header { margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
.wizard-step-num { font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
.wizard-step-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 5px; }
.wizard-step-desc { font-size: 13px; color: var(--text-muted); }
.wizard-fields { display: flex; flex-direction: column; }
.wizard-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.wizard-textarea { resize: vertical; min-height: 80px; font-family: var(--font-sans); line-height: 1.5; }
.wizard-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border); }
.form-hint { font-size: 11px; color: var(--text-muted); }

/* File drop zones */
.file-drop-zone, .image-upload-zone {
    border: 1px dashed var(--border); border-radius: var(--radius-md);
    padding: 20px; text-align: center; cursor: pointer;
    transition: all var(--transition); background: var(--bg-primary);
}
.file-drop-zone:hover, .image-upload-zone:hover, .file-drop-zone.drag-over, .image-upload-zone.drag-over {
    border-color: var(--accent); background: var(--accent-dim);
}
.file-drop-icon { display: flex; justify-content: center; margin-bottom: 8px; color: var(--text-muted); }
.file-drop-label { font-size: 13px; color: var(--text-muted); }
.file-drop-link { color: var(--accent); cursor: pointer; text-decoration: underline; }
.btn-link { background: none; border: none; padding: 0; cursor: pointer; color: var(--text-muted); text-decoration: underline; }

/* Image previews */
.image-preview-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.img-preview-item { position: relative; width: 80px; height: 80px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); }
.img-preview-item img { width: 100%; height: 100%; object-fit: cover; }
.img-preview-remove {
    position: absolute; top: 2px; right: 2px; width: 18px; height: 18px;
    border-radius: 50%; background: rgba(0,0,0,0.7); color: white; border: none;
    font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    line-height: 1;
}

/* Generating */
.wizard-generating { text-align: center; padding: 60px 24px; }
.generating-icon { display: flex; justify-content: center; margin-bottom: 8px; }
.generating-steps { display: flex; flex-direction: column; gap: 8px; margin-top: 28px; text-align: left; max-width: 280px; margin-left: auto; margin-right: auto; }
.gen-step { font-size: 12px; color: var(--text-muted); padding: 7px 12px; border-radius: var(--radius-sm); background: var(--bg-tertiary); transition: all 0.4s; }
.gen-step.active { color: var(--accent); background: var(--accent-dim); font-weight: 600; }

/* Result */
.wizard-result { text-align: center; padding: 60px 24px; }
.result-icon { display: flex; justify-content: center; margin-bottom: 16px; }
.result-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.result-subtitle { font-size: 15px; color: var(--text-muted); margin-bottom: 4px; }
.result-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 28px; }
.result-actions { display: flex; gap: 12px; justify-content: center; margin-bottom: 24px; flex-wrap: wrap; }
.result-download { min-width: 200px; }
.result-note { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted); background: var(--bg-tertiary); padding: 8px 14px; border-radius: var(--radius-sm); max-width: 420px; }
`;
document.head.appendChild(_slidesStyle);
