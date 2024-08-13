const fs = require('fs');
const path = require('path');
const cleanLog = require('./cleanLog');

let lastLogContent = '';
let lastLogTimestamp = 0;

function handleMinerOutput(data, options, app, safeEmit, mainWindow) {
    const cleanedOutput = cleanLog(data.toString().trim());
    const currentTime = Date.now();

    // look for trx submission attempts and restart if it hits the specified cap 
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
//update new best hash if one is found
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

module.exports = { handleMinerOutput };