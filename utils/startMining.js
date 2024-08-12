const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const cleanLog = require('./cleanLog');

let lastLogContent = '';
let lastLogTimestamp = 0;

function startMining(event, options, mainWindow, app) {
    let minerProcess;

    const unbufferPath = '/usr/local/bin/unbuffer';
    const oreCliPath = path.join(os.homedir(), '.cargo', 'bin', 'ore');
    const args = [oreCliPath, 'mine'];

    if (options.rpcUrl) args.push('--rpc', options.rpcUrl);
    if (options.keypairPath) args.push('--keypair', options.keypairPath);
    if (options.feePayerPath) args.push('--fee-payer', options.feePayerPath);
    if (options.feeType === 'dynamic') {
        args.push('--dynamic-fee');
        if (options.maxFeeCap) args.push('--priority-fee', options.maxFeeCap);
    } else if (options.feeType === 'dynamic-custom') {
        args.push('--dynamic-fee', '--dynamic-fee-url', options.dynamicFeeUrl);
        if (options.maxFeeCap) args.push('--priority-fee', options.maxFeeCap);
    } else if (options.feeType === 'static' && options.priorityFee) {
        args.push('--priority-fee', options.priorityFee);
    }
    if (options.cores && parseInt(options.cores) > 0) {
        args.push('--cores', options.cores);
    }

    minerProcess = spawn(unbufferPath, args, { 
        shell: true,
        env: { ...process.env, TERM: 'xterm-256color' }
    });

    minerProcess.stdout.on('data', (data) => {
        const cleanedOutput = cleanLog(data.toString().trim());
        const currentTime = Date.now();

        // Detect and log "Best hash" messages
        if (cleanedOutput.includes('Best hash:')) {
            const match = cleanedOutput.match(/Best hash: (.+) \(difficulty (\d+)\)/);
            if (match) {
                const bestHash = match[1];
                const difficulty = parseInt(match[2], 10);

                const difficultyLogPath = path.join(app.getPath('userData'), `difficulty_${options.name}.log`);
                const logEntry = `Best hash: ${bestHash} (difficulty ${difficulty}), Timestamp: ${new Date().toISOString()}\n`;
                
                fs.appendFileSync(difficultyLogPath, logEntry);
                console.log(`Logged new best hash for profile: ${options.name}`);
                
                // Notify the renderer process about the new best hash
                mainWindow.webContents.send('new-best-hash', { hash: bestHash, difficulty: difficulty });
            }
        }

        // Filter out duplicates based on time and content
        if (cleanedOutput !== lastLogContent || (currentTime - lastLogTimestamp) > 1000) {
            lastLogContent = cleanedOutput;
            lastLogTimestamp = currentTime;
            mainWindow.webContents.send('miner-output', cleanedOutput);
        }
    });

    minerProcess.stderr.on('data', (data) => {
        const cleanedOutput = cleanLog(data.toString().trim());
        const currentTime = Date.now();

        // Filter out duplicates based on time and content
        if (cleanedOutput !== lastLogContent || (currentTime - lastLogTimestamp) > 1000) {
            lastLogContent = cleanedOutput;
            lastLogTimestamp = currentTime;
            mainWindow.webContents.send('miner-error', cleanedOutput);
        }
    });

    minerProcess.on('error', (error) => {
        event.reply('mining-error', `Failed to start miner: ${error.message}`);
    });

    minerProcess.on('close', (code) => {
        mainWindow.webContents.send('miner-stopped', code);
    });

    event.reply('mining-started');
    
    return minerProcess;
}

module.exports = startMining;