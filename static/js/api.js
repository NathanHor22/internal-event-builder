const API = {
    async request(method, path, body = null) {
        const opts = { method, headers: {} };
        if (body && !(body instanceof FormData)) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        } else if (body instanceof FormData) {
            opts.body = body;
        }
        // Attach user-configured API key and model if available
        if (typeof ApiKeyManager !== 'undefined') {
            const active = ApiKeyManager.getActive();
            if (active) {
                opts.headers['X-Api-Key'] = active.key;
                opts.headers['X-Api-Model'] = active.model;
            }
        }
        const res = await fetch(path, opts);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || 'Request failed');
        }
        if (res.headers.get('content-type')?.includes('application/json')) {
            return res.json();
        }
        return res;
    },
    get: (path) => API.request('GET', path),
    post: (path, body) => API.request('POST', path, body),
    put: (path, body) => API.request('PUT', path, body),
    patch: (path, body) => API.request('PATCH', path, body),
    del: (path) => API.request('DELETE', path),

    // Events
    listEvents: () => API.get('/api/events'),
    createEvent: (data) => API.post('/api/events', data),
    getEvent: (id) => API.get(`/api/events/${id}`),
    updateEvent: (id, data) => API.put(`/api/events/${id}`, data),
    deleteEvent: (id) => API.del(`/api/events/${id}`),
    uploadBrief: (formData) => API.post('/api/events/upload', formData),

    // Campaigns
    listCampaigns: (eventId) => API.get(`/api/events/${eventId}/campaigns`),
    createCampaign: (eventId, data) => API.post(`/api/events/${eventId}/campaigns`, data),
    updateCampaign: (id, data) => API.put(`/api/campaigns/${id}`, data),
    deleteCampaign: (id) => API.del(`/api/campaigns/${id}`),

    // Content
    listContent: (campaignId) => API.get(`/api/campaigns/${campaignId}/content`),
    listEventContent: (eventId) => API.get(`/api/events/${eventId}/content`),
    createContent: (campaignId, data) => API.post(`/api/campaigns/${campaignId}/content`, data),
    updateContent: (id, data) => API.put(`/api/content/${id}`, data),
    deleteContent: (id) => API.del(`/api/content/${id}`),

    // Brand Voices
    listVoices: () => API.get('/api/brand-voices'),
    createVoice: (data) => API.post('/api/brand-voices', data),
    updateVoice: (id, data) => API.put(`/api/brand-voices/${id}`, data),
    deleteVoice: (id) => API.del(`/api/brand-voices/${id}`),

    // Platforms
    getEventPlatforms: (eventId) => API.get(`/api/events/${eventId}/platforms`),
    updateEventPlatforms: (eventId, data) => API.put(`/api/events/${eventId}/platforms`, data),

    // AI
    extractBrief: (eventId) => API.post('/api/ai/extract-brief', { event_id: eventId }),
    suggestPlatforms: (eventId) => API.post('/api/ai/suggest-platforms', { event_id: eventId }),
    generateIdeas: (eventId, campaignId) => API.post('/api/ai/generate-ideas', { event_id: eventId, campaign_id: campaignId }),
    writeContent: (contentId) => API.post('/api/ai/write-content', { content_id: contentId }),
    recommendAds: (eventId) => API.post('/api/ai/recommend-ads', { event_id: eventId }),

    // Export
    exportCSV: (eventId) => `/api/export/${eventId}/csv`,
    exportExcel: (eventId) => `/api/export/${eventId}/excel`,
    exportPDF: (eventId) => `/api/export/${eventId}/pdf`,
};
