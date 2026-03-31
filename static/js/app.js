// HTML escape utility
function esc(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// Router
const Router = {
    routes: {
        '#/': DashboardPage,
        '#/events': EventsPage,
        '#/brand-voices': BrandVoicesPage,
        '#/export': ExportPage,
    },

    init() {
        window.addEventListener('hashchange', () => this.navigate());
        this.navigate();
    },

    async navigate() {
        const hash = location.hash || '#/';
        const container = document.getElementById('main-content');
        Sidebar.render();

        // Event detail route
        const eventMatch = hash.match(/^#\/events\/(\d+)$/);
        if (eventMatch) {
            await EventDetailPage.render(container, parseInt(eventMatch[1]));
            Sidebar.updateStats();
            return;
        }

        // New event shortcut
        if (hash === '#/events/new') {
            location.hash = '#/events';
            setTimeout(() => EventsPage.showNewEventModal(), 100);
            return;
        }

        const page = this.routes[hash];
        if (page) {
            await page.render(container);
        } else {
            container.innerHTML = '<div class="empty-state"><p class="empty-state-text">Page not found</p><p class="empty-state-hint"><a href="#/">Go to Dashboard</a></p></div>';
        }
        Sidebar.updateStats();
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) location.hash = '#/';
    Router.init();
    ApiKeyManager._updateTopbar();
});
