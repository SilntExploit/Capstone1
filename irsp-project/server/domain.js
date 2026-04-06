const SEVERITY_ORDER = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
};

function normalizeValue(value) {
    return String(value || '').trim().toLowerCase();
}

function filterByScenario(items, scenarioId) {
    if (!scenarioId) return items;
    return items.filter(item => item.scenario_id === scenarioId);
}

function extractEmail(text) {
    const match = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0] : '';
}

function extractSenderEmail(record) {
    const eventText = String(record.event || '');
    const explicitMatch = eventText.match(/sender=([^\s"]+)/i);
    if (explicitMatch) return explicitMatch[1];

    if (/@/.test(String(record.user || ''))) {
        return String(record.user || '');
    }

    return extractEmail(eventText);
}

function extractDomain(email) {
    const normalized = String(email || '');
    const atIndex = normalized.indexOf('@');
    return atIndex >= 0 ? normalized.slice(atIndex + 1) : '';
}

function extractRecipient(eventText) {
    const match = String(eventText || '').match(/recipient=([^\s"]+)/i);
    return match ? match[1] : '';
}

function extractSubject(eventText) {
    const match = String(eventText || '').match(/subject="([^"]+)"/i);
    return match ? match[1] : '';
}

function extractAttachment(eventText) {
    const match = String(eventText || '').match(/attachment=([^\s"]+)/i);
    return match ? match[1] : '';
}

function extractOutcome(eventText) {
    const successMatch = String(eventText || '').match(/outcome=([^\s"]+)/i);
    if (successMatch) return successMatch[1];

    if (/failed password/i.test(eventText || '')) return 'FAILURE';
    if (/success/i.test(eventText || '')) return 'SUCCESS';
    return '';
}

function extractDestPort(record) {
    const eventText = String(record.event || '');
    const explicitMatch = eventText.match(/dest_port[=:](\d+)/i);
    if (explicitMatch) return explicitMatch[1];

    const destinationMatch = eventText.match(/\bto\s+(?:\d{1,3}\.){3}\d{1,3}:(\d+)\b/i);
    if (destinationMatch) return destinationMatch[1];

    const hostPortMatch = eventText.match(/\b(?:\d{1,3}\.){3}\d{1,3}:(\d+)\b/);
    if (hostPortMatch) return hostPortMatch[1];

    return '';
}

function globToRegExp(value) {
    const escaped = String(value)
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');

    return new RegExp(`^${escaped}$`, 'i');
}

function getRecordFieldValue(record, field) {
    const normalizedField = normalizeValue(field);
    const eventText = String(record.event || '');
    const senderEmail = extractSenderEmail(record);
    const recipientEmail = extractRecipient(eventText);

    const derived = {
        index: 'responsegrid',
        message: eventText,
        sender: senderEmail,
        sender_domain: extractDomain(senderEmail),
        recipient: recipientEmail,
        recipient_domain: extractDomain(recipientEmail),
        subject: extractSubject(eventText),
        attachment: extractAttachment(eventText),
        outcome: extractOutcome(eventText),
        dest_port: extractDestPort(record)
    };

    if (Object.prototype.hasOwnProperty.call(derived, normalizedField)) {
        return derived[normalizedField];
    }

    return record[normalizedField];
}

function getSearchableValues(record) {
    return [
        getRecordFieldValue(record, 'index'),
        record.timestamp,
        record.host,
        record.sourcetype,
        record.user,
        record.severity,
        record.event,
        record.technique_id,
        record.src_ip,
        record.dest_ip,
        getRecordFieldValue(record, 'sender'),
        getRecordFieldValue(record, 'sender_domain'),
        getRecordFieldValue(record, 'recipient'),
        getRecordFieldValue(record, 'recipient_domain'),
        getRecordFieldValue(record, 'subject'),
        getRecordFieldValue(record, 'attachment'),
        getRecordFieldValue(record, 'outcome'),
        getRecordFieldValue(record, 'dest_port')
    ];
}

function tokenizeQuery(query) {
    const tokens = [];
    const source = String(query || '');
    let index = 0;

    while (index < source.length) {
        const char = source[index];

        if (/\s/.test(char)) {
            index += 1;
            continue;
        }

        if (char === '(' || char === ')') {
            tokens.push({ type: char });
            index += 1;
            continue;
        }

        if (char === ',') {
            tokens.push({ type: ',' });
            index += 1;
            continue;
        }

        if (char === '"' || char === '\'') {
            const quote = char;
            let value = '';
            index += 1;

            while (index < source.length && source[index] !== quote) {
                value += source[index];
                index += 1;
            }

            if (index < source.length && source[index] === quote) {
                index += 1;
            }

            tokens.push({ type: 'TERM', value });
            continue;
        }

        const twoCharOperator = source.slice(index, index + 2);
        if (['>=', '<=', '!=', '=='].includes(twoCharOperator)) {
            tokens.push({ type: 'OP', value: twoCharOperator });
            index += 2;
            continue;
        }

        if (['=', ':', '>', '<'].includes(char)) {
            tokens.push({ type: 'OP', value: char });
            index += 1;
            continue;
        }

        let value = '';
        while (index < source.length) {
            const nextChar = source[index];
            if (/\s/.test(nextChar) || nextChar === '(' || nextChar === ')' || ['=', ':', '>', '<', '!'].includes(nextChar)) {
                break;
            }
            value += nextChar;
            index += 1;
        }

        if (value) {
            const keyword = normalizeValue(value);
            if (keyword === 'and' || keyword === 'or' || keyword === 'not') {
                tokens.push({ type: 'KEYWORD', value: keyword.toUpperCase() });
            } else if (['contains', 'has', 'startswith', 'in'].includes(keyword)) {
                tokens.push({ type: 'OP', value: keyword });
            } else {
                tokens.push({ type: 'TERM', value });
            }
            continue;
        }

        index += 1;
    }

    return tokens;
}

function parseQuery(query) {
    const tokens = tokenizeQuery(query);
    let index = 0;

    function peek(offset = 0) {
        return tokens[index + offset] || null;
    }

    function consume() {
        const token = tokens[index] || null;
        index += 1;
        return token;
    }

    function canStartExpression(token) {
        return !!token && (
            token.type === 'TERM' ||
            token.type === '(' ||
            (token.type === 'KEYWORD' && token.value === 'NOT')
        );
    }

    function parsePrimary() {
        const token = peek();

        if (!token) return null;

        if (token.type === '(') {
            consume();
            const expression = parseOr();
            if (peek() && peek().type === ')') {
                consume();
            }
            return expression;
        }

        if (token.type !== 'TERM') {
            return null;
        }

        const fieldToken = consume();
        const operatorToken = peek();
        const valueToken = peek(1);

        if (operatorToken && operatorToken.type === 'OP' && valueToken && valueToken.type === 'TERM') {
            consume();
            let value = consume().value;

            // Allow equality-style filters to keep colon-delimited values such as o365:message_trace.
            while (operatorToken.value !== ':' && peek() && peek().type === 'OP' && peek().value === ':' && peek(1) && peek(1).type === 'TERM') {
                consume();
                value += `:${consume().value}`;
            }

            return {
                type: 'field',
                field: fieldToken.value,
                operator: operatorToken.value,
                value
            };
        }

        if (operatorToken && operatorToken.type === 'OP' && operatorToken.value === 'in' && valueToken && valueToken.type === '(') {
            consume();
            consume();

            const values = [];
            while (peek() && peek().type !== ')') {
                if (peek().type === ',') {
                    consume();
                    continue;
                }

                if (peek().type === 'TERM') {
                    values.push(consume().value);
                    continue;
                }

                break;
            }

            if (peek() && peek().type === ')') {
                consume();
            }

            return {
                type: 'field',
                field: fieldToken.value,
                operator: operatorToken.value,
                value: values
            };
        }

        return {
            type: 'term',
            value: fieldToken.value
        };
    }

    function parseUnary() {
        const token = peek();

        if (token && token.type === 'KEYWORD' && token.value === 'NOT') {
            consume();
            return {
                type: 'not',
                value: parseUnary()
            };
        }

        return parsePrimary();
    }

    function parseAnd() {
        let left = parseUnary();

        while (true) {
            const token = peek();
            if (!token || token.type === ')' || (token.type === 'KEYWORD' && token.value === 'OR')) {
                break;
            }

            if (token.type === 'KEYWORD' && token.value === 'AND') {
                consume();
            } else if (!canStartExpression(token)) {
                break;
            }

            const right = parseUnary();
            left = {
                type: 'and',
                left,
                right
            };
        }

        return left;
    }

    function parseOr() {
        let left = parseAnd();

        while (true) {
            const token = peek();
            if (!token || token.type !== 'KEYWORD' || token.value !== 'OR') {
                break;
            }

            consume();
            const right = parseAnd();
            left = {
                type: 'or',
                left,
                right
            };
        }

        return left;
    }

    return parseOr();
}

function compareValues(field, operator, recordValue, expectedValue) {
    const actual = String(recordValue || '');
    const expectedList = Array.isArray(expectedValue) ? expectedValue.map(value => String(value || '')) : null;
    const expected = String(expectedValue || '');
    const normalizedField = normalizeValue(field);
    const normalizedActual = normalizeValue(actual);
    const normalizedExpected = normalizeValue(expected);

    if (operator === '!=') {
        return !compareValues(field, '=', recordValue, expectedValue);
    }

    if (operator === '==') {
        return compareValues(field, '=', recordValue, expectedValue);
    }

    if (operator === 'in') {
        return (expectedList || []).some(value => compareValues(field, '=', recordValue, value));
    }

    if (normalizedField === 'severity' && ['>', '>=', '<', '<=', '='].includes(operator)) {
        const actualRank = SEVERITY_ORDER[normalizedActual] || 0;
        const expectedRank = SEVERITY_ORDER[normalizedExpected] || 0;

        if (operator === '=') return actualRank === expectedRank;
        if (operator === '>') return actualRank > expectedRank;
        if (operator === '>=') return actualRank >= expectedRank;
        if (operator === '<') return actualRank < expectedRank;
        if (operator === '<=') return actualRank <= expectedRank;
    }

    const actualNumber = Number(actual);
    const expectedNumber = Number(expected);
    const numericComparison = Number.isFinite(actualNumber) && Number.isFinite(expectedNumber);

    if (numericComparison) {
        if (operator === '=') return actualNumber === expectedNumber;
        if (operator === '>') return actualNumber > expectedNumber;
        if (operator === '>=') return actualNumber >= expectedNumber;
        if (operator === '<') return actualNumber < expectedNumber;
        if (operator === '<=') return actualNumber <= expectedNumber;
    }

    if (operator === ':' || operator === '=') {
        if (expected === '*') {
            return actual.trim() !== '';
        }

        if (expected.includes('*')) {
            return globToRegExp(expected).test(actual);
        }

        if (operator === ':') {
            return normalizedActual.includes(normalizedExpected);
        }

        return normalizedActual === normalizedExpected;
    }

    if (operator === 'contains' || operator === 'has') {
        return normalizedActual.includes(normalizedExpected);
    }

    if (operator === 'startswith') {
        return normalizedActual.startsWith(normalizedExpected);
    }

    return false;
}

function evaluateQueryNode(node, record) {
    if (!node) return true;

    if (node.type === 'and') {
        return evaluateQueryNode(node.left, record) && evaluateQueryNode(node.right, record);
    }

    if (node.type === 'or') {
        return evaluateQueryNode(node.left, record) || evaluateQueryNode(node.right, record);
    }

    if (node.type === 'not') {
        return !evaluateQueryNode(node.value, record);
    }

    if (node.type === 'field') {
        const fieldValue = getRecordFieldValue(record, node.field);
        return compareValues(node.field, node.operator, fieldValue, node.value);
    }

    if (node.type === 'term') {
        const normalizedTerm = normalizeValue(node.value);
        if (!normalizedTerm) return true;

        return getSearchableValues(record).some(value => normalizeValue(value).includes(normalizedTerm));
    }

    return true;
}

function searchLogs(items, query) {
    const effectiveQuery = String(query || '')
        .replace(/^\s*search\s+/i, '')
        .replace(/^\s*responsegridlogs\s*\|\s*where\s+/i, '')
        .replace(/^\s*responsegridlogs\s+/i, '')
        .replace(/^\s*where\s+/i, '')
        .replace(/\s*\|[\s\S]*$/, '')
        .trim();
    const normalizedQuery = normalizeValue(effectiveQuery);
    if (!normalizedQuery) return items;

    const ast = parseQuery(effectiveQuery);

    return items.filter(item => evaluateQueryNode(ast, item));
}

function sortByTimestampDesc(items) {
    return items.slice().sort((left, right) => {
        return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    });
}

function sortByCursor(items) {
    return items.slice().sort((left, right) => {
        return Number(left.cursor || 0) - Number(right.cursor || 0);
    });
}

function formatTimestamp(date = new Date()) {
    return date.toISOString();
}

function buildFieldsText(record) {
    return Object.entries(record)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
}

function buildSearchResponse(logs, query, scenarioId) {
    const filteredByScenario = filterByScenario(logs, scenarioId);
    let matched;

    try {
        matched = searchLogs(filteredByScenario, query);
    } catch (error) {
        matched = filteredByScenario.filter(item => {
            return getSearchableValues(item).some(value => normalizeValue(value).includes(normalizeValue(query)));
        });
    }

    const severityCounts = matched.reduce((accumulator, item) => {
        const key = item.severity || 'unknown';
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
    }, {});

    return {
        query: query || '',
        scenario_id: scenarioId || null,
        total_matches: matched.length,
        severity_breakdown: severityCounts,
        results: sortByTimestampDesc(matched).slice(0, 25).map(item => Object.assign({}, item, {
            json: item,
            fields: buildFieldsText(item)
        }))
    };
}

function getNextCursor(state) {
    return state.playback.reduce((maxCursor, item) => {
        return Math.max(maxCursor, Number(item.cursor || 0));
    }, 0) + 1;
}

function createPlaybackEvent(state, event) {
    const nextCursor = getNextCursor(state);
    const playbackEvent = Object.assign({
        id: `pb-${nextCursor}`,
        cursor: nextCursor,
        timestamp: formatTimestamp()
    }, event);

    state.playback.push(playbackEvent);
    return playbackEvent;
}

function createEvidenceItem(state, item) {
    const evidenceItem = Object.assign({
        id: `ev-${Date.now()}`,
        collected_at: formatTimestamp(),
        status: 'collected'
    }, item);

    state.evidence.push(evidenceItem);
    return evidenceItem;
}

function appendActionLog(state, item) {
    const logItem = Object.assign({
        id: `evt-action-${Date.now()}`,
        timestamp: formatTimestamp()
    }, item);

    state.logs.push(logItem);
    return logItem;
}

function applyAction(state, body) {
    const scenarioId = body.scenario_id;
    const actionKey = body.alert_key || body.action_key || body.alert_id;
    const action = body.action || 'investigate';

    if (!scenarioId || !actionKey) {
        return {
            statusCode: 400,
            payload: {
                error: 'scenario_id and alert_key are required'
            }
        };
    }

    const alert = state.alerts.find(item => item.scenario_id === scenarioId && item.alert_key === actionKey);

    if (!alert) {
        return {
            statusCode: 404,
            payload: {
                error: 'Alert not found'
            }
        };
    }

    const alertStatusMap = {
        investigate: 'investigating',
        acknowledge: 'acknowledged',
        contain: 'contained'
    };

    alert.status = alertStatusMap[action] || action;

    let evidenceItem = null;
    let playbackEvent = null;
    let logItem = null;

    if (scenarioId === 'scenario-a' && actionKey === 'encryption' && action === 'investigate') {
        evidenceItem = createEvidenceItem(state, {
            scenario_id: scenarioId,
            type: 'script',
            title: 'Encryption script hash captured',
            source: 'container-01',
            summary: 'Analyst captured the malicious /tmp/.encrypt.sh hash and command-line arguments.',
            severity: 'high'
        });
        playbackEvent = createPlaybackEvent(state, {
            scenario_id: scenarioId,
            type: 'timeline',
            source: 'IR Lead',
            message: 'Encryption process confirmed and the malicious script has been triaged for containment.'
        });
        logItem = appendActionLog(state, {
            scenario_id: scenarioId,
            host: 'container-01',
            sourcetype: 'irsp:actions',
            severity: 'high',
            user: 'IR Lead',
            event: 'Analyst initiated ransomware investigation and captured script evidence.',
            technique_id: 'T1486'
        });
    }

    if (scenarioId === 'scenario-a' && actionKey === 'ssh' && action === 'acknowledge') {
        evidenceItem = createEvidenceItem(state, {
            scenario_id: scenarioId,
            type: 'identity',
            title: 'svc-backup auth pivot documented',
            source: 'idp-01',
            summary: 'Successful svc-backup authentication from 192.168.1.45 linked to failed SSH spray.',
            severity: 'medium'
        });
        playbackEvent = createPlaybackEvent(state, {
            scenario_id: scenarioId,
            type: 'chat',
            source: 'Identity',
            message: 'Credential abuse path confirmed. svc-backup activity has been preserved in the evidence locker.'
        });
        logItem = appendActionLog(state, {
            scenario_id: scenarioId,
            host: 'idp-01',
            sourcetype: 'irsp:actions',
            severity: 'medium',
            user: 'Identity',
            event: 'Analyst acknowledged SSH spray and linked it to svc-backup authentication.',
            technique_id: 'T1110'
        });
    }

    if (scenarioId === 'scenario-a' && actionKey === 'c2' && action === 'contain') {
        evidenceItem = createEvidenceItem(state, {
            scenario_id: scenarioId,
            type: 'network',
            title: 'C2 block evidence recorded',
            source: 'edge-fw-01',
            summary: 'Outbound TLS path to 203.0.113.42:8443 blocked and preserved as a containment artifact.',
            severity: 'critical'
        });
        playbackEvent = createPlaybackEvent(state, {
            scenario_id: scenarioId,
            type: 'timeline',
            source: 'Network',
            message: 'Perimeter block applied to 203.0.113.42:8443. Beacon traffic is no longer egressing the environment.'
        });
        logItem = appendActionLog(state, {
            scenario_id: scenarioId,
            host: 'edge-fw-01',
            sourcetype: 'irsp:actions',
            severity: 'critical',
            user: 'Network',
            event: 'Analyst applied containment to the active C2 destination.',
            technique_id: 'T1071'
        });
    }

    return {
        statusCode: 200,
        payload: {
            ok: true,
            action,
            alert,
            evidence_item: evidenceItem,
            playback_event: playbackEvent,
            log_item: logItem
        }
    };
}

module.exports = {
    applyAction,
    buildSearchResponse,
    filterByScenario,
    sortByCursor,
    sortByTimestampDesc
};
