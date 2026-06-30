const { ipcMain, dialog, BrowserWindow, shell } = require('electron');
const editorService = require('../services/editor');

class EditorController {
    register() {
        ipcMain.handle('select-files-editor', async (event, multiple = false) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            const properties = ['openFile'];
            if (multiple) properties.push('multiSelections');

            const result = await dialog.showOpenDialog(window, {
                properties: properties,
                filters: [
                    { name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                title: 'Selecciona los videos para editar'
            });

            if (result.canceled) {
                return [];
            } else {
                return result.filePaths;
            }
        });

        ipcMain.on('start-editor-trim', (event, data) => {
            editorService.startTrim(event, data);
        });

        ipcMain.on('start-editor-compress', (event, data) => {
            editorService.startCompress(event, data);
        });

        ipcMain.on('start-editor-join', (event, data) => {
            editorService.startJoin(event, data);
        });

        ipcMain.on('cancel-editor', (event) => {
            editorService.cancel();
        });
    }
}

module.exports = new EditorController();
