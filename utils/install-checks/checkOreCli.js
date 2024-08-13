const os = require('os');
const path = require('path');
const fs = require('fs');

async function checkOreCli() {
    const homeDir = os.homedir();
    const orePath = path.join(homeDir, '.cargo', 'bin', 'ore');
  
    try {
        await fs.promises.access(orePath, fs.constants.X_OK);
        return { installed: true, path: orePath };
    } catch (error) {
        return { installed: false, error: error.message };
    }
}

module.exports = checkOreCli;