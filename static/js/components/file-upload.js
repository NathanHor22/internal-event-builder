const FileUpload = {
    create(onUpload) {
        const zone = document.createElement('div');
        zone.className = 'file-upload-zone';
        zone.innerHTML = `
            <div class="file-upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
            </div>
            <div class="file-upload-text">Drop your event brief here or click to browse</div>
            <div class="file-upload-hint">Supports PDF and PPTX files (max 50MB)</div>
        `;
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.pptx';
        fileInput.style.display = 'none';

        zone.addEventListener('click', () => fileInput.click());
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) onUpload(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) onUpload(fileInput.files[0]);
        });

        zone.appendChild(fileInput);
        return zone;
    }
};
