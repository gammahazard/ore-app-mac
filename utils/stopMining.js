const { exec } = require('child_process');

function stopMining(event, mainWindow, minerProcess) {
    if (minerProcess) {
        event.reply('mining-stopping');
        minerProcess.kill('SIGTERM');

        const killTimeout = setTimeout(() => {
            if (minerProcess) {
                exec(`pkill -9 -P ${minerProcess.pid}`, (error) => {
                    if (error) {
                        event.reply('mining-error', 'Failed to stop miner process');
                    } else {
                        event.reply('mining-stopped');
                    }
                });
            }
        }, 5000);

        minerProcess.once('exit', () => {
            clearTimeout(killTimeout);
            event.reply('mining-stopped');
        });
    } else {
        event.reply('mining-error', 'Miner is not running');
    }
}

module.exports = stopMining;
