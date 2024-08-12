const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const createWindow = require('./utils/createWindow');
const checkOreCli = require('./utils/checkOreCli');
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
let minerProcess = null;

app.whenReady().then(() => {
    mainWindow = createWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});



app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('check-ore-cli', checkOreCli);

ipcMain.on('start-mining', (event, options) => {
    minerProcess = startMining(event, options, mainWindow, app);
});

ipcMain.on('stop-mining', (event) => {
    stopMining(event, mainWindow, minerProcess);
    minerProcess = null;  // Reset after stopping
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
