const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const cleanLog = require('../cleanLog');
const oreBalance = require('../oreBalance'); // Import the oreBalance function

function executeClaimCommand({ amount, keypairPath, priorityFee, rpcUrl }, event, mainWindow) {
    const [_, claimAmount] = amount.split(' ');

    const unbufferPath = '/usr/local/bin/unbuffer';
    const oreCliPath = path.join(os.homedir(), '.cargo', 'bin', 'ore');

    let command = `${oreCliPath} claim`;
    if (claimAmount && claimAmount.trim() !== '') command += ` ${claimAmount}`;
    if (keypairPath) command += ` --keypair "${keypairPath}"`;
    if (priorityFee) command += ` --priority-fee ${priorityFee}`;
    if (rpcUrl) command += ` --rpc ${rpcUrl}`;

    console.log('Executing claim command:', command);

    const claimProcess = spawn(unbufferPath, ['-p', command], {
        shell: true,
        env: { ...process.env, TERM: 'xterm-256color' }
    });

    let lastCleanedMessage = '';
    let successSent = false;

    function filterAndSendLog(message, type = 'output') {
        const cleanedMessage = cleanLog(message);
        if (cleanedMessage && cleanedMessage !== lastCleanedMessage) {
            lastCleanedMessage = cleanedMessage;
            console.log(`Filtered ${type}: ${cleanedMessage}`);
            event.reply(`command-${type}`, cleanedMessage);
            mainWindow.webContents.send(`miner-${type}`, cleanedMessage);
        }
    }

    claimProcess.stdout.on('data', (data) => {
        const output = data.toString();
        filterAndSendLog(output);

        if (output.includes('Are you sure you want to continue? [Y/n]')) {
            console.log('Confirmation prompt detected, sending Y');
            claimProcess.stdin.write('Y\n');  // Send 'Y' to continue
        }

        if (output.includes('OK') && !successSent) {
            console.log('OK message detected in stdout');
            successSent = true;
            mainWindow.webContents.send('command-success', 'Success: Claim command executed successfully!');
            
            // Update ORE balance after successful claim
            oreBalance(event, keypairPath).then(balance => {
                mainWindow.webContents.send('ore-balance-updated', balance);
            }).catch(error => {
                console.error('Failed to update ORE balance:', error);
            });
        }
    });

    claimProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        filterAndSendLog(errorOutput, 'error');
    });

    claimProcess.on('close', (code) => {
        console.log(`Claim command exited with code ${code}`);
        if (code === 0 && !successSent) {
            mainWindow.webContents.send('command-success', 'Success: Claim command executed successfully!');
            oreBalance(event, keypairPath).then(balance => {
                mainWindow.webContents.send('ore-balance-updated', balance);
            }).catch(error => {
                console.error('Failed to update ORE balance:', error);
            });
        } else if (code !== 0) {
            mainWindow.webContents.send('command-error', `Error: Claim command exited with code ${code}`);
        }
        event.reply('command-complete', `Claim process exited with code ${code}`);
    });

    claimProcess.on('error', (error) => {
        console.error(`Claim command execution failed: ${error.message}`);
        event.reply('command-error', error.message);
        mainWindow.webContents.send('command-error', error.message);
    });
}

module.exports = executeClaimCommand;
