const os = require('os');
const path = require('path');
const fs = require('fs');
const cleanLog = require('./cleanLog');
const buildMinerArgs = require('./minerArgs');
const stopMining = require('./stopMining');
const checkMaxTX = require('./maxTXcheck');
const createMinerProcess = require('./minerProcess');
const { handleMinerOutput } = require('./logHandler');

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

    minerProcess = createMinerProcess(args);

    function safeEmit(target, eventName, ...args) {
        if (!isDestroyed && target && typeof target.send === 'function') {
            target.send(eventName, ...args);
        }
    }

    minerProcess.stdout.on('data', (data) => {
        if (isDestroyed) return;

        const { shouldRestart, reason } = handleMinerOutput(data, options, app, safeEmit, mainWindow);
        if (shouldRestart) {
            restartMiner(reason);
            return;
        }

        const cleanedOutput = cleanLog(data.toString().trim());
        if (checkMaxTX(cleanedOutput, options.txSubmissionCap)) {
            restartMiner('submission-cap');
            return;
        }
    });

    minerProcess.stderr.on('data', (data) => {
        if (isDestroyed) return;

        const cleanedOutput = cleanLog(data.toString().trim());
        safeEmit(mainWindow.webContents, 'miner-error', cleanedOutput);
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