// File: renderer/miningOperations.js
const { ipcRenderer } = require('electron');
const domElements = require('./domElements.js');
const { getCurrentProfile } = require('./profileManagement.js');

function initializeMiningOperations() {
  domElements.startMinerBtn.addEventListener('click', startMining);
  domElements.stopMinerBtn.addEventListener('click', stopMining);
}

function startMining() {
  const formData = new FormData(domElements.minerForm);
  const options = Object.fromEntries(formData.entries());
  options.name = getCurrentProfile() ? getCurrentProfile().name : 'default';
  console.log('Options:', options);
  ipcRenderer.send('start-mining', options);
}

function stopMining() {
  ipcRenderer.send('stop-mining');
}

module.exports = {
  initializeMiningOperations
};