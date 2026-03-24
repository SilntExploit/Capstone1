const fs = require('fs');
const path = require('path');

function serveStatic(rootDir, mimeTypes, requestPath, response, sendText) {
    const safePath = requestPath === '/' ? '/index.html' : requestPath;
    const resolvedPath = path.normalize(path.join(rootDir, safePath));

    if (!resolvedPath.startsWith(rootDir)) {
        sendText(response, 403, 'Forbidden');
        return;
    }

    fs.readFile(resolvedPath, (error, fileBuffer) => {
        if (error) {
            if (error.code === 'ENOENT') {
                sendText(response, 404, 'Not found');
                return;
            }

            sendText(response, 500, 'Internal server error');
            return;
        }

        const extension = path.extname(resolvedPath).toLowerCase();
        const contentType = mimeTypes[extension] || 'application/octet-stream';

        response.writeHead(200, {
            'Content-Type': contentType
        });
        response.end(fileBuffer);
    });
}

module.exports = {
    serveStatic
};
