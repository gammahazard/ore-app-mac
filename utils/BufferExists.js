const fs = require('fs');

function findUnbufferPath() {
    const possiblePaths = [
        '/usr/local/bin/unbuffer',
        '/opt/homebrew/bin/unbuffer',
        '/usr/bin/unbuffer',
        '/usr/local/sbin/unbuffer',
        '/opt/local/bin/unbuffer'
    ];

    for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
            return path;
        }
    }

    throw new Error('unbuffer not found in common paths.');
}

module.exports = findUnbufferPath;
