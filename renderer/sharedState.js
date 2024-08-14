const domElements = require('./domElements.js');

let isMining = false;
let currentProfile = null;

function updateButtonStates() {
  domElements.startMinerBtn.disabled = isMining;
  domElements.stopMinerBtn.disabled = !isMining;
}

function setMiningState(state) {
  isMining = state;
  updateButtonStates();
}

function getMiningState() {
  return isMining;
}

function setCurrentProfile(profile) {
  currentProfile = profile;
  updateButtonStates();
}

function getCurrentProfile() {
  return currentProfile;
}


updateButtonStates();

module.exports = {
  updateButtonStates,
  setMiningState,
  getMiningState,
  setCurrentProfile,
  getCurrentProfile
};