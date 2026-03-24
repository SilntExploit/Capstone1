function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    response.end(JSON.stringify(payload, null, 2));
}

function sendText(response, statusCode, body) {
    response.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8'
    });
    response.end(body);
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        let rawBody = '';

        request.on('data', chunk => {
            rawBody += chunk;
        });

        request.on('end', () => {
            if (!rawBody) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(rawBody));
            } catch (error) {
                reject(error);
            }
        });

        request.on('error', reject);
    });
}

module.exports = {
    sendJson,
    sendText,
    readRequestBody
};
