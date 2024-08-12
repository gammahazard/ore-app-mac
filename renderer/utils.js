// File: renderer/utils.js
const { ipcRenderer } = require('electron');
const domElements = require('./domElements.js');

function appendToLog(message) {
  domElements.logContent.textContent += `${message}\n`;
  domElements.logContent.scrollTop = domElements.logContent.scrollHeight;
}

function handleFeeTypeChange() {
  const selectedFeeType = domElements.feeTypeSelect.value;
  domElements.staticFeeGroup.style.display = selectedFeeType === 'static' ? 'block' : 'none';
  domElements.dynamicFeeGroup.style.display = selectedFeeType === 'dynamic-custom' ? 'block' : 'none';
  domElements.maxFeeCapGroup.style.display = selectedFeeType !== 'static' ? 'block' : 'none';
}

let lastLogLine = '';

function setupLogUpdates() {
  setInterval(() => {
    ipcRenderer.invoke('read-miner-log').then((log) => {
      console.log("Log received:", log);
      const logLines = log.split('\n');
      const startIndex = logLines.indexOf(lastLogLine) + 1;
      if (startIndex > 0 && startIndex < logLines.length) {
        const newLines = logLines.slice(startIndex).join('\n');
        console.log("New log lines:", newLines);
        domElements.logContent.textContent += newLines + '\n';
        lastLogLine = logLines[logLines.length - 2];
      }
    }).catch(err => console.error("Error reading logs:", err));
  }, 10000);
}

module.exports = {
  appendToLog,
  handleFeeTypeChange,
  setupLogUpdates
};