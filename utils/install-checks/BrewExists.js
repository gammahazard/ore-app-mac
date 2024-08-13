const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

function checkBrewInstallation() {
    console.log('Checking Homebrew installation...');
    
    if (os.platform() !== 'darwin') {
        console.log('Not running on macOS');
        return { installed: false, error: 'Not running on macOS' };
    }

    const commonPaths = [
        '/usr/local/bin/brew',
        '/opt/homebrew/bin/brew',
        '/homebrew/bin/brew',
        `${os.homedir()}/homebrew/bin/brew`
    ];

    for (const path of commonPaths) {
        try {
            console.log(`Checking path: ${path}`);
            if (fs.existsSync(path)) {
                const brewVersion = execSync(`${path} --version`, { encoding: 'utf-8' });
                console.log('Homebrew found at:', path);
                return { installed: true, path: path, version: brewVersion.trim() };
            }
        } catch (e) {
            console.log(`Homebrew not found at: ${path}`);
        }
    }

    try {
        console.log('Checking if brew is available in PATH...');
        const brewVersion = execSync('brew --version', { encoding: 'utf-8' });
        console.log('Homebrew found in PATH');
        return { installed: true, path: 'brew found in PATH', version: brewVersion.trim() };
    } catch (error) {
        console.log('Homebrew not found in PATH or common locations');
        return { installed: false, error: 'Homebrew not found in PATH or common locations' };
    }
}

// Run the check and log the result
console.log('Starting Homebrew installation check...');
const result = checkBrewInstallation();
console.log('Homebrew check result:', result);

module.exports = checkBrewInstallation;