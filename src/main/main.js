require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-disk-cache');

let isCancelled = false;

function createWindow() {
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    
    mainWindow = new BrowserWindow({
        width: 950,
        height: 860,
        backgroundColor: '#0f172a',
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    });

    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist-react', 'index.html'));
    } else {
        mainWindow.loadURL('http://localhost:5173');
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

const { dialog } = require('electron');

// Registrar Controladores Clean Architecture
const downloadController = require('./controllers/DownloadController');
const uploadController = require('./controllers/UploadController');
const pageController = require('./controllers/PageController');
const videoController = require('./controllers/VideoController');

downloadController.register();
uploadController.register();
pageController.register();
videoController.register();

// Manejar selección de carpeta
ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Selecciona dónde guardar las descargas'
    });

    if (result.canceled) {
        return null;
    } else {
        return result.filePaths[0];
    }
});

