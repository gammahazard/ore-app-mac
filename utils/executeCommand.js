const executeClaimCommand = require('./actions/claim');
const executeTransferCommand = require('./actions/transfer');
const executeStakeCommand = require('./actions/stake');

function executeCommand(event, options, mainWindow) {
    console.log('Executing command with options:', options);  // Add this line for debugging

    const { amount } = options;

    if (amount.startsWith('claim')) {
        executeClaimCommand(options, event, mainWindow);
    } else if (amount.startsWith('transfer')) {
        executeTransferCommand(options, event, mainWindow);
    } else if (amount.startsWith('stake')) {
        executeStakeCommand(options, event, mainWindow);
    } else {
        event.reply('command-error', 'Unknown command');
        mainWindow.webContents.send('command-error', 'Unknown command');
    }
}

module.exports = executeCommand;