const fs = require('fs');
const path = require('path');

function readJson(dataDir, fileName) {
    const filePath = path.join(dataDir, fileName);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getSeedData(dataDir) {
    return {
        alerts: readJson(dataDir, 'alerts.json'),
        evidence: readJson(dataDir, 'evidence.json'),
        logs: readJson(dataDir, 'logs.json'),
        playback: readJson(dataDir, 'playback.json'),
        runs: readJson(dataDir, 'runs.json'),
        scenarios: readJson(dataDir, 'scenarios.json')
    };
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function createState(dataDir) {
    const seedData = getSeedData(dataDir);

    return {
        generated_at: seedData.logs.generated_at,
        alerts: clone(seedData.alerts.items),
        evidence: clone(seedData.evidence.items),
        logs: clone(seedData.logs.items),
        playback: clone(seedData.playback.items),
        runs: clone(seedData.runs.items),
        scenarios: clone(seedData.scenarios.items)
    };
}

module.exports = {
    createState
};
