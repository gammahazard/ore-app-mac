const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const cleanLog = require('./cleanLog');

const oreBalance = async (event, keypairPath) => {
  return new Promise((resolve, reject) => {
    const oreCliPath = path.join(os.homedir(), '.cargo', 'bin', 'ore');
    const args = ['balance'];
    if (keypairPath) {
      args.push('--keypair', keypairPath);
    }

    const oreProcess = spawn(oreCliPath, args);

    let output = '';
    let errorOutput = '';

    oreProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(data.toString())
    });

    oreProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    oreProcess.on('close', (code) => {
      if (code === 0) {
        resolve(cleanLog(output.trim()));
      } else {
        reject(new Error(cleanLog(errorOutput.trim())));
      }
    });
  });
};

module.exports = oreBalance;