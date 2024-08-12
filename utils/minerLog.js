const path = require('path');
const fs = require('fs');

function minerLog(app) {
    const logPath = path.join(app.getPath('userData'), 'miner.log');
    try {
        if (!fs.existsSync(logPath)) {
            // If the log file doesn't exist, create it
            fs.writeFileSync(logPath, '', 'utf8');
        }
        return fs.readFileSync(logPath, 'utf8');
    } catch (error) {
        console.error('Error reading miner log:', error);
        return '';
    }
}

module.exports = minerLog;
