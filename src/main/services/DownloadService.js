const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');

class DownloadService {
    constructor() {
        this.currentDownloadProcess = null;
        this.isCancelled = false;
    }

    startDownload(event, options) {
        this.isCancelled = false;
        this.runDownload(event, options, true);
    }

    cancelDownload(event) {
        this.isCancelled = true;
        if (this.currentDownloadProcess) {
            if (this.currentDownloadProcess.stdout) this.currentDownloadProcess.stdout.removeAllListeners('data');
            if (this.currentDownloadProcess.stderr) this.currentDownloadProcess.stderr.removeAllListeners('data');

            try {
                if (process.platform === 'win32') {
                    require('child_process').execSync(`taskkill /pid ${this.currentDownloadProcess.pid} /f /t`);
                } else {
                    this.currentDownloadProcess.kill();
                }
            } catch (e) {
                console.error('Error al cancelar la descarga:', e);
            }
            this.currentDownloadProcess = null;
        }
        event.reply('download-complete', -1);
    }

    async clearHistory() {
        const archiveFile = process.env.REGISTRO_DESCARGAS || 'descargas_completadas.txt';
        const projectRoot = path.join(__dirname, '..', '..', '..');
        const archivePath = path.join(projectRoot, 'config', archiveFile);

        if (fs.existsSync(archivePath)) {
            try {
                fs.unlinkSync(archivePath);
                return true;
            } catch (e) {
                console.error('Error al borrar el historial:', e);
                return false;
            }
        }
        return true;
    }

    runDownload(event, { urls, resolucion, soloAudio, outputFolder, forceRedownload }, allowAutoUpdate) {
        const finalOutputFolder = outputFolder || process.env.CARPETA_DESTINO || 'descargas';
        const ytDlpExe = process.env.YT_DLP_EJECUTABLE || 'yt-dlp.exe';
        const archiveFile = process.env.REGISTRO_DESCARGAS || 'descargas_completadas.txt';
        const listFile = process.env.LISTA_ENLACES || process.env.LISTA_CANALES || 'download-movies.txt';
        
        const projectRoot = path.join(__dirname, '..', '..', '..');
        const ytDlpPath = path.join(projectRoot, 'bin', ytDlpExe);
        
        const configDir = path.join(projectRoot, 'config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        const folderPath = path.isAbsolute(finalOutputFolder) ? finalOutputFolder : path.join(projectRoot, finalOutputFolder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

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

        args.push('--retries', '50');
        args.push('--fragment-retries', '50');
        args.push('--retry-sleep', '3');
        args.push('--no-playlist');

        if (ffmpeg) {
            args.push('--ffmpeg-location', ffmpeg);
        }

        if (process.env.YT_DLP_IGNORAR_ERRORES === 'true') {
            args.push('-i');
        }

        if (process.env.USAR_COOKIES_DE) {
            args.push('--cookies-from-browser', process.env.USAR_COOKIES_DE);
        }

        args.push('-o', path.join(folderPath, '%(title).100s.%(ext)s'));

        if (archiveFile && !forceRedownload) {
            args.push('--download-archive', archiveFilePath);
        }

        args.push('--newline');
        args.push('-a', listFilePath);

        try {
            this.currentDownloadProcess = spawn(ytDlpPath, args);

            this.currentDownloadProcess.on('error', (err) => {
                console.error('Error al iniciar yt-dlp:', err);
                event.reply('download-progress', `Error crítico: No se pudo ejecutar yt-dlp. ${err.message}`);
                this.currentDownloadProcess = null;
                event.reply('download-complete', 1);
            });

            this.currentDownloadProcess.stdout.on('data', (data) => {
                if (this.isCancelled) return;
                event.reply('download-progress', data.toString());
            });

            this.currentDownloadProcess.stderr.on('data', (data) => {
                if (this.isCancelled) return;
                console.error(`yt-dlp error: ${data}`);
                event.reply('download-progress', data.toString());
            });

            this.currentDownloadProcess.on('close', (code) => {
                if (this.isCancelled || !this.currentDownloadProcess) return;

                this.currentDownloadProcess = null;

                if (code !== 0 && allowAutoUpdate) {
                    event.reply('download-progress', '⚠️ Error detectado (Posible bloqueo). Actualizando motor internamente...');

                    const updateProcess = spawn(ytDlpPath, ['-U']);

                    updateProcess.stdout.on('data', (d) => event.reply('download-progress', d.toString()));
                    updateProcess.stderr.on('data', (d) => event.reply('download-progress', d.toString()));

                    updateProcess.on('close', (updateCode) => {
                        try {
                            const oldPath = ytDlpPath + '.old';
                            if (require('fs').existsSync(oldPath)) {
                                require('fs').unlinkSync(oldPath);
                            }
                        } catch (e) { }

                        if (updateCode === 0) {
                            event.reply('download-progress', '✅ Motor actualizado correctamente. Reintentando la descarga...');
                            this.runDownload(event, { urls, resolucion, soloAudio, outputFolder, forceRedownload }, false);
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
}

module.exports = new DownloadService();
