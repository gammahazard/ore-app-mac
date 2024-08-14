const { ipcRenderer } = require('electron');
const { spawn } = require('child_process');
const cleanLog = require('../utils/cleanLog');
const domElements = require('./domElements.js');
const difficultyManagement = require('./difficultyManagement.js');
const sharedState = require('./sharedState.js');
const checkSolanaCli = require('../utils/install-checks/checkSolanaCli');

let balanceInterval = null;
let solanaBalanceInterval = null;

function initializeProfileManagement() {
  domElements.saveProfileBtn.addEventListener('click', saveProfile);
  loadProfiles();
  sharedState.updateButtonStates();
  initializeSolanaAddressCopy();
}

function initializeSolanaAddressCopy() {
  const addressElement = document.getElementById('solana-address-value');
  if (addressElement) {
    addressElement.addEventListener('click', copySolanaAddress);
  }
}

function copySolanaAddress() {
  const addressElement = document.getElementById('solana-address-value');
  const address = addressElement.textContent;
  navigator.clipboard.writeText(address).then(() => {
    addressElement.classList.add('copied');
    setTimeout(() => {
      addressElement.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy address: ', err);
  });
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
    
    sharedState.updateButtonStates();
  });
}

function loadProfile(profile) {
  console.log('Loading profile:', profile);
  sharedState.setCurrentProfile(profile);
  Object.keys(profile).forEach((key) => {
    const input = domElements.minerForm.elements[key];
    if (input) {
      input.value = profile[key];
    }
  });
  domElements.profileNameInput.value = profile.name;
  domElements.feeTypeSelect.dispatchEvent(new Event('change'));
  difficultyManagement.updateDifficultyInfo(sharedState.getCurrentProfile);

  // Clear previous intervals if they exist
  if (balanceInterval) {
    clearInterval(balanceInterval);
  }
  if (solanaBalanceInterval) {
    clearInterval(solanaBalanceInterval);
  }

  // Set loading messages
  safeSetTextContent(domElements.oreBalance, 'Loading ORE Balance...');
  safeSetTextContent(domElements.solanaBalance, 'Loading SOL Balance...');
  safeSetTextContent(domElements.solanaAddressValue, 'Loading...');

  fetchSolanaPublicAddress(profile.keypairPath);

  // Fetch ORE balance
  fetchOreBalance(profile.keypairPath);
  balanceInterval = setInterval(() => {
    fetchOreBalance(profile.keypairPath);
  }, 10000);

  // Fetch Solana balance
  fetchSolanaBalance(profile.keypairPath);
  solanaBalanceInterval = setInterval(() => {
    fetchSolanaBalance(profile.keypairPath);
  }, 10000);
  sharedState.updateButtonStates();
}

function fetchSolanaPublicAddress(keypairPath) {
  console.log('Fetching Solana public address for keypair:', keypairPath);
  
  const solanaAddress = async (keypairPath) => {
    return new Promise(async (resolve, reject) => {
      const solanaCliCheck = await checkSolanaCli();

      if (!solanaCliCheck.installed) {
        return reject(new Error(solanaCliCheck.error));
      }

      const solanaCliPath = solanaCliCheck.path;
      const args = ['address'];

      if (keypairPath) {
        args.push('--keypair', keypairPath);
      }

      const solanaProcess = spawn(solanaCliPath, args);

      let output = '';
      let errorOutput = '';

      solanaProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      solanaProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      solanaProcess.on('close', (code) => {
        if (code === 0) {
          resolve(cleanLog(output.trim()));
        } else {
          reject(new Error(cleanLog(errorOutput.trim())));
        }
      });
    });
  };

  solanaAddress(keypairPath)
    .then((address) => {
      console.log('Received Solana address:', address);
      safeSetTextContent(domElements.solanaAddressValue, address);
    })
    .catch((error) => {
      console.error('Failed to get Solana public address:', error);
      safeSetTextContent(domElements.solanaAddressValue, 'Error fetching address');
    });
}

function fetchOreBalance(keypairPath) {
  ipcRenderer.invoke('get-ore-balance', keypairPath).then((balance) => {
    safeSetTextContent(domElements.oreBalance, `${balance}`);
  }).catch((error) => {
    safeSetTextContent(domElements.oreBalance, 'ORE Balance: Error');
    console.error('Failed to get ORE balance:', error);
  });
}

function fetchSolanaBalance(keypairPath) {
  ipcRenderer.invoke('get-solana-balance', keypairPath).then((balance) => {
    safeSetTextContent(domElements.solanaBalance, `${balance}`);
  }).catch((error) => {
    safeSetTextContent(domElements.solanaBalance, 'SOL Balance: Error');
    console.error('Failed to get Solana balance:', error);
  });
}

function safeSetTextContent(element, content) {
  if (element && typeof element.textContent !== 'undefined') {
    element.textContent = content;
  } else {
    console.warn(`Unable to set text content. Element might be null or undefined.`, {
      elementName: element ? element.id : 'unknown',
      content: content
    });
  }
}

function deleteProfile(profileName) {
  if (confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
    ipcRenderer.send('delete-profile', profileName);
  }
}

function clearProfileForm() {
  if (balanceInterval) {
    clearInterval(balanceInterval);
  }
  if (solanaBalanceInterval) {
    clearInterval(solanaBalanceInterval);
  }
  domElements.minerForm.reset();
  domElements.profileNameInput.value = '';
  safeSetTextContent(domElements.oreBalance, 'ORE Balance: N/A');
  safeSetTextContent(domElements.solanaBalance, 'SOL Balance: N/A');
  safeSetTextContent(domElements.solanaAddressValue, 'N/A');
  difficultyManagement.updateDifficultyInfo(sharedState.getCurrentProfile);
  
  sharedState.setCurrentProfile(null);
  sharedState.updateButtonStates();
}

module.exports = {
  initializeProfileManagement,
  clearProfileForm,
  loadProfiles
};