const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const createWindow = require('./utils/createWindow');
const checkOreCli = require('./utils/install-checks/checkOreCli');
const findUnbufferPath = require('./utils/install-checks/BufferExists');
const findRustPath = require('./utils/install-checks/RustExists');
const findBrewPath = require('./utils/install-checks/BrewExists');
const startMining = require('./utils/startMining');
const stopMining = require('./utils/stopMining');
const saveProfile = require('./utils/saveProfile');
const loadProfiles = require('./utils/loadProfiles');
const executeCommand = require('./utils/executeCommand');
const oreBalance = require('./utils/oreBalance');
const minerLog = require('./utils/minerLog');
const deleteProfile = require('./utils/deleteProfile');
const getOREPrice = require('./utils/getTokenPrices');

const {
    getAvgDifficulty,
    getDifficultyDetails,
    getBestHash
} = require('./utils/difficultyDetails');



let mainWindow;
let currentMiner = null;

// Define the installation checks
const installationChecks = [
    { name: 'ore-cli', check: checkOreCli },
    { name: 'unbuffer', check: findUnbufferPath },
    { name: 'rust', check: findRustPath },
    { name: 'homebrew', check: findBrewPath}
];

function createMainWindow() {
    console.log('Creating main window...');
    mainWindow = createWindow();

    mainWindow.on('close', (e) => {
        if (currentMiner) {
            e.preventDefault(); 
            stopMiningAndQuit();
        }
    });

    console.log('Running installation checks...');
    runInstallationChecks();
}

async function runInstallationChecks() {
    const results = {};
    for (const check of installationChecks) {
        try {
            const result = await check.check();
            results[check.name] = result;
            console.log(`${check.name} check result:`, result);
        } catch (error) {
            console.error(`Error checking ${check.name}:`, error);
            results[check.name] = { installed: false, error: error.message };
        }
    }
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('installation-check-results', results);
    } else {
        console.error('Main window or webContents not available');
    }
}

setInterval(async () => {
    const orePrice = await getOREPrice();
    if (orePrice) {
        mainWindow.webContents.send('update-ore-price', orePrice);
        console.log("getting ore price", orePrice)
    }
}, 30000); 


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
            app.quit(); 
        });
}

function updateMinerReference(newMiner) {
    currentMiner = newMiner;
}

app.whenReady().then(() => {
    createMainWindow();

   
    setTimeout(() => {
        getOREPrice().then((orePrice) => {
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('update-ore-price', orePrice);
            }
        });
    }, 2500); // 2500 milliseconds = 2.5 seconds

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

//ipc renderer on
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
ipcMain.on('execute-command', (event, options) => executeCommand(event, options, mainWindow));
ipcMain.on('save-profile', (event, profile) => saveProfile(app, event, profile));
ipcMain.on('delete-profile', (event, profileName) => deleteProfile(app, event, profileName));
ipcMain.on('start-mining', (event, options) => {
    if (currentMiner) {
        event.reply('mining-error', 'Mining is already in progress');
        return;
    }
    currentMiner = startMining(event, options, mainWindow, app, updateMinerReference);
});
//ipc renderer handle
ipcMain.handle('load-profiles', () => loadProfiles(app));
ipcMain.handle('get-ore-balance', (event, keypairPath) => oreBalance(event, keypairPath, app.isPackaged));
ipcMain.handle('read-miner-log', () => minerLog(app));
ipcMain.handle('get-avg-difficulty', (event, profileName) => getAvgDifficulty(app, event, profileName));
ipcMain.handle('get-difficulty-details', (event, profileName) => getDifficultyDetails(app, event, profileName));
ipcMain.handle('get-best-hash', (event, profileName) => getBestHash(app, event, profileName));
ipcMain.handle('get-full-difficulty-log', (event, profileName) => getFullDifficultyLog(app, event, profileName));
ipcMain.handle('run-installation-checks', runInstallationChecks);

