const fs = require('fs');
const path = require('path');
const cleanLog = require('./cleanLog');

let lastLogContent = '';
let lastLogTimestamp = 0;
let panicRestartCount = 0;

function handleMinerOutput(data, options, app, safeEmit, mainWindow) {
    const cleanedOutput = cleanLog(data.toString().trim());
    const currentTime = Date.now();

    // Check for panic
    if (cleanedOutput.includes('panicked at')) {
        console.log('Full panic error:');
        console.log(cleanedOutput);

        // Check for "No keypair found" error
        if (cleanedOutput.includes('No keypair found')) {
            const message = 'Error: No Solana keypair found. Please generate a keypair before starting the miner.';
            console.log(message);
            safeEmit(mainWindow.webContents, 'miner-output', message);
            return { shouldRestart: false, shouldStop: true, reason: 'no-keypair' };
        }

        panicRestartCount++;
        const message = `Miner panicked. Restart attempt ${panicRestartCount}.`;
        console.log(message);
        safeEmit(mainWindow.webContents, 'miner-output', message);
        safeEmit(mainWindow.webContents, 'miner-output', cleanedOutput);

        if (panicRestartCount > 2) {
            const stopMessage = 'Miner panicked 3 times. Stopping miner.';
            console.log(stopMessage);
            safeEmit(mainWindow.webContents, 'miner-output', stopMessage);
            return { shouldRestart: false, shouldStop: true, reason: 'repeated-panic' };
        }

        return { shouldRestart: true, reason: 'panic' };
    }

    // Existing checks for TX submission and max retries
    const submissionMatch = cleanedOutput.match(/Submitting transaction... \(attempt (\d+)\)/);
    if (submissionMatch) {
        const attemptNumber = parseInt(submissionMatch[1], 10);
        const txSubmissionCap = parseInt(options.txSubmissionCap, 10) || 150;
        
        if (attemptNumber >= txSubmissionCap) {
            const message = `Reached TX submission cap (${txSubmissionCap}). Restarting miner.`;
            console.log(message);
            safeEmit(mainWindow.webContents, 'miner-output', message);
            return { shouldRestart: true, reason: 'submission-cap' };
        }
    }

    if (cleanedOutput.includes('ERROR Max retries')) {
        const message = 'ERROR Max retries detected. Restarting miner.';
        console.log(message);
        safeEmit(mainWindow.webContents, 'miner-output', message);
        return { shouldRestart: true, reason: 'max-retries' };
    }

    // Existing code for handling best hash
    if (cleanedOutput.includes('Best hash:')) {
        const match = cleanedOutput.match(/Best hash: (.+) \(difficulty (\d+)\)/);
        if (match) {
            const bestHash = match[1];
            const difficulty = parseInt(match[2], 10);
            logBestHash(bestHash, difficulty, options, app);
            safeEmit(mainWindow.webContents, 'new-best-hash', { hash: bestHash, difficulty: difficulty });
        }
    }

    if (cleanedOutput !== lastLogContent || (currentTime - lastLogTimestamp) > 1000) {
        lastLogContent = cleanedOutput;
        lastLogTimestamp = currentTime;
        safeEmit(mainWindow.webContents, 'miner-output', cleanedOutput);
    }

    return { shouldRestart: false };
}

function logBestHash(bestHash, difficulty, options, app) {
    const difficultyLogPath = path.join(app.getPath('userData'), `difficulty_${options.name}.log`);
    const logEntry = `Best hash: ${bestHash} (difficulty ${difficulty}), Timestamp: ${new Date().toISOString()}\n`;
    fs.appendFileSync(difficultyLogPath, logEntry);
    console.log(`Logged new hash for profile: ${options.name}`);
}

function resetPanicCount() {
    panicRestartCount = 0;
}

module.exports = { handleMinerOutput, resetPanicCount };