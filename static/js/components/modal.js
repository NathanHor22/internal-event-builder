const Modal = {
    open({ title, content, footer, cls = '' }) {
        this.close();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modal-overlay';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) Modal.close(); });

        const modal = document.createElement('div');
        modal.className = `modal ${cls}`;
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="btn-icon" onclick="Modal.close()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="modal-body">${content}</div>
            ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        `;
        overlay.appendChild(modal);
        document.getElementById('modal-root').appendChild(overlay);
    },
    close() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.remove();
    }
};
