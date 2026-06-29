const { ipcMain } = require('electron');
const pageRepository = require('../repositories/PageRepository');

class PageController {
    register() {
        ipcMain.handle('get-tokens', async () => {
            try {
                return await pageRepository.findAll();
            } catch (e) {
                console.error('Error fetching pages from DB:', e);
                return [];
            }
        });

        ipcMain.handle('add-page', async (event, pageData) => {
            try {
                return { success: true, data: await pageRepository.create(pageData) };
            } catch (e) {
                return { success: false, message: e.message };
            }
        });

        ipcMain.handle('update-page', async (event, { id, pageData }) => {
            try {
                return { success: true, data: await pageRepository.update(id, pageData) };
            } catch (e) {
                return { success: false, message: e.message };
            }
        });

        ipcMain.handle('delete-page', async (event, id) => {
            try {
                await pageRepository.delete(id);
                return { success: true };
            } catch (e) {
                return { success: false, message: e.message };
            }
        });
    }
}

module.exports = new PageController();
