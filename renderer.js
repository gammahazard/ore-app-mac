const { ipcRenderer } = require('electron');
const domElements = require('./renderer/domElements.js');
const { initializeMiningOperations } = require('./renderer/miningOperations.js');
const { initializeProfileManagement, getCurrentProfile, clearProfileForm, loadProfiles } = require('./renderer/profileManagement.js');
const { 
  initializeDifficultyManagement, 
  updateDifficultyInfo, 
  handleNewBestHash 
} = require('./renderer/difficultyManagement.js');
const { initializeModalManagement } = require('./renderer/modalManagement.js');
const { appendToLog, handleFeeTypeChange, setupLogUpdates } = require('./renderer/utils.js');
const cleanLog = require('./utils/cleanLog.js');

let lastLogMessage = ''; // To track the last log message to prevent duplicates

function initialize() {
  initializeMiningOperations();
  initializeProfileManagement();
  initializeDifficultyManagement(getCurrentProfile);
  initializeModalManagement();
  checkOreCliInstallation();
  setupEventListeners();
  setupLogUpdates();

}

// Event listeners
function setupEventListeners() {
  domElements.feeTypeSelect.addEventListener('change', handleFeeTypeChange);

  ipcRenderer.on('ore-balance-updated', (_, balance) => {
    document.getElementById('ore-balance').textContent = `ORE Balance: ${balance}`;
  });

  ipcRenderer.on('mining-started', handleMiningStarted);
  ipcRenderer.on('mining-stopping', handleMiningStopping);
  ipcRenderer.on('mining-stopped', handleMiningStopped);
  ipcRenderer.on('mining-error', handleMiningError);
  ipcRenderer.on('miner-output', (event, data) => handleOutput('miner-output', data));
  ipcRenderer.on('miner-error', handleMinerError);
  ipcRenderer.on('command-success', handleCommandSuccess);
  ipcRenderer.on('command-error', handleCommandError);
  ipcRenderer.on('profile-saved', handleProfileSaved);
  ipcRenderer.on('profile-deleted', handleProfileDeleted);
  ipcRenderer.on('profile-delete-error', handleProfileDeleteError);
  ipcRenderer.on('difficulty-updated', handleDifficultyUpdated);
  ipcRenderer.on('command-output', handleCommandOutput);
  ipcRenderer.on('new-best-hash', handleNewBestHash); // Moved under event listeners
}

// Ensure proper cleanup when the window is closed
function cleanup() {

  ipcRenderer.removeAllListeners();  // Remove all IPC listeners
}

// Call cleanup function before the window is unloaded
window.addEventListener('beforeunload', cleanup);

function checkOreCliInstallation() {
  ipcRenderer.invoke('check-ore-cli').then((result) => {
    if (result.installed) {
      domElements.oreCliStatus.textContent = `ore-cli found at: ${result.path}`;
      domElements.startMinerBtn.disabled = false;
      document.getElementById('app').style.display = 'block';
      domElements.feeTypeSelect.dispatchEvent(new Event('change'));
    } else {
      domElements.oreCliStatus.textContent = `ore-cli not found. Error: ${result.error}`;
      domElements.startMinerBtn.disabled = true;
      domElements.oreCliError.style.display = 'block';
    }
  });
}




function handleOutput(source, data) {
  const cleanedLog = cleanLog(data);

  // Only log if the cleaned log message is different from the last one
  if (cleanedLog && cleanedLog !== lastLogMessage) {
    appendToLog(cleanedLog);
    lastLogMessage = cleanedLog;
    console.log(`${source}:`, cleanedLog);
  }
}

function handleMiningStarted() {
  domElements.startMinerBtn.disabled = true;
  domElements.stopMinerBtn.disabled = false;
  appendToLog('Mining started');
}

function handleMiningStopping() {
  domElements.startMinerBtn.disabled = true;
  domElements.stopMinerBtn.disabled = true;
  appendToLog('Stopping miner...');
}

function handleMiningStopped() {
  domElements.startMinerBtn.disabled = false;
  domElements.stopMinerBtn.disabled = true;
  appendToLog('Mining stopped');
}

function handleMiningError(_, error) {
  console.error('Mining error:', error);
  appendToLog(`Error: ${error}`);
  domElements.startMinerBtn.disabled = false;
  domElements.stopMinerBtn.disabled = true;
}

function handleMinerOutput(_, data) {
  console.log('Miner output:', data);
  appendToLog(data);
  if (data.includes('panicked at') || data.includes('Error:')) {
    domElements.startMinerBtn.disabled = false;
    domElements.stopMinerBtn.disabled = true;
  }
}

function handleMinerError(_, error) {
  console.error('Miner error:', error);
  appendToLog(`Error: ${error}`);
  domElements.startMinerBtn.disabled = false;
  domElements.stopMinerBtn.disabled = true;
}

function handleCommandSuccess(_, message) {
  appendToLog(message);
  alert(message);
}

function handleCommandError(_, error) {
  appendToLog(`Error: ${error}`);
  alert(`Command failed: ${error}`);
}

function handleProfileSaved() {
  loadProfiles();
}

function handleProfileDeleted(_, updatedProfiles) {
  loadProfiles();
  alert('Profile deleted successfully');
  if (getCurrentProfile() && getCurrentProfile().name === profileName) {
    clearProfileForm();
  }
}

function handleProfileDeleteError(_, error) {
  alert(`Error deleting profile: ${error}`);
}

function handleDifficultyUpdated(_, updatedProfileName) {
  if (getCurrentProfile() && getCurrentProfile().name === updatedProfileName) {
    updateDifficultyInfo(getCurrentProfile);
  }
}

function handleCommandOutput(_, log) {
  appendToLog(log);
}

// Initialize the application
initialize();
