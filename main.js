const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');


let mainWindow;
let minerProcess;
let lastLogContent = '';  // Stores the last meaningful log content
let lastLogTimestamp = 0; // Track the timestamp of the last log

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');


    mainWindow.webContents.openDevTools();
  
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Check if ore-cli is installed
ipcMain.handle('check-ore-cli', async () => {
  const homeDir = os.homedir();
  const orePath = path.join(homeDir, '.cargo', 'bin', 'ore');
  
  try {
    await fs.promises.access(orePath, fs.constants.X_OK);
    return { installed: true, path: orePath };
  } catch (error) {
    return { installed: false, error: error.message };
  }
});

// Clean log function to remove unwanted characters
function cleanLog(log) {
  return log.replace(/\x1b\[.*?m/g, '') // Remove ANSI codes
            .replace(/⠁|⠉|⠙|⠚|⠒|⠂|⠲|⠴|⠤|⠄|⠦|⠖|⠓|⠋|⠠|⠐|⠈/g, '') // Remove spinner characters
            .replace(/\(\s*,\s*\)/g, '') // Remove malformed log parts like "(,)"
            .trim();
}

// Start mining
ipcMain.on('start-mining', (event, options) => {
  if (minerProcess) {
    event.reply('mining-error', 'Miner is already running');
    return;
  }

  const unbufferPath = '/usr/local/bin/unbuffer'; // Explicitly specify the full path to unbuffer
  const oreCliPath = path.join(os.homedir(), '.cargo', 'bin', 'ore'); // Full path to ore CLI
  const args = [oreCliPath, 'mine'];
  
  if (options.rpcUrl) args.push('--rpc', options.rpcUrl);
  
  if (options.keypairPath) {
    args.push('--keypair', options.keypairPath);
    console.log('Using custom keypair path:', options.keypairPath);
  } else {
    console.log('No custom keypair path provided, using default');
  }
  
  if (options.feePayerPath) {
    args.push('--fee-payer', options.feePayerPath);
    console.log('Using fee payer path:', options.feePayerPath);
  }
  
  if (options.feeType === 'dynamic') {
    args.push('--dynamic-fee');
    if (options.maxFeeCap) args.push('--priority-fee', options.maxFeeCap);
  } else if (options.feeType === 'dynamic-custom') {
    args.push('--dynamic-fee', '--dynamic-fee-url', options.dynamicFeeUrl);
    if (options.maxFeeCap) args.push('--priority-fee', options.maxFeeCap);
  } else if (options.feeType === 'static' && options.priorityFee) {
    args.push('--priority-fee', options.priorityFee);
  }
  
  if (options.cores && parseInt(options.cores) > 0) {
    args.push('--cores', options.cores);
    console.log('Using specified number of cores:', options.cores);
  }

  console.log('Starting miner with command:', unbufferPath, args.join(' '));

  minerProcess = spawn(unbufferPath, args, { 
    shell: true,
    env: { ...process.env, TERM: 'xterm-256color' }
  });

  minerProcess.stdout.on('data', (data) => {
    const cleanedOutput = cleanLog(data.toString().trim());
    const currentTime = Date.now();

    // Filter out duplicates based on time and content
    if (cleanedOutput !== lastLogContent || (currentTime - lastLogTimestamp) > 1000) {
      lastLogContent = cleanedOutput;
      lastLogTimestamp = currentTime;
      mainWindow.webContents.send('miner-output', cleanedOutput);
    }

    // Handle specific log parsing here if needed
  });

  minerProcess.stderr.on('data', (data) => {
    const cleanedOutput = cleanLog(data.toString().trim());
    const currentTime = Date.now();

    // Filter out duplicates based on time and content
    if (cleanedOutput !== lastLogContent || (currentTime - lastLogTimestamp) > 1000) {
      lastLogContent = cleanedOutput;
      lastLogTimestamp = currentTime;
      mainWindow.webContents.send('miner-error', cleanedOutput);
    }

    // Handle specific log parsing here if needed
  });

  minerProcess.on('error', (error) => {
    console.error(`Failed to start miner process: ${error}`);
    event.reply('mining-error', `Failed to start miner: ${error.message}`);
  });

  minerProcess.on('close', (code) => {
    console.log(`Miner process exited with code ${code}`);
    mainWindow.webContents.send('miner-stopped', code);
    minerProcess = null;
  });

  event.reply('mining-started');
});

// Stop mining
ipcMain.on('stop-mining', (event) => {
  if (minerProcess) {
    console.log('Attempting to stop miner process...');
    event.reply('mining-stopping');

    minerProcess.kill('SIGTERM');

    const killTimeout = setTimeout(() => {
      if (minerProcess) {
        console.log('Process did not exit gracefully, forcing termination...');
        
        exec(`pkill -9 -P ${minerProcess.pid}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error killing process: ${error}`);
            event.reply('mining-error', 'Failed to stop miner process');
          } else {
            console.log('Miner process and its children forcefully terminated');
            minerProcess = null;
            event.reply('mining-stopped');
          }
        });
      }
    }, 5000);

    minerProcess.once('exit', (code, signal) => {
      clearTimeout(killTimeout);
      console.log(`Miner process exited with code ${code} and signal ${signal}`);
      minerProcess = null;
      event.reply('mining-stopped');
    });

  } else {
    console.log('No miner process to stop');
    event.reply('mining-error', 'Miner is not running');
  }
});

// Save profile
ipcMain.on('save-profile', (event, profile) => {
  if (!profile.name || profile.name.trim() === '') {
    event.reply('profile-save-error', 'Profile name cannot be empty');
    return;
  }

  const profilesPath = path.join(app.getPath('userData'), 'profiles.json');
  let profiles = [];
  
  try {
    profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  } catch (error) {
    // File doesn't exist or is invalid, we'll create a new one
  }

  const existingProfileIndex = profiles.findIndex(p => p.name === profile.name);
  if (existingProfileIndex !== -1) {
    // Replace existing profile
    profiles[existingProfileIndex] = profile;
  } else {
    // Add new profile
    profiles.push(profile);
  }

  fs.writeFileSync(profilesPath, JSON.stringify(profiles));
  event.reply('profile-saved', profiles);

  // Create a difficulty log file for the profile if it doesn't exist
  const difficultyLogPath = path.join(app.getPath('userData'), `difficulty_${profile.name}.log`);
  if (!fs.existsSync(difficultyLogPath)) {
    fs.writeFileSync(difficultyLogPath, '');
  }
});

// Load profiles
ipcMain.handle('load-profiles', () => {
  const profilesPath = path.join(app.getPath('userData'), 'profiles.json');
  try {
    return JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  } catch (error) {
    return [];
  }
});



// ----------------------------------------------------------------------------------------------------------------------------------------

ipcMain.on('execute-command', (event, options) => {
    const { amount, keypairPath, priorityFee, rpcUrl } = options;

    // Check if the command is 'claim' or 'transfer'
    const isClaimOrTransferCommand = amount.startsWith('claim') || amount.startsWith('transfer');

    if (isClaimOrTransferCommand) {
        // Use expect for the 'claim' and 'transfer' commands
        let command = `ore ${amount}`; // amount includes "claim <amount>" or "transfer <amount> <address>"
        if (keypairPath) command += ` --keypair ${keypairPath}`;
        if (priorityFee) command += ` --priority-fee ${priorityFee}`;
        if (rpcUrl) command += ` --rpc ${rpcUrl}`;

        const scriptContent = `
        #!/usr/bin/expect -f

        set timeout -1

        spawn ${command}

        expect {
            "Are you sure you want to continue? \\[Y/n\\]" {
                send "Y\r"
                exp_continue
            }
            eof
        }

        expect eof
        `;

        const scriptPath = path.join(os.tmpdir(), `${amount.startsWith('claim') ? 'claim' : 'transfer'}.sh`);
        const expectPath = '/usr/bin/expect'; // Or wherever your expect binary is located

        // Write the script to a temporary file
        fs.writeFileSync(scriptPath, scriptContent);

        // Make the script executable
        fs.chmodSync(scriptPath, '755');

        // Execute the script using the full path to expect
        exec(`${expectPath} ${scriptPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Command execution failed: ${error.message}`);
                event.reply('command-error', error.message);
                mainWindow.webContents.send('command-error', error.message);
                return;
            }

            if (stderr) {
                console.error(`stderr: ${stderr}`);
                event.reply('command-error', stderr);
                mainWindow.webContents.send('miner-error', stderr); // Send to renderer for error logs
                return;
            }

            console.log(`stdout: ${stdout}`);
            event.reply('command-output', stdout);
            mainWindow.webContents.send('miner-output', stdout); // Send to renderer for logs

            // Clean up the script file after execution
            fs.unlinkSync(scriptPath);

            // Send success message
            mainWindow.webContents.send('command-success', `Success: ${amount.startsWith('claim') ? 'Claim' : 'Transfer'} command executed successfully!`);
        });
    } else {
        // For other commands (stake), use direct execution
        let command = `ore ${amount}`; // amount includes the command like "stake <amount>"
        if (keypairPath) command += ` --keypair ${keypairPath}`;
        if (priorityFee) command += ` --priority-fee ${priorityFee}`;
        if (rpcUrl) command += ` --rpc ${rpcUrl}`;

        const shell = spawn('/bin/bash', ['-c', command], {
            stdio: ['pipe', 'pipe', 'pipe']  // Enable stdin, stdout, stderr
        });

        shell.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`stdout: ${output}`);
            event.reply('command-output', output);
            mainWindow.webContents.send('miner-output', output); // Send to renderer for logs
        });

        shell.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            console.error(`stderr: ${errorOutput}`);
            event.reply('command-error', errorOutput);
            mainWindow.webContents.send('miner-error', errorOutput); // Send to renderer for error logs
        });

        shell.on('close', (code) => {
            console.log(`Command exited with code ${code}`);
            if (code === 0) {
                mainWindow.webContents.send('command-success', 'Success: Command executed successfully!');
            } else {
                mainWindow.webContents.send('command-error', `Error: Command exited with code ${code}`);
            }
            event.reply('command-complete', `Process exited with code ${code}`);
        });

        shell.on('error', (error) => {
            console.error(`Command execution failed: ${error.message}`);
            event.reply('command-error', error.message);
            mainWindow.webContents.send('command-error', error.message);
        });
    }
});

// ----------------------------------------------------------------------------------------------------------------------------------------



ipcMain.handle('get-ore-balance', async (event, keypairPath) => {
    try {
        let command = 'ore balance';
        if (keypairPath) {
            command += ` --keypair ${keypairPath}`;
        }

        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error getting ORE balance: ${error.message}`);
                    reject(error.message);
                    return;
                }

                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                    reject(stderr);
                    return;
                }

                resolve(stdout.trim());
            });
        });
    } catch (error) {
        console.error('Failed to retrieve ORE balance:', error);
        return 'Error';
    }
});

// Read miner log
ipcMain.handle('read-miner-log', () => {
  const logPath = path.join(app.getPath('userData'), 'miner.log');
  try {
    return fs.readFileSync(logPath, 'utf8');
  } catch (error) {
    return '';
  }
});

// Get average difficulty
ipcMain.handle('get-avg-difficulty', (event, profileName) => {
  const difficultyPath = path.join(app.getPath('userData'), `difficulty_${profileName}.log`);
  try {
    const content = fs.readFileSync(difficultyPath, 'utf8');
    const lines = content.split('\n');
    const avgLine = lines.find(line => line.startsWith('Average difficulty:'));
    if (avgLine) {
      return avgLine.split(':')[1].trim();
    }
    return 'N/A';
  } catch (error) {
    return 'N/A';
  }
});

// Get difficulty details
ipcMain.handle('get-difficulty-details', (event, profileName) => {
  const difficultyPath = path.join(app.getPath('userData'), `difficulty_${profileName}.log`);
  try {
    return fs.readFileSync(difficultyPath, 'utf8');
  } catch (error) {
    return '';
  }
});

// Delete profile
ipcMain.on('delete-profile', (event, profileName) => {
  const profilesPath = path.join(app.getPath('userData'), 'profiles.json');
  let profiles = [];
  
  try {
    profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    profiles = profiles.filter(p => p.name !== profileName);
    fs.writeFileSync(profilesPath, JSON.stringify(profiles));
    
    // Delete the associated difficulty log file
    const difficultyLogPath = path.join(app.getPath('userData'), `difficulty_${profileName}.log`);
    if (fs.existsSync(difficultyLogPath)) {
      fs.unlinkSync(difficultyLogPath);
    }
    
    event.reply('profile-deleted', profiles);
  } catch (error) {
    event.reply('profile-delete-error', error.message);
  }
});

ipcMain.handle('get-full-difficulty-log', (event, profileName) => {
  const difficultyLogPath = path.join(app.getPath('userData'), `difficulty_${profileName}.log`);
  try {
    return fs.readFileSync(difficultyLogPath, 'utf8');
  } catch (error) {
    console.error('Error reading full difficulty log:', error);
    return 'No difficulty data available.';
  }
});

// Get best hash
ipcMain.handle('get-best-hash', (event, profileName) => {
  const difficultyLogPath = path.join(app.getPath('userData'), `difficulty_${profileName}.log`);
  try {
    const content = fs.readFileSync(difficultyLogPath, 'utf8');
    const lines = content.split('\n');
    const bestHashLine = lines.find(line => line.includes('Best hash:'));
    if (bestHashLine) {
      const match = bestHashLine.match(/Best hash: (.+) \(difficulty (\d+)\)/);
      if (match) {
        return { hash: match[1], difficulty: parseInt(match[2], 10) };
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading best hash:', error);
    return null;
  }
});
