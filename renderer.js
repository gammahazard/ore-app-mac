const { ipcRenderer } = require('electron');
const domElements = require('./renderer/domElements.js');
const { initializeMiningOperations } = require('./renderer/miningOperations.js');
const { initializeProfileManagement, clearProfileForm, loadProfiles } = require('./renderer/profileManagement.js');
const sharedState = require('./renderer/sharedState.js');
const { 
  initializeDifficultyManagement, 
  updateDifficultyInfo, 
  handleNewBestHash 
} = require('./renderer/difficultyManagement.js');
const { initializeModalManagement } = require('./renderer/modalManagement.js');
const { appendToLog, handleFeeTypeChange, setupLogUpdates } = require('./renderer/utils.js');
const cleanLog = require('./utils/cleanLog.js');

let lastLogMessage = ''; 

function initialize() {
  initializeMiningOperations();
  initializeProfileManagement();
  initializeDifficultyManagement(sharedState.getCurrentProfile);
  initializeModalManagement();
  checkInstallations();
  setupEventListeners();
  setupLogUpdates();

  // Update button states initially
  sharedState.updateButtonStates();

  const continueButton = document.getElementById('continue-anyway');
  continueButton.addEventListener('click', function() {
      document.getElementById('install-check-modal').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      console.log('User chose to continue despite missing tools');
  });
}

function checkInstallations() {
  console.log('Checking installations...');
  const modal = document.getElementById('install-check-modal');
  const modalContent = document.getElementById('modal-content');
  
  if (!modal || !modalContent) {
      console.error('Modal elements not found');
      return;
  }
  
  modalContent.textContent = 'Checking installations...';
  modal.style.display = 'block';
  console.log('Displaying modal...');
  
  ipcRenderer.invoke('run-installation-checks').then((results) => {
      console.log('Installation check results:', results);
      handleInstallationCheckResults(results);
  }).catch((error) => {
      console.error('Error running installation checks:', error);
  });
}

function handleInstallationCheckResults(results) {
  if (!results || typeof results !== 'object') {
      console.error('Invalid installation check results:', results);
      return;
  }

  console.log('Handling installation check results:', results);
  const modal = document.getElementById('install-check-modal');
  const modalContent = document.getElementById('modal-content');
  const continueOption = document.getElementById('continue-option');
  
  if (!modal || !modalContent) {
      console.error('Modal elements not found in handleInstallationCheckResults');
      return;
  }
  
  let allInstalled = true;
  let resultHtml = '';

  for (const [toolName, result] of Object.entries(results)) {
      const statusText = document.getElementById(`${toolName}-status-text`);
      const checkmark = document.getElementById(`${toolName}-checkmark`);
      
      if (!statusText || !checkmark) {
          console.error(`Elements for ${toolName} not found`);
          continue;
      }

      if (result.installed) {
          statusText.textContent = `${toolName.toUpperCase()} FOUND!`;
          checkmark.style.display = 'inline';
          resultHtml += `<p>${toolName} found at: ${result.path}</p>`;
          if (result.version) {
              resultHtml += `<p>${toolName} version: ${result.version}</p>`;
          }
      } else {
          statusText.textContent = `${toolName} not found`;
          checkmark.style.display = 'none';
          resultHtml += `<p>${toolName} error: ${result.error}</p>`;
          allInstalled = false;
      }
  }
  
  modalContent.innerHTML = resultHtml;
  
  if (allInstalled) {
      domElements.startMinerBtn.disabled = false;
      console.log('All tools found, will hide modal in 2 seconds');
      setTimeout(() => {
          modal.style.display = 'none';
          document.getElementById('app').style.display = 'block';
          console.log('Modal hidden, app displayed');
      }, 2000);
  } else {
      domElements.startMinerBtn.disabled = true;
      continueOption.style.display = 'block';
  }
}


// Event listeners
function setupEventListeners() {
  domElements.feeTypeSelect.addEventListener('change', handleFeeTypeChange);
  ipcRenderer.on('update-ore-price', (_, orePrice) => {
    if (domElements.orePrice) {
      domElements.orePrice.textContent = `ORE/USDC: ${orePrice}`;
    } else {
      console.error('ORE price element not found in DOM');
    }
  });
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
  ipcRenderer.on('new-best-hash', handleNewBestHash); 
 ipcRenderer.on('installation-check-results', (_, results) => {
    console.log('Received installation check results:', results);
    if (results) {
      handleInstallationCheckResults(results);
    } else {
      console.error('Received undefined installation check results');
    }
  });
}



// Ensure proper cleanup when the window is closed
function cleanup() {

  ipcRenderer.removeAllListeners();  // Remove all IPC listeners
}

// Call cleanup function before the window is unloaded
window.addEventListener('beforeunload', cleanup);


function handleOutput(source, data) {
  const cleanedLog = cleanLog(data);

  // displays cleaned log to user on ui
  if (cleanedLog && cleanedLog !== lastLogMessage) {
    appendToLog(cleanedLog);
    lastLogMessage = cleanedLog;
    console.log(`${source}:`, cleanedLog);
  }
}
//btn control for started miner
function handleMiningStarted() {
  sharedState.setMiningState(true);
  appendToLog('Mining started');
}

function handleMiningStopping() {
  domElements.startMinerBtn.disabled = true;
  domElements.stopMinerBtn.disabled = true;
  appendToLog('Stopping miner...');
}

function handleMiningStopped() {
  sharedState.setMiningState(false);
  appendToLog('Mining stopped');
}

function handleMiningError(_, error) {
  console.error('Mining error:', error);
  appendToLog(`Error: ${error}`);
  sharedState.setMiningState(false);
}

function handleMinerError(_, error) {
  console.error('Miner error:', error);
  appendToLog(`Error: ${error}`);
  sharedState.setMiningState(false);
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
