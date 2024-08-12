function stopMining(event, mainWindow, minerProcess) {
    return new Promise((resolve, reject) => {
        if (!minerProcess) {
            resolve();
            return;
        }

        console.log('Stopping mining process...');
        
        minerProcess.kill('SIGTERM');

        let killTimeout = setTimeout(() => {
            console.log('Mining process did not exit, forcing kill...');
            minerProcess.kill('SIGKILL');
        }, 1000); // Reduced from 5000 to 1000 ms for quicker forced kill

        minerProcess.on('exit', (code, signal) => {
            clearTimeout(killTimeout);
            console.log(`Mining process exited with code ${code} and signal ${signal}`);
            
            if (event) {
                event.reply('mining-stopped');
                mainWindow.webContents.send('mining-stopped');
            }
            
            resolve();
        });

        minerProcess.on('error', (error) => {
            clearTimeout(killTimeout);
            console.error('Error in mining process:', error);
            reject(error);
        });
    });
}

module.exports = stopMining;