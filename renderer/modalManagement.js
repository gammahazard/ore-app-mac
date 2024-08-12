// File: renderer/modalManagement.js
const domElements = require('./domElements.js');
const { ipcRenderer } = require('electron');

function initializeModalManagement() {
  setupModalListeners();
  setupActionButtons();
}

function setupModalListeners() {
  domElements.transferButton.onclick = () => { domElements.transferModal.style.display = 'block'; };
  domElements.transferClose.onclick = () => { domElements.transferModal.style.display = 'none'; };
  domElements.stakeButton.onclick = () => { domElements.stakeModal.style.display = 'block'; };
  domElements.stakeClose.onclick = () => { domElements.stakeModal.style.display = 'none'; };
  domElements.claimButton.onclick = () => { domElements.claimModal.style.display = 'block'; };
  domElements.claimClose.onclick = () => { domElements.claimModal.style.display = 'none'; };
  
  // Add difficulty modal close listener
  domElements.difficultyClose.onclick = () => { domElements.difficultyModal.style.display = 'none'; };

  window.onclick = (event) => {
    if (event.target === domElements.transferModal) domElements.transferModal.style.display = 'none';
    if (event.target === domElements.stakeModal) domElements.stakeModal.style.display = 'none';
    if (event.target === domElements.claimModal) domElements.claimModal.style.display = 'none';
    if (event.target === domElements.difficultyModal) domElements.difficultyModal.style.display = 'none';
  };
}

function setupActionButtons() {
  domElements.transferConfirmButton.onclick = () => executeCommand('transfer');
  domElements.stakeConfirmButton.onclick = () => executeCommand('stake');
  domElements.claimConfirmButton.onclick = () => executeCommand('claim');
}

function executeCommand(action) {
  const amount = document.getElementById(`${action}-amount`).value;
  const rpcUrl = document.getElementById(`${action}-rpc-url`).value;
  const keypairPath = document.getElementById(`${action}-keypair-path`).value;
  const priorityFee = document.getElementById(`${action}-priority-fee`).value;
  
  let options = {
    amount: `${action} ${amount}`,
    keypairPath,
    priorityFee,
    rpcUrl,
  };

  if (action === 'transfer') {
    const address = document.getElementById('transfer-address').value;
    options.amount += ` ${address}`;
  }

  ipcRenderer.send('execute-command', options);
  document.getElementById(`${action}-modal`).style.display = 'none';
}

module.exports = {
  initializeModalManagement
};