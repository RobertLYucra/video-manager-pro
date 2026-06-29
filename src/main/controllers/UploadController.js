const { ipcMain } = require('electron');
const uploader = require('../services/uploader');

class UploadController {
    register() {
        ipcMain.on('start-upload', (event, options) => {
            uploader.startUpload(event, options);
        });

        ipcMain.on('cancel-upload', (event) => {
            uploader.cancelUpload();
        });
        
        ipcMain.handle('generate-csv', async (event) => {
            try {
                const scanner = require('../services/scanner.js');
                return await scanner.syncFilesToDB(event);
            } catch (e) {
                console.error(e);
                return { success: false, message: e.message };
            }
        });
    }
}

module.exports = new UploadController();
