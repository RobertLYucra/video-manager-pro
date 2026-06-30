const { ipcMain, dialog, BrowserWindow, shell } = require('electron');
const extractorService = require('../services/extractor');

class ExtractorController {
    register() {
        ipcMain.handle('select-files-extraction', async (event) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            const result = await dialog.showOpenDialog(window, {
                properties: ['openFile', 'multiSelections'],
                filters: [
                    { name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                title: 'Selecciona los videos para extraer el audio'
            });

            if (result.canceled) {
                return [];
            } else {
                return result.filePaths;
            }
        });

        ipcMain.on('start-extraction', (event, { files, format }) => {
            extractorService.startExtraction(event, files, format);
        });

        ipcMain.on('cancel-extraction', (event) => {
            extractorService.cancelExtraction();
        });

        ipcMain.on('show-item-in-folder', (event, filePath) => {
            shell.showItemInFolder(filePath);
        });
    }
}

module.exports = new ExtractorController();
