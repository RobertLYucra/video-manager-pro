const { ipcMain } = require('electron');
const downloadService = require('../services/DownloadService');

class DownloadController {
    register() {
        ipcMain.on('start-download', (event, options) => {
            downloadService.startDownload(event, options);
        });

        ipcMain.on('cancel-download', (event) => {
            downloadService.cancelDownload(event);
        });
        
        ipcMain.handle('clear-history', async () => {
            return await downloadService.clearHistory();
        });
    }
}

module.exports = new DownloadController();
