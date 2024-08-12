const { exec } = require('child_process');

function stopMining(event, mainWindow, minerProcess) {
    if (minerProcess) {
        event.reply('mining-stopping');
        minerProcess.kill('SIGTERM'); // Attempt to gracefully stop the miner

        const killTimeout = setTimeout(() => {
            if (minerProcess && !minerProcess.killed) { // Check if process is still running
                exec(`pkill -9 -P ${minerProcess.pid}`, (error) => {
                    if (error) {
                        event.reply('mining-error', 'Failed to forcefully stop miner process');
                    } else {
                        event.reply('mining-stopped');
                    }
                });
            }
        }, 5000); // Wait for 5 seconds before forcefully killing the process

        minerProcess.once('exit', () => {
            clearTimeout(killTimeout);
            event.reply('mining-stopped');
        });

        // Additional check if the process has already been closed
        minerProcess.once('error', (err) => {
            if (err.code === 'ESRCH') {
                event.reply('mining-stopped');
            }
        });
    } else {
        event.reply('mining-error', 'Miner is not running');
    }
}

module.exports = stopMining;
