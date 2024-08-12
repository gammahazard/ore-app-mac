const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

function createMinerProcess(args) {
    const unbufferPath = '/usr/local/bin/unbuffer';
    const oreCliPath = path.join(os.homedir(), '.cargo', 'bin', 'ore');
    return spawn(unbufferPath, [oreCliPath, 'mine', ...args], {
        shell: true,
        env: { ...process.env, TERM: 'xterm-256color' }
    });
}

module.exports = createMinerProcess;