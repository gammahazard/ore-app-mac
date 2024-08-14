const { spawn } = require('child_process');
const checkSolanaCli = require('./install-checks/checkSolanaCli');
const cleanLog = require('./cleanLog');

const solanaAddress = async (event, keypairPath) => {
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

    console.log('Using Solana CLI path:', solanaCliPath);
    console.log('Arguments:', args);

    const solanaProcess = spawn(solanaCliPath, args);

    let output = '';
    let errorOutput = '';

    solanaProcess.stdout.on('data', (data) => {
      console.log('stdout:', data.toString());
      output += data.toString();
    });

    solanaProcess.stderr.on('data', (data) => {
      console.error('stderr:', data.toString());
      errorOutput += data.toString();
    });

    solanaProcess.on('error', (err) => {
      console.error('Failed to start Solana CLI process:', err);
      reject(err);
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

module.exports = solanaAddress;
