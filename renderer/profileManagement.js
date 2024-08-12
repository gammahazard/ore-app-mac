// File: renderer/profileManagement.js
const { ipcRenderer } = require('electron');
const domElements = require('./domElements.js');
const difficultyManagement = require('./difficultyManagement.js');

let currentProfile = null;

function initializeProfileManagement() {
  domElements.saveProfileBtn.addEventListener('click', saveProfile);
  loadProfiles();
}

function getCurrentProfile() {
  return currentProfile;
}

function saveProfile() {
  const formData = new FormData(domElements.minerForm);
  const profile = Object.fromEntries(formData.entries());
  profile.name = domElements.profileNameInput.value.trim();
  if (profile.name === '') {
    alert('Profile name cannot be empty');
    return;
  }
  ipcRenderer.send('save-profile', profile);
}

function loadProfiles() {
  ipcRenderer.invoke('load-profiles').then((profiles) => {
    domElements.profileList.innerHTML = '';
    profiles.forEach((profile) => {
      const profileContainer = document.createElement('div');
      profileContainer.classList.add('profile-container');

      const button = document.createElement('button');
      button.textContent = profile.name;
      button.classList.add('profile-button');
      button.addEventListener('click', () => loadProfile(profile));

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.classList.add('delete-profile-button');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProfile(profile.name);
      });

      profileContainer.appendChild(button);
      profileContainer.appendChild(deleteBtn);
      domElements.profileList.appendChild(profileContainer);
    });
  });
}

function loadProfile(profile) {
  currentProfile = profile;
  Object.keys(profile).forEach((key) => {
    const input = domElements.minerForm.elements[key];
    if (input) {
      input.value = profile[key];
    }
  });
  domElements.profileNameInput.value = profile.name;
  domElements.feeTypeSelect.dispatchEvent(new Event('change'));
  difficultyManagement.updateDifficultyInfo(getCurrentProfile);

  ipcRenderer.invoke('get-ore-balance', profile.keypairPath).then((balance) => {
    document.getElementById('ore-balance').textContent = `${balance}`;
  }).catch((error) => {
    document.getElementById('ore-balance').textContent = 'Balance: Error';
    console.error('Failed to get ORE balance:', error);
  });
}

function deleteProfile(profileName) {
  if (confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
    ipcRenderer.send('delete-profile', profileName);
  }
}

function clearProfileForm() {
  domElements.minerForm.reset();
  domElements.profileNameInput.value = '';
  difficultyManagement.updateDifficultyInfo(getCurrentProfile);
}

module.exports = {
  initializeProfileManagement,
  getCurrentProfile,
  clearProfileForm,
  loadProfiles
};
