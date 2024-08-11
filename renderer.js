const { ipcRenderer } = require('electron');

// DOM Elements
const oreCliStatus = document.getElementById('ore-cli-status');
const startMinerBtn = document.getElementById('start-miner');
const stopMinerBtn = document.getElementById('stop-miner');
const minerForm = document.getElementById('miner-form');
const feeTypeSelect = document.getElementById('fee-type');
const staticFeeGroup = document.getElementById('static-fee-group');
const dynamicFeeGroup = document.getElementById('dynamic-fee-group');
const maxFeeCapGroup = document.getElementById('max-fee-cap-group');
const profileList = document.getElementById('profile-list');
const saveProfileBtn = document.getElementById('save-profile');
const bestHashElement = document.getElementById('best-hash');
const profileNameInput = document.getElementById('profile-name');
const logContent = document.getElementById('log-content');
const avgDifficulty = document.getElementById('avg-difficulty');
const showDifficultyDetailsBtn = document.getElementById('show-difficulty-details');
const difficultyModal = document.getElementById('difficulty-modal');
const oreCliError = document.getElementById('ore-cli-error');

const closeModal = document.getElementsByClassName('close')[0];

let currentProfile = null;

// Check ore-cli installation
ipcRenderer.invoke('check-ore-cli').then((result) => {
  if (result.installed) {
    oreCliStatus.textContent = `ore-cli found at: ${result.path}`;
    startMinerBtn.disabled = false;
    document.getElementById('app').style.display = 'block'; // Show app content
    feeTypeSelect.dispatchEvent(new Event('change')); // Trigger change to show correct fee options
  } else {
    oreCliStatus.textContent = `ore-cli not found. Error: ${result.error}`;
    startMinerBtn.disabled = true;
    oreCliError.style.display = 'block'; // Show error message
  }
});

// Start mining
startMinerBtn.addEventListener('click', () => {
  const formData = new FormData(minerForm);
  const options = Object.fromEntries(formData.entries());
  options.name = currentProfile ? currentProfile.name : 'default';
  console.log('Options:', options);
  
  ipcRenderer.send('start-mining', options);
});

// Stop mining
stopMinerBtn.addEventListener('click', () => {
  ipcRenderer.send('stop-mining');
});

// Handle mining events
ipcRenderer.on('mining-started', () => {
    startMinerBtn.disabled = true;
    stopMinerBtn.disabled = false;
    logContent.textContent += 'Mining started\n';
});

ipcRenderer.on('mining-stopping', () => {
    startMinerBtn.disabled = true;
    stopMinerBtn.disabled = true;
    logContent.textContent += 'Stopping miner...\n';
});

ipcRenderer.on('mining-stopped', () => {
    startMinerBtn.disabled = false;
    stopMinerBtn.disabled = true;
    logContent.textContent += 'Mining stopped\n';
});

ipcRenderer.on('mining-error', (_, error) => {
    console.error('Mining error:', error);
    logContent.textContent += `Error: ${error}\n`;
    logContent.scrollTop = logContent.scrollHeight;
    startMinerBtn.disabled = false;
    stopMinerBtn.disabled = true;
});

ipcRenderer.on('miner-output', (_, data) => {
    console.log('Miner output:', data);
    logContent.textContent += data + '\n';
    logContent.scrollTop = logContent.scrollHeight;
    if (data.includes('panicked at') || data.includes('Error:')) {
      startMinerBtn.disabled = false;
      stopMinerBtn.disabled = true;
    }
});

ipcRenderer.on('miner-error', (_, error) => {
    console.error('Miner error:', error);
    logContent.textContent += `Error: ${error}\n`;
    logContent.scrollTop = logContent.scrollHeight;
    startMinerBtn.disabled = false;
    stopMinerBtn.disabled = true;
});
ipcRenderer.on('command-success', (_, message) => {
    logContent.textContent += `${message}\n`;
    logContent.scrollTop = logContent.scrollHeight;
    alert(message); // Optionally show an alert or display a success message in the UI
});

ipcRenderer.on('command-error', (_, error) => {
    logContent.textContent += `Error: ${error}\n`;
    logContent.scrollTop = logContent.scrollHeight;
    alert(`Command failed: ${error}`); // Optionally show an alert or display an error message in the UI
});
// Handle fee type changes
feeTypeSelect.addEventListener('change', () => {
  const selectedFeeType = feeTypeSelect.value;
  if (selectedFeeType === 'static') {
    staticFeeGroup.style.display = 'block';
    dynamicFeeGroup.style.display = 'none';
    maxFeeCapGroup.style.display = 'none';
  } else {
    staticFeeGroup.style.display = 'none';
    dynamicFeeGroup.style.display = selectedFeeType === 'dynamic-custom' ? 'block' : 'none';
    maxFeeCapGroup.style.display = 'block';
  }
});

// Save profile
saveProfileBtn.addEventListener('click', () => {
  const formData = new FormData(minerForm);
  const profile = Object.fromEntries(formData.entries());
  profile.name = profileNameInput.value.trim();
  if (profile.name === '') {
    alert('Profile name cannot be empty');
    return;
  }
  ipcRenderer.send('save-profile', profile);
});

// Handle profile save error
ipcRenderer.on('profile-save-error', (_, error) => {
  alert(error);
});

// Load profiles
function loadProfiles() {
  ipcRenderer.invoke('load-profiles').then((profiles) => {
    profileList.innerHTML = '';
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
      profileList.appendChild(profileContainer);
    });
  });
}

function loadProfile(profile) {
    currentProfile = profile;
    Object.keys(profile).forEach((key) => {
        const input = minerForm.elements[key];
        if (input) {
            input.value = profile[key];
        }
    });
    profileNameInput.value = profile.name;
    feeTypeSelect.dispatchEvent(new Event('change'));
    updateDifficultyInfo();

    // Get and display ORE balance
    ipcRenderer.invoke('get-ore-balance', profile.keypairPath).then((balance) => {
        document.getElementById('ore-balance').textContent = `${balance}`;
    }).catch((error) => {
        document.getElementById('ore-balance').textContent = 'Balance: Error';
        console.error('Failed to get ORE balance:', error);
    });
}

// Delete profile
function deleteProfile(profileName) {
  if (confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
    ipcRenderer.send('delete-profile', profileName);
  }
}

// Handle profile deletion response
ipcRenderer.on('profile-deleted', (_, updatedProfiles) => {
  loadProfiles();
  alert('Profile deleted successfully');
  if (currentProfile && currentProfile.name === profileName) {
    currentProfile = null;
    clearProfileForm();
  }
});

ipcRenderer.on('profile-delete-error', (_, error) => {
  alert(`Error deleting profile: ${error}`);
});

// Initialize profiles
loadProfiles();

// Update average difficulty
function updateDifficultyInfo() {
    if (currentProfile) {
        ipcRenderer.invoke('get-avg-difficulty', currentProfile.name).then((avg) => {
            avgDifficulty.textContent = `Average Difficulty: ${avg}`;
        });
        ipcRenderer.invoke('get-best-hash', currentProfile.name).then((bestHash) => {
            if (bestHash) {
                bestHashElement.textContent = `Best Hash: ${bestHash.hash} (difficulty ${bestHash.difficulty})`;
            } else {
                bestHashElement.textContent = 'Best Hash: N/A';
            }
        });
    } else {
        avgDifficulty.textContent = 'Average Difficulty: N/A';
        bestHashElement.textContent = 'Best Hash: Select Profile';
    }
}

// Show full difficulty details
showDifficultyDetailsBtn.addEventListener('click', () => {
    if (currentProfile) {
        ipcRenderer.invoke('get-full-difficulty-log', currentProfile.name).then((logContent) => {
            const modalContent = document.getElementById('modal-content');
            modalContent.textContent = logContent;
            difficultyModal.style.display = 'block';
        });
    } else {
        alert('Please select a profile first');
    }
});

// Close modal
closeModal.onclick = () => {
  difficultyModal.style.display = 'none';
};

window.onclick = (event) => {
  if (event.target === difficultyModal) {
    difficultyModal.style.display = 'none';
  }
};

// Helper function to get the current profile
function getCurrentProfile() {
  return currentProfile;
}

// Clear profile form
function clearProfileForm() {
  minerForm.reset();
  profileNameInput.value = '';
  updateDifficultyInfo();
}

let lastLogLine = '';

setInterval(() => {
    ipcRenderer.invoke('read-miner-log').then((log) => {
        console.log("Log received:", log);  // Check the actual log content
        const logLines = log.split('\n');
        const startIndex = logLines.indexOf(lastLogLine) + 1;
        if (startIndex > 0 && startIndex < logLines.length) {
            const newLines = logLines.slice(startIndex).join('\n');
            console.log("New log lines:", newLines);  // Check what is being added
            logContent.textContent += newLines + '\n';
            lastLogLine = logLines[logLines.length - 2];
        }
    }).catch(err => console.error("Error reading logs:", err));

    updateDifficultyInfo();
}, 10000);

// Listen for difficulty updates
ipcRenderer.on('difficulty-updated', (_, updatedProfileName) => {
    if (currentProfile && currentProfile.name === updatedProfileName) {
        updateDifficultyInfo();
    }
});

// Call loadProfiles() when profiles are saved or deleted
ipcRenderer.on('profile-saved', () => {
    loadProfiles();
});
ipcRenderer.on('command-output', (_, log) => {
    logContent.textContent += `${log}\n`;
    logContent.scrollTop = logContent.scrollHeight;
});

ipcRenderer.on('command-error', (_, error) => {
    logContent.textContent += `Error: ${error}\n`;
    logContent.scrollTop = logContent.scrollHeight;
});
// DOM Elements


// New DOM Elements for Transfer, Stake, and Claim modals
const transferButton = document.getElementById('transfer-button');
const transferModal = document.getElementById('transfer-modal');
const transferConfirmButton = document.getElementById('transfer-confirm-button');
const transferClose = document.getElementById('transfer-close');

const stakeButton = document.getElementById('stake-button');
const stakeModal = document.getElementById('stake-modal');
const stakeConfirmButton = document.getElementById('stake-confirm-button');
const stakeClose = document.getElementById('stake-close');

const claimButton = document.getElementById('claim-button');
const claimModal = document.getElementById('claim-modal');
const claimConfirmButton = document.getElementById('claim-confirm-button');
const claimClose = document.getElementById('claim-close');
const transferAddressInput = document.getElementById('transfer-address');

// Disable Transfer Button if no recipient address


// Initially disable the button if the input is empty

// Event Listeners for opening and closing modals
transferButton.onclick = () => { transferModal.style.display = 'block'; };
transferClose.onclick = () => { transferModal.style.display = 'none'; };
stakeButton.onclick = () => { stakeModal.style.display = 'block'; };
stakeClose.onclick = () => { stakeModal.style.display = 'none'; };
claimButton.onclick = () => { claimModal.style.display = 'block'; };
claimClose.onclick = () => { claimModal.style.display = 'none'; };

window.onclick = (event) => {
    if (event.target === transferModal) transferModal.style.display = 'none';
    if (event.target === stakeModal) stakeModal.style.display = 'none';
    if (event.target === claimModal) claimModal.style.display = 'none';
};

// Transfer action
transferConfirmButton.onclick = () => {
    const amount = document.getElementById('transfer-amount').value;
    const address = document.getElementById('transfer-address').value;
    const rpcUrl = document.getElementById('transfer-rpc-url').value;
    const keypairPath = document.getElementById('transfer-keypair-path').value;
    const priorityFee = document.getElementById('transfer-priority-fee').value;

    const options = {
        amount: `transfer ${amount} ${address}`,  // Include 'transfer' command and address directly in the amount
        keypairPath,
        priorityFee,
        rpcUrl,
    };

    ipcRenderer.send('execute-command', options);
    transferModal.style.display = 'none';
};

// Stake action
stakeConfirmButton.onclick = () => {
    const amount = document.getElementById('stake-amount').value;
    const rpcUrl = document.getElementById('stake-rpc-url').value;
    const keypairPath = document.getElementById('stake-keypair-path').value;
    const priorityFee = document.getElementById('stake-priority-fee').value;

    const options = {
        amount: `stake ${amount}`,  // Include 'stake' command directly in the amount
        keypairPath,
        priorityFee,
        rpcUrl,
    };

    ipcRenderer.send('execute-command', options);
    stakeModal.style.display = 'none';
};

// Claim action
claimConfirmButton.onclick = () => {
    const amount = document.getElementById('claim-amount').value;
    const keypairPath = document.getElementById('claim-keypair-path').value;
    const priorityFee = document.getElementById('claim-priority-fee').value;
    const rpcUrl = document.getElementById('claim-rpc-url').value;

    const options = {
        amount: `claim ${amount}`,  // Include 'claim' command directly in the amount
        keypairPath,
        priorityFee,
        rpcUrl,
    };

    ipcRenderer.send('execute-command', options);
    claimModal.style.display = 'none';
};