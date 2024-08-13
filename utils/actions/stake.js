const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const cleanLog = require('../cleanLog');
const oreBalance = require('../oreBalance');
const findUnbufferPath = require('../install-checks/BufferExists'); 

function executeStakeCommand({ amount, keypairPath, priorityFee, rpcUrl }, event, mainWindow) {
    const [_, stakeAmount] = amount.split(' ');

    const unbufferPath = findUnbufferPath(); 
    const oreCliPath = path.join(os.homedir(), '.cargo', 'bin', 'ore');

    let command = `${oreCliPath} stake`;
    if (stakeAmount && stakeAmount.trim() !== '') command += ` ${stakeAmount}`;
    if (keypairPath) command += ` --keypair "${keypairPath}"`;
    if (priorityFee) command += ` --priority-fee ${priorityFee}`;
    if (rpcUrl) command += ` --rpc ${rpcUrl}`;

    console.log('Executing stake command:', command);

    const stakeProcess = spawn(unbufferPath, ['-p', command], {
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

    stakeProcess.stdout.on('data', (data) => {
        const output = data.toString();
        filterAndSendLog(output);

        if (output.includes('OK') && !successSent) {
            console.log('OK message detected in stdout');
            successSent = true;
            mainWindow.webContents.send('command-success', 'Success: Stake command executed successfully!');
            
            // Update ORE balance after successful stake
            oreBalance(event, keypairPath).then(balance => {
                mainWindow.webContents.send('ore-balance-updated', balance);
            }).catch(error => {
                console.error('Failed to update ORE balance:', error);
            });
        }
    });

    stakeProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        filterAndSendLog(errorOutput, 'error');
    });

    stakeProcess.on('close', (code) => {
        console.log(`Stake command exited with code ${code}`);
        if (code === 0 && !successSent) {
            mainWindow.webContents.send('command-success', 'Success: Stake command executed successfully!');
            oreBalance(event, keypairPath).then(balance => {
                mainWindow.webContents.send('ore-balance-updated', balance);
            }).catch(error => {
                console.error('Failed to update ORE balance:', error);
            });
        } else if (code !== 0) {
            mainWindow.webContents.send('command-error', `Error: Stake command exited with code ${code}`);
        }
        event.reply('command-complete', `Stake process exited with code ${code}`);
    });

    stakeProcess.on('error', (error) => {
        console.error(`Stake command execution failed: ${error.message}`);
        event.reply('command-error', error.message);
        mainWindow.webContents.send('command-error', error.message);
    });
}

module.exports = executeStakeCommand;
