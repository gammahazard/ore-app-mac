const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const cleanLog = require('./cleanLog');
const buildMinerArgs = require('./minerArgs');
const stopMining = require('./stopMining');

const RESTART_DELAY = 5000; // 5 seconds delay before restarting

function startMining(event, options, mainWindow, app, onRestart) {
    let minerProcess;
    let isDestroyed = false;

    const args = buildMinerArgs(options);

    function restartMiner(reason) {
        if (isDestroyed) return;

        isDestroyed = true;
        const message = `Restarting miner due to ${reason}`;
        console.log(message);
        safeEmit(mainWindow.webContents, 'miner-output', message);

        stopMining(event, mainWindow, minerProcess)
            .then(() => {
                setTimeout(() => {
                    const newMiner = startMining(event, options, mainWindow, app, onRestart);
                    onRestart(newMiner);
                }, RESTART_DELAY);
            })
            .catch((error) => {
                console.error('Error stopping miner during restart:', error);
                setTimeout(() => {
                    const newMiner = startMining(event, options, mainWindow, app, onRestart);
                    onRestart(newMiner);
                }, RESTART_DELAY);
            });
    }

    const unbufferPath = '/usr/local/bin/unbuffer';
    const oreCliPath = path.join(os.homedir(), '.cargo', 'bin', 'ore');

    minerProcess = spawn(unbufferPath, [oreCliPath, 'mine', ...args], {
        shell: true,
        env: { ...process.env, TERM: 'xterm-256color' }
    });

    function safeEmit(target, eventName, ...args) {
        if (!isDestroyed && target && typeof target.send === 'function') {
            target.send(eventName, ...args);
        }
    }

    let lastLogContent = '';
    let lastLogTimestamp = 0;

    minerProcess.stdout.on('data', (data) => {
        if (isDestroyed) return;

        const cleanedOutput = cleanLog(data.toString().trim());
        const currentTime = Date.now();

        // Check for transaction submission attempts
        const submissionMatch = cleanedOutput.match(/Submitting transaction... \(attempt (\d+)\)/);
        if (submissionMatch) {
            const attemptNumber = parseInt(submissionMatch[1], 10);
            const txSubmissionCap = parseInt(options.txSubmissionCap, 10) || 150;
            
            if (attemptNumber >= txSubmissionCap) {
                console.log(`Reached TX submission cap (${txSubmissionCap}). Restarting miner.`);
                restartMiner('submission-cap');
                return;
            }
        }

        if (cleanedOutput.includes('ERROR Max retries')) {
            console.log('ERROR Max retries detected. Restarting miner.');
            restartMiner('max-retries');
            return;
        }

        if (cleanedOutput.includes('Best hash:')) {
            const match = cleanedOutput.match(/Best hash: (.+) \(difficulty (\d+)\)/);
            if (match) {
                const bestHash = match[1];
                const difficulty = parseInt(match[2], 10);

                const difficultyLogPath = path.join(app.getPath('userData'), `difficulty_${options.name}.log`);
                const logEntry = `Best hash: ${bestHash} (difficulty ${difficulty}), Timestamp: ${new Date().toISOString()}\n`;

                fs.appendFileSync(difficultyLogPath, logEntry);
                console.log(`Logged new best hash for profile: ${options.name}`);

                safeEmit(mainWindow.webContents, 'new-best-hash', { hash: bestHash, difficulty: difficulty });
            }
        }

        // Filter out duplicates based on time and content
        if (cleanedOutput !== lastLogContent || (currentTime - lastLogTimestamp) > 1000) {
            lastLogContent = cleanedOutput;
            lastLogTimestamp = currentTime;
            safeEmit(mainWindow.webContents, 'miner-output', cleanedOutput);
        }
    });

    minerProcess.stderr.on('data', (data) => {
        if (isDestroyed) return;

        const cleanedOutput = cleanLog(data.toString().trim());
        const currentTime = Date.now();

        // Filter out duplicates based on time and content
        if (cleanedOutput !== lastLogContent || (currentTime - lastLogTimestamp) > 1000) {
            lastLogContent = cleanedOutput;
            lastLogTimestamp = currentTime;
            safeEmit(mainWindow.webContents, 'miner-error', cleanedOutput);
        }
    });

    minerProcess.on('error', (error) => {
        if (!isDestroyed) {
            event.reply('mining-error', `Failed to start miner: ${error.message}`);
        }
    });

    minerProcess.on('close', (code) => {
        if (!isDestroyed) {
            const message = `Miner process exited with code ${code}`;
            console.log(message);
            safeEmit(mainWindow.webContents, 'miner-stopped', message);
        }
    });

    if (!isDestroyed) {
        event.reply('mining-started');
    }

    return minerProcess;
}

module.exports = startMining;