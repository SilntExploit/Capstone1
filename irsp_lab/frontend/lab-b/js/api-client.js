(function () {
    'use strict';

    function withQuery(path, params) {
        const url = new URL(path, window.location.origin);

        Object.entries(params || {}).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') return;
            url.searchParams.set(key, String(value));
        });

        return `${url.pathname}${url.search}`;
    }

    async function request(path, options) {
        if (!window.IRSP || typeof window.IRSP.fetchJSON !== 'function') {
            throw new Error('IRSP.fetchJSON is unavailable');
        }

        return window.IRSP.fetchJSON(path, options);
    }

    window.IRSPApi = {
        isAvailable() {
            return !!(window.fetch && window.IRSP && typeof window.IRSP.fetchJSON === 'function');
        },

        getAlerts(params = {}) {
            return request(withQuery('/api/alerts', params));
        },

        search(params = {}) {
            return request(withQuery('/api/search', params));
        },

        getAlertQuestion(alertKey) {
            return request(withQuery('/api/lab-b/questions', { alert_key: alertKey }));
        },

        checkAlertAnswer(alertKey, choiceId) {
            return request('/api/lab-b/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alert_key: alertKey, choice_id: choiceId })
            });
        },

        getTimelineEvents() {
            return request('/api/lab-b/timeline');
        },

        checkTimelineOrder(orderedIds) {
            return request('/api/lab-b/timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ordered_ids: orderedIds })
            });
        },

        getResponseOptions() {
            return request('/api/lab-b/response-options');
        },

        checkResponseSelection(selectedIds) {
            return request('/api/lab-b/response-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selected_ids: selectedIds })
            });
        }
    };
})();
