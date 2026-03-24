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

        getScenarios(params = {}) {
            return request(withQuery('/api/scenarios', params));
        },

        getAlerts(params = {}) {
            return request(withQuery('/api/alerts', params));
        },

        getLogs(params = {}) {
            return request(withQuery('/api/logs', params));
        },

        getRuns(params = {}) {
            return request(withQuery('/api/runs', params));
        },

        search(params = {}) {
            return request(withQuery('/api/search', params));
        },

        getEvidence(params = {}) {
            return request(withQuery('/api/evidence', params));
        },

        getLive(params = {}) {
            return request(withQuery('/api/live', params));
        },

        postAction(payload) {
            return request('/api/actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        }
    };
})();
