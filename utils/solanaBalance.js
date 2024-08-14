const { spawn } = require('child_process');
const checkSolanaCli = require('./install-checks/checkSolanaCli');
const cleanLog = require('./cleanLog');

const solanaBalance = async (event, keypairPath) => {
  return new Promise(async (resolve, reject) => {
    const solanaCliCheck = await checkSolanaCli();

    if (!solanaCliCheck.installed) {
      return reject(new Error(solanaCliCheck.error));
    }

    const solanaCliPath = solanaCliCheck.path;
    const args = ['balance'];

    // If a keypair path is provided, use it
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

module.exports = solanaBalance;
