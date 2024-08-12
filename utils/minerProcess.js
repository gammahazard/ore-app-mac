const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const findUnbufferPath = require('./BufferExists'); // Import the BufferExists function

function createMinerProcess(args) {
    const unbufferPath = findUnbufferPath(); // Use the BufferExists function to find the unbuffer path
    const oreCliPath = path.join(os.homedir(), '.cargo', 'bin', 'ore');
    return spawn(unbufferPath, [oreCliPath, 'mine', ...args], {
        shell: true,
        env: { ...process.env, TERM: 'xterm-256color' }
    });
}

module.exports = createMinerProcess;
