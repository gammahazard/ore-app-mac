const { ipcRenderer } = require('electron');
const domElements = require('./domElements.js');
const sharedState = require('./sharedState.js');

let isMining = false;

function initializeMiningOperations() {
  domElements.startMinerBtn.addEventListener('click', startMining);
  domElements.stopMinerBtn.addEventListener('click', stopMining);

  // Add listener for mining state changes
  ipcRenderer.on('mining-state-changed', (_, newMiningState) => {
    isMining = newMiningState;
    sharedState.updateButtonStates();
  });
}

function startMining() {
  const currentProfile = sharedState.getCurrentProfile();
  if (!currentProfile) {
    alert('Please select or create a profile before starting mining.');
    return;
  }

  const formData = new FormData(domElements.minerForm);
  const options = Object.fromEntries(formData.entries());
  options.name = currentProfile.name;
  console.log('Options:', options);
  ipcRenderer.send('start-mining', options);
}

function stopMining() {
  ipcRenderer.send('stop-mining');
}

function getMiningState() {
  return isMining;
}

module.exports = {
  initializeMiningOperations,
  getMiningState
};