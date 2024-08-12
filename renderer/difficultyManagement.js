const { ipcRenderer } = require('electron');
const domElements = require('./domElements.js');

let currentGetProfileFunc;

function initializeDifficultyManagement(getCurrentProfileFunc) {
  currentGetProfileFunc = getCurrentProfileFunc;
  domElements.showDifficultyDetailsBtn.addEventListener('click', () => showDifficultyDetails());
  startPeriodicDifficultyUpdates();
}

function updateDifficultyInfo() {
  const profile = currentGetProfileFunc();
  if (profile) {
    ipcRenderer.invoke('get-avg-difficulty', profile.name).then((avg) => {
      domElements.avgDifficulty.textContent = `Average Difficulty: ${avg}`;
    });
    ipcRenderer.invoke('get-best-hash', profile.name).then((bestHash) => {
      if (bestHash) {
        domElements.bestHashElement.textContent = `Best Hash: ${bestHash.hash} (difficulty ${bestHash.difficulty})`;
      } else {
        domElements.bestHashElement.textContent = 'Best Hash: N/A';
      }
    });
  } else {
    domElements.avgDifficulty.textContent = 'Average Difficulty: N/A';
    domElements.bestHashElement.textContent = 'Best Hash: Select Profile';
  }
}

function showDifficultyDetails() {
  const profile = currentGetProfileFunc();
  if (profile) {
    ipcRenderer.invoke('get-difficulty-details', profile.name).then((details) => {
      const modalContent = domElements.difficultyModal.querySelector('#modal-content');
      modalContent.textContent = details;
      domElements.difficultyModal.style.display = 'block';
    });
  } else {
    alert('Please select a profile first');
  }
}

function startPeriodicDifficultyUpdates() {
  // Initial update
  updateDifficultyInfo();
  
  // Set up interval for periodic updates
  setInterval(() => {
    updateDifficultyInfo();
  }, 10000); // Update every 10 seconds
}

function handleNewBestHash(event, data) {
  const profile = currentGetProfileFunc();
  if (profile) {
    domElements.bestHashElement.textContent = `Best Hash: ${data.hash} (difficulty ${data.difficulty})`;
    // Trigger an update of the average difficulty as well
    updateDifficultyInfo();
  }
}

module.exports = {
  initializeDifficultyManagement,
  updateDifficultyInfo,
  handleNewBestHash
};