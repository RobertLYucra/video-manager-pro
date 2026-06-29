require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const { startUpload, cancelUpload, readCsv } = require('./services/uploader');
const db = require('./database/db');

let mainWindow;
let currentDownloadProcess = null;

// Desactivar el caché de GPU para evitar el error 'Unable to create cache' en Windows
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
            preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
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

// Manejar limpiado de historial
ipcMain.handle('clear-history', async () => {
    const archiveFile = process.env.REGISTRO_DESCARGAS || 'descargas_completadas.txt';
    const archivePath = path.join(__dirname, '..', '..', 'config', archiveFile);

    if (fs.existsSync(archivePath)) {
        try {
            fs.unlinkSync(archivePath);
            return true;
        } catch (e) {
            console.error('Error al borrar el historial:', e);
            return false;
        }
    }
    return true; // Si no existe, consideramos que ya está limpio
});

// Manejar cancelación
ipcMain.on('cancel-download', (event) => {
    isCancelled = true;
    if (currentDownloadProcess) {
        // Cortar la comunicación de logs inmediatamente
        if (currentDownloadProcess.stdout) currentDownloadProcess.stdout.removeAllListeners('data');
        if (currentDownloadProcess.stderr) currentDownloadProcess.stderr.removeAllListeners('data');

        // Enviar señal de terminación (En Windows, matamos todo el árbol de procesos)
        try {
            if (process.platform === 'win32') {
                require('child_process').execSync(`taskkill /pid ${currentDownloadProcess.pid} /f /t`);
            } else {
                currentDownloadProcess.kill();
            }
        } catch (e) {
            console.error('Error al cancelar la descarga:', e);
        }
        currentDownloadProcess = null; // Desvincular inmediatamente
    }
    // Avisar a la UI al instante para que no se quede cargando
    event.reply('download-complete', -1);
});

// Backend logic para descargar
ipcMain.on('start-download', (event, options) => {
    isCancelled = false;
    runDownload(event, options, true);
});

function runDownload(event, { urls, resolucion, soloAudio, outputFolder, forceRedownload }, allowAutoUpdate) {
    // Si no enviaron carpeta por UI, usamos el entorno
    const finalOutputFolder = outputFolder || process.env.CARPETA_DESTINO || 'descargas';
    const ytDlpExe = process.env.YT_DLP_EJECUTABLE || 'yt-dlp.exe';
    const archiveFile = process.env.REGISTRO_DESCARGAS || 'descargas_completadas.txt';
    const listFile = process.env.LISTA_ENLACES || process.env.LISTA_CANALES || 'download-movies.txt';
    
    const projectRoot = path.join(__dirname, '..', '..');
    const ytDlpPath = path.join(projectRoot, 'bin', ytDlpExe);
    
    const configDir = path.join(projectRoot, 'config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const folderPath = path.isAbsolute(finalOutputFolder) ? finalOutputFolder : path.join(projectRoot, finalOutputFolder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    // Escribir URLs al archivo de texto para que yt-dlp lo lea
    const listFilePath = path.join(configDir, listFile);
    fs.writeFileSync(listFilePath, urls.join('\n'), 'utf-8');

    const archiveFilePath = path.join(configDir, archiveFile);

    const args = [];

    if (soloAudio) {
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
        const res = resolucion || process.env.RESOLUCION_MAXIMA || '1080';
        const formatEnv = `bestvideo[ext=mp4][height<=${res}]+bestaudio[ext=m4a]/best[ext=mp4]/best`;
        args.push('-f', formatEnv);
        args.push('--merge-output-format', 'mp4');
    }

    // Estrategia de Resiliencia: Si se cae el internet en descargas largas (ej: 1 hora)
    args.push('--retries', '50'); // Reintenta 50 veces si la conexión general falla
    args.push('--fragment-retries', '50'); // Reintenta 50 veces si un pedazo específico del video falla
    args.push('--retry-sleep', '3'); // Espera 3 segundos antes de reintentar para no ser bloqueado

    // Manejar descarga de Mixes o Playlists enteras o perfiles
    args.push('--no-playlist');

    // Forzar el uso del ffmpeg-static que descargamos en node_modules
    if (ffmpeg) {
        args.push('--ffmpeg-location', ffmpeg);
    }

    if (process.env.YT_DLP_IGNORAR_ERRORES === 'true') {
        args.push('-i');
    }

    // Si YouTube pide confirmación de bot (HTTP 429), usar cookies del navegador
    if (process.env.USAR_COOKIES_DE) {
        args.push('--cookies-from-browser', process.env.USAR_COOKIES_DE);
    }

    // Restringir caracteres especiales problemáticos en Windows
    // args.push('--restrict-filenames');

    // Ruta de guardado final: limitamos el título a 100 caracteres para evitar el error de ruta muy larga en Windows (MAX_PATH)
    args.push('-o', path.join(folderPath, '%(title).100s.%(ext)s'));

    // Si NO forzamos re-descarga, usamos el archivo de registro para saltar los ya descargados
    if (archiveFile && !forceRedownload) {
        args.push('--download-archive', archiveFilePath);
    }

    args.push('--newline'); // Clave para obtener progreso en formato parseable
    args.push('-a', listFilePath); // Usar el archivo con las URLs

    try {
        currentDownloadProcess = spawn(ytDlpPath, args);

        currentDownloadProcess.on('error', (err) => {
            console.error('Error al iniciar yt-dlp:', err);
            event.reply('download-progress', `Error crítico: No se pudo ejecutar yt-dlp. ${err.message}`);
            currentDownloadProcess = null;
            event.reply('download-complete', 1);
        });

        currentDownloadProcess.stdout.on('data', (data) => {
            if (isCancelled) return;
            event.reply('download-progress', data.toString());
        });

        currentDownloadProcess.stderr.on('data', (data) => {
            if (isCancelled) return;
            console.error(`yt-dlp error: ${data}`);
            event.reply('download-progress', data.toString());
        });

        currentDownloadProcess.on('close', (code) => {
            // Si el usuario canceló, ya manejamos la UI y limpiamos la variable. Ignoramos este evento.
            if (isCancelled || !currentDownloadProcess) return;

            currentDownloadProcess = null;

            if (code !== 0 && allowAutoUpdate) {
                event.reply('download-progress', '⚠️ Error detectado (Posible bloqueo). Actualizando motor internamente...');

                const updateProcess = spawn(ytDlpPath, ['-U']);

                updateProcess.stdout.on('data', (d) => event.reply('download-progress', d.toString()));
                updateProcess.stderr.on('data', (d) => event.reply('download-progress', d.toString()));

                updateProcess.on('close', (updateCode) => {
                    // yt-dlp crea un backup del motor viejo terminado en .old, lo eliminamos.
                    try {
                        const oldPath = ytDlpPath + '.old';
                        if (require('fs').existsSync(oldPath)) {
                            require('fs').unlinkSync(oldPath);
                        }
                    } catch (e) { }

                    if (updateCode === 0) {
                        event.reply('download-progress', '✅ Motor actualizado correctamente. Reintentando la descarga...');
                        runDownload(event, { urls, resolucion, soloAudio, outputFolder, forceRedownload }, false);
                    } else {
                        event.reply('download-progress', '❌ No se pudo actualizar el motor. Abortando.');
                        event.reply('download-complete', code);
                    }
                });
            } else {
                event.reply('download-complete', code);
            }
        });
    } catch (e) {
        console.error('Excepción al ejecutar spawn:', e);
        event.reply('download-progress', `Excepción: ${e.message}`);
        event.reply('download-complete', 1);
    }
}

// ========================
// UPLOADER IPC HANDLERS
// ========================

ipcMain.on('start-upload', (event, options) => {
    startUpload(event, options);
});

ipcMain.on('cancel-upload', (event) => {
    cancelUpload();
});

ipcMain.handle('get-csv-data', async () => {
    try {
        const data = await db.getVideos();
        return data;
    } catch (e) {
        console.error('Error fetching videos from DB:', e);
        return [];
    }
});

ipcMain.handle('get-tokens', async () => {
    try {
        const pages = await db.getPages();
        return pages;
    } catch (e) {
        console.error('Error fetching pages from DB:', e);
        return [];
    }
});

// CRUD Pages
ipcMain.handle('add-page', async (event, pageData) => {
    try {
        return { success: true, data: await db.addPage(pageData) };
    } catch (e) {
        return { success: false, message: e.message };
    }
});

ipcMain.handle('update-page', async (event, { id, pageData }) => {
    try {
        return { success: true, data: await db.updatePage(id, pageData) };
    } catch (e) {
        return { success: false, message: e.message };
    }
});

ipcMain.handle('delete-page', async (event, id) => {
    try {
        await db.deletePage(id);
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
});

// Manejar generar_csv.js (Auto-registro)
ipcMain.handle('generate-csv', async () => {
    try {
        const scanner = require('./services/scanner.js');
        const result = await scanner.syncFilesToDB();
        return result;
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
});

