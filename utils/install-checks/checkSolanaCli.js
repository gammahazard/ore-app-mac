const os = require('os');
const path = require('path');
const fs = require('fs').promises;

async function checkSolanaCli() {
    const homeDir = os.homedir();
    const commonPaths = [
        path.join(homeDir, '.local', 'share', 'solana', 'install', 'active_release', 'bin', 'solana'),
        path.join(homeDir, '.cargo', 'bin', 'solana'),
        '/usr/local/bin/solana',
        '/usr/bin/solana'
    ];

    for (const solanaPath of commonPaths) {
        try {
            await fs.access(solanaPath, fs.constants.X_OK);
            return { installed: true, path: solanaPath };
        } catch (error) {
            // Path not found or not executable, continue to next path
        }
    }

    return { installed: false, error: 'Solana CLI not found in common paths' };
}

module.exports = checkSolanaCli;