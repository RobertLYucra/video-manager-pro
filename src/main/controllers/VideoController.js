const { ipcMain } = require('electron');
const videoRepository = require('../repositories/VideoRepository');

class VideoController {
    register() {
        ipcMain.handle('get-csv-data', async () => {
            try {
                return await videoRepository.findAll();
            } catch (e) {
                console.error('Error fetching videos from DB:', e);
                return [];
            }
        });
    }
}

module.exports = new VideoController();
