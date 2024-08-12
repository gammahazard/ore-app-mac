const path = require('path');
const fs = require('fs');

function readMinerLog(app) {
    const logPath = path.join(app.getPath('userData'), 'miner.log');
    try {
        return fs.readFileSync(logPath, 'utf8');
    } catch (error) {
        console.error('Error reading miner log:', error);
        return '';
    }
}

module.exports = readMinerLog;
