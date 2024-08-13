const { execSync } = require('child_process');
const os = require('os');

function checkRustInstallation() {
    console.log('Checking Rust installation...');
    
    if (os.platform() !== 'darwin') {
        console.log('Not running on macOS');
        return { installed: false, error: 'Not running on macOS' };
    }

    try {
        console.log('Checking if rustc is available in PATH...');
        const rustcVersion = execSync('rustc --version', { encoding: 'utf-8' });
        console.log('Rust found in PATH:', rustcVersion.trim());
        return { installed: true, path: 'rustc found in PATH', version: rustcVersion.trim() };
    } catch (error) {
        console.log('rustc not found in PATH, checking common locations...');
        const commonPaths = [
            '/usr/local/bin/rustc',
            `${os.homedir()}/.cargo/bin/rustc`,
            '/opt/homebrew/bin/rustc'
        ];

        for (const path of commonPaths) {
            try {
                console.log(`Checking path: ${path}`);
                const rustcVersion = execSync(`${path} --version`, { encoding: 'utf-8' });
                console.log('Rust found at:', path);
                return { installed: true, path: path, version: rustcVersion.trim() };
            } catch (e) {
                console.log(`Rust not found at: ${path}`);
            }
        }

        console.log('Rust not found in any common locations');
        return { installed: false, error: 'Rust not found in common locations' };
    }
}

// Run the check and log the result
console.log('Starting Rust installation check...');
const result = checkRustInstallation();
console.log('Rust check result:', result);

module.exports = checkRustInstallation;