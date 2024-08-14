const os = require('os');
const path = require('path');
const fs = require('fs');
const { dialog } = require('electron');
const cleanLog = require('./cleanLog');
const buildMinerArgs = require('./minerArgs');
const stopMining = require('./stopMining');
const checkMaxTX = require('./maxTXcheck');
const createMinerProcess = require('./minerProcess');
const { handleMinerOutput, resetPanicCount } = require('./logHandler');

const RESTART_DELAY = 5000; // 5 seconds delay before restarting

function startMining(event, options, mainWindow, app, onRestart, setMiningState) {
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
                    setMiningState(false);
                    const newMiner = startMining(event, options, mainWindow, app, onRestart, setMiningState);
                    onRestart(newMiner);
                }, RESTART_DELAY);
            })
            .catch((error) => {
                console.error('Error stopping miner during restart:', error);
                setMiningState(false);
                setTimeout(() => {
                    const newMiner = startMining(event, options, mainWindow, app, onRestart, setMiningState);
                    onRestart(newMiner);
                }, RESTART_DELAY);
            });
    }
    function showAlert(message, type = 'error') {
        dialog.showMessageBox(mainWindow, {
            type: type,
            title: type === 'error' ? 'Error' : 'Alert',
            message: message,
            buttons: ['OK']
        });
    }
    try {
        minerProcess = createMinerProcess(args);
    } catch (error) {
        console.error('Error creating miner process:', error);
        const errorMessage = `Failed to create miner process: ${error.message}`;
        event.reply('mining-error', errorMessage);
        showAlert(errorMessage);
        setMiningState(false);
        return null;
    }

    function safeEmit(target, eventName, ...args) {
        if (!isDestroyed && target && typeof target.send === 'function') {
            target.send(eventName, ...args);
        }
    }

    minerProcess.stdout.on('data', (data) => {
        if (isDestroyed) return;

        const { shouldRestart, shouldStop, reason } = handleMinerOutput(data, options, app, safeEmit, mainWindow);
        
        if (shouldStop) {
            if (reason === 'no-keypair') {
                // Handle the no-keypair scenario
                const message = 'Error: No Solana keypair found. Please generate a keypair before starting the miner.';
                console.log(message);
                showAlert(message);
                safeEmit(mainWindow.webContents, 'mining-error', message);
                stopMining(event, mainWindow, minerProcess).then(() => {
                    setMiningState(false);
                });
            } else {
                stopMining(event, mainWindow, minerProcess).then(() => {
                    setMiningState(false);
                });
            }
            return;
        }
        
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
            const errorMessage = `Failed to start miner: ${error.message}`;
            event.reply('mining-error', errorMessage);
            showAlert(errorMessage);
            setMiningState(false);
        }
    });

    minerProcess.on('close', (code) => {
        if (!isDestroyed) {
            const message = `Miner process exited with code ${code}`;
            console.log(message);
            safeEmit(mainWindow.webContents, 'miner-stopped', message);
            resetPanicCount();
            setMiningState(false);
        }
    });

    if (!isDestroyed) {
        event.reply('mining-started');
        setMiningState(true);
    }

    return minerProcess;
}

module.exports = startMining;