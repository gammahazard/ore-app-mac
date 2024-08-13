const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const findUnbufferPath = require('./install-checks/BufferExists'); 

function createMinerProcess(args) {
    const unbufferResult = findUnbufferPath();
    if (!unbufferResult.installed) {
        throw new Error('Unbuffer is not installed or not found');
    }
    const unbufferPath = unbufferResult.path;
    
    const oreCliPath = path.join(os.homedir(), '.cargo', 'bin', 'ore');
    
    if (typeof unbufferPath !== 'string') {
        throw new Error('Invalid unbuffer path');
    }

    return spawn(unbufferPath, [oreCliPath, 'mine', ...args], {
        shell: true,
        env: { ...process.env, TERM: 'xterm-256color' }
    });
}

module.exports = createMinerProcess;