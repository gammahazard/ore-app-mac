const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const createWindow = require('./utils/createWindow');
const checkOreCli = require('./utils/install-checks/checkOreCli');
const startMining = require('./utils/startMining');
const stopMining = require('./utils/stopMining');
const saveProfile = require('./utils/saveProfile');
const loadProfiles = require('./utils/loadProfiles');
const executeCommand = require('./utils/executeCommand');
const oreBalance = require('./utils/oreBalance');
const minerLog = require('./utils/minerLog');
const deleteProfile = require('./utils/deleteProfile');
const {
    getAvgDifficulty,
    getDifficultyDetails,
    getBestHash
} = require('./utils/difficultyDetails');

let mainWindow;
let currentMiner = null;

function createMainWindow() {
    mainWindow = createWindow();

    mainWindow.on('close', (e) => {
        if (currentMiner) {
            e.preventDefault(); // Prevent the window from closing immediately
            stopMiningAndQuit();
        }
    });
}

function stopMiningAndQuit() {
    console.log('Stopping mining process before quitting...');
    stopMining(null, mainWindow, currentMiner)
        .then(() => {
            console.log('Mining process stopped successfully');
            currentMiner = null;
            app.quit(); // Quit the app after mining is stopped
        })
        .catch((error) => {
            console.error('Error stopping mining process:', error);
            app.quit(); // Quit the app even if there's an error
        });
}

function updateMinerReference(newMiner) {
    currentMiner = newMiner;
}

app.whenReady().then(() => {
    createMainWindow();
    
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('check-ore-cli', checkOreCli);

ipcMain.on('start-mining', (event, options) => {
    if (currentMiner) {
        event.reply('mining-error', 'Mining is already in progress');
        return;
    }
    currentMiner = startMining(event, options, mainWindow, app, updateMinerReference);
});

ipcMain.on('stop-mining', async (event) => {
    if (currentMiner) {
        try {
            await stopMining(event, mainWindow, currentMiner);
            currentMiner = null;
            console.log('Mining stopped successfully');
            event.reply('mining-stopped');
        } catch (error) {
            console.error('Error stopping mining:', error);
            event.reply('mining-error', 'Failed to stop mining');
        }
    } else {
        console.log('No active mining process to stop');
        event.reply('mining-error', 'No active mining process to stop');
    }
});

ipcMain.on('save-profile', (event, profile) => saveProfile(app, event, profile));

ipcMain.handle('load-profiles', () => loadProfiles(app));

ipcMain.on('execute-command', (event, options) => executeCommand(event, options, mainWindow));

ipcMain.handle('get-ore-balance', (event, keypairPath) => oreBalance(event, keypairPath, app.isPackaged));

ipcMain.handle('read-miner-log', () => minerLog(app));

ipcMain.handle('get-avg-difficulty', (event, profileName) => getAvgDifficulty(app, event, profileName));

ipcMain.handle('get-difficulty-details', (event, profileName) => getDifficultyDetails(app, event, profileName));

ipcMain.handle('get-best-hash', (event, profileName) => getBestHash(app, event, profileName));

ipcMain.handle('get-full-difficulty-log', (event, profileName) => getFullDifficultyLog(app, event, profileName));

ipcMain.on('delete-profile', (event, profileName) => deleteProfile(app, event, profileName));