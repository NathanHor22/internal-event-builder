const Sidebar = {
    navItems: [
        { hash: '#/', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', label: 'Dashboard' },
        { hash: '#/events', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label: 'Events' },
        { hash: '#/brand-voices', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>', label: 'Brand Voices' },
        { hash: '#/export', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>', label: 'Export' },
        { hash: '#/slides', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', label: 'Slide Generator' },
    ],

    render() {
        const nav = document.getElementById('sidebar-nav');
        const currentHash = location.hash || '#/';
        nav.innerHTML = this.navItems.map(item => {
            const isActive = currentHash === item.hash || (item.hash !== '#/' && currentHash.startsWith(item.hash));
            return `<a href="${item.hash}" class="sidebar-link${isActive ? ' active' : ''}">${item.icon}<span>${item.label}</span></a>`;
        }).join('');
    },

    async updateStats() {
        try {
            const events = await API.listEvents();
            const totalContent = events.reduce((sum, e) => sum + (e.content_count || 0), 0);
            document.getElementById('sidebar-stats').innerHTML = `
                <div>${events.length} events</div>
                <div>${totalContent} content pieces</div>
            `;
        } catch { /* ignore */ }
    }
};

// Add sidebar link styles
const sidebarStyle = document.createElement('style');
sidebarStyle.textContent = `
.sidebar-link {
    display: flex; align-items: center; gap: 10px; padding: 10px 20px;
    color: var(--text-secondary); font-size: 13px; font-weight: 500;
    transition: all var(--transition); text-decoration: none;
}
.sidebar-link:hover { color: var(--text-primary); background: var(--bg-hover); }
.sidebar-link.active { color: var(--accent); background: var(--accent-dim); border-right: 2px solid var(--accent); }
.sidebar-link svg { flex-shrink: 0; }
`;
document.head.appendChild(sidebarStyle);
