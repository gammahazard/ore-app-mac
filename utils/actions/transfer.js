const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const cleanLog = require('../cleanLog'); 
const oreBalance = require('../oreBalance');
const findUnbufferPath = require('../install-checks/BufferExists'); 

function executeTransferCommand({ amount, keypairPath, priorityFee, rpcUrl }, event, mainWindow) {
    const [_, transferAmount, recipient] = amount.split(' ');

    const unbufferPath = findUnbufferPath(); 
    const oreCliPath = path.join(os.homedir(), '.cargo', 'bin', 'ore');

    let command = `${oreCliPath} transfer`;
    if (transferAmount && transferAmount.trim() !== '') command += ` ${transferAmount}`;
    if (recipient && recipient.trim() !== '') command += ` ${recipient}`;
    if (keypairPath) command += ` --keypair "${keypairPath}"`;
    if (priorityFee) command += ` --priority-fee ${priorityFee}`;
    if (rpcUrl) command += ` --rpc ${rpcUrl}`;

    console.log('Executing transfer command:', command);

    const transferProcess = spawn(unbufferPath, ['-p', command], {
        shell: true,
        env: { ...process.env, TERM: 'xterm-256color' }
    });

    let lastCleanedMessage = '';
    let successSent = false;

    function filterAndSendLog(message, type = 'output') {
        const cleanedMessage = cleanLog(message); // Clean the log message

        // Send the cleaned message only if it's not a duplicate of the last one
        if (cleanedMessage && cleanedMessage !== lastCleanedMessage) {
            lastCleanedMessage = cleanedMessage;
            console.log(`Filtered ${type}: ${cleanedMessage}`);
            event.reply(`command-${type}`, cleanedMessage);
            mainWindow.webContents.send(`miner-${type}`, cleanedMessage);
        }
    }

    transferProcess.stdout.on('data', (data) => {
        const output = data.toString();
        filterAndSendLog(output);

        if (output.includes('Are you sure you want to continue? [Y/n]')) {
            console.log('Confirmation prompt detected, sending Y');
            transferProcess.stdin.write('Y\n');  // Send 'Y' to continue
        }

        if (output.includes('OK') && !successSent) {
            console.log('OK message detected in stdout');
            successSent = true;
            mainWindow.webContents.send('command-success', 'Success: Transfer command executed successfully!');
            
            // Update ORE balance after successful transfer
            oreBalance(event, keypairPath).then(balance => {
                mainWindow.webContents.send('ore-balance-updated', balance);
            }).catch(error => {
                console.error('Failed to update ORE balance:', error);
            });
        }
    });

    transferProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        filterAndSendLog(errorOutput, 'error');
    });

    transferProcess.on('close', (code) => {
        console.log(`Transfer command exited with code ${code}`);
        if (code === 0 && !successSent) {
            mainWindow.webContents.send('command-success', 'Success: Transfer command executed successfully!');
            oreBalance(event, keypairPath).then(balance => {
                mainWindow.webContents.send('ore-balance-updated', balance);
            }).catch(error => {
                console.error('Failed to update ORE balance:', error);
            });
        } else if (code !== 0) {
            mainWindow.webContents.send('command-error', `Error: Transfer command exited with code ${code}`);
        }
        event.reply('command-complete', `Transfer process exited with code ${code}`);
    });

    transferProcess.on('error', (error) => {
        console.error(`Transfer command execution failed: ${error.message}`);
        event.reply('command-error', error.message);
        mainWindow.webContents.send('command-error', error.message);
    });
}

module.exports = executeTransferCommand;
