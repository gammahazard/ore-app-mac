const { ipcRenderer } = require('electron');
const domElements = require('./domElements.js');
const difficultyManagement = require('./difficultyManagement.js');

let currentProfile = null;
let balanceInterval = null; // Interval ID for checking balance

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

  // Ensure the oreBalance element is visible and has some placeholder text
  domElements.oreBalance.textContent = 'Loading ORE Balance...';

  // Clear the existing interval if there is one
  if (balanceInterval) {
    clearInterval(balanceInterval);
  }

  // Immediately fetch the balance
  fetchOreBalance(profile.keypairPath);

  // Set an interval to fetch the balance every 10 seconds
  balanceInterval = setInterval(() => {
    fetchOreBalance(profile.keypairPath);
  }, 10000); // 10000 milliseconds = 10 seconds
}

function fetchOreBalance(keypairPath) {
  ipcRenderer.invoke('get-ore-balance', keypairPath).then((balance) => {
    domElements.oreBalance.textContent = `ORE Balance: ${balance}`;
  }).catch((error) => {
    domElements.oreBalance.textContent = 'Balance: Error';
    console.error('Failed to get ORE balance:', error);
  });
}


function deleteProfile(profileName) {
  if (confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
    ipcRenderer.send('delete-profile', profileName);
  }
}

function clearProfileForm() {
  if (balanceInterval) {
    clearInterval(balanceInterval); // Clear the interval when no profile is selected
  }
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
