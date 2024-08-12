const { exec } = require('child_process');

function oreBalance(event, keypairPath) {
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
}

module.exports = oreBalance;
