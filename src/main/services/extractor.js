const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ExtractorService {
    constructor() {
        this.currentProcess = null;
        this.isCancelled = false;
    }

    async startExtraction(event, files, format = 'mp3-alta') {
        this.isCancelled = false;
        const sendProgress = (type, data) => {
            if (event && event.sender) {
                event.sender.send('extractor-progress', { type, ...data });
            }
        };

        sendProgress('log', { message: `Iniciando procesamiento de ${files.length} videos...\n`, isSuccess: false });

        let completed = 0;

        for (let i = 0; i < files.length; i++) {
            if (this.isCancelled) {
                sendProgress('log', { message: '🛑 Proceso de extracción cancelado por el usuario.\n', isError: true });
                sendProgress('complete', { success: false, message: 'Cancelado por el usuario' });
                return;
            }

            const inputFile = files[i];
            const outputDir = path.dirname(inputFile);
            const fileName = path.basename(inputFile, path.extname(inputFile));
            
            let ext = '.mp3';
            if (format === 'original') ext = '.m4a';
            
            const outputFile = path.join(outputDir, `${fileName}${ext}`);
            
            sendProgress('log', { message: `⏳ Procesando (${i + 1}/${files.length}): ${fileName}...`, isSuccess: false });

            try {
                await this.extractAudio(inputFile, outputFile, sendProgress, files.length, completed, format);
                completed++;
                sendProgress('log', { message: `✅ Completado: ${fileName}${ext}\n`, isSuccess: true });
                sendProgress('progress', { percent: (completed / files.length) * 100 });
                // Enviar la ruta del último archivo para poder abrirlo
                if (i === files.length - 1) {
                    sendProgress('complete', { success: true, message: `Se extrajeron ${completed} audios correctamente.`, lastOutput: outputFile });
                }
            } catch (error) {
                if (this.isCancelled) {
                    sendProgress('log', { message: `\n🛑 Cancelado en: ${fileName}\n`, isError: true });
                } else {
                    sendProgress('log', { message: `\n❌ Error extrayendo ${fileName}: ${error.message}\n`, isError: true });
                }
            }
        }

        if (!this.isCancelled && completed === 0) {
            sendProgress('complete', { success: true, message: `No se completó ninguna extracción.` });
        }
    }

    cancelExtraction() {
        this.isCancelled = true;
        if (this.currentProcess) {
            this.currentProcess.kill('SIGKILL');
            this.currentProcess = null;
        }
    }

    extractAudio(inputFile, outputFile, sendProgress, totalFiles, completedFiles, format) {
        return new Promise((resolve, reject) => {
            let args = [];
            if (format === 'mp3-alta') {
                args = ['-y', '-i', inputFile, '-q:a', '0', '-map', 'a', outputFile];
            } else if (format === 'mp3-ligero') {
                args = ['-y', '-i', inputFile, '-b:a', '128k', '-map', 'a', outputFile];
            } else if (format === 'original') {
                args = ['-y', '-i', inputFile, '-vn', '-c:a', 'copy', outputFile];
            } else {
                args = ['-y', '-i', inputFile, '-q:a', '0', '-map', 'a', outputFile]; // Fallback
            }

            this.currentProcess = spawn(ffmpegPath, args);

            let duration = 0;

            this.currentProcess.stderr.on('data', (data) => {
                const output = data.toString();
                // Intentar capturar la duración total del video
                const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                if (durationMatch) {
                    const hours = parseInt(durationMatch[1], 10);
                    const minutes = parseInt(durationMatch[2], 10);
                    const seconds = parseFloat(durationMatch[3]);
                    duration = (hours * 3600) + (minutes * 60) + seconds;
                }

                // Capturar el tiempo actual procesado
                const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                if (timeMatch && duration > 0) {
                    const hours = parseInt(timeMatch[1], 10);
                    const minutes = parseInt(timeMatch[2], 10);
                    const seconds = parseFloat(timeMatch[3]);
                    const currentTime = (hours * 3600) + (minutes * 60) + seconds;
                    
                    const fileProgress = (currentTime / duration);
                    // Progreso total ponderado
                    const basePercent = (completedFiles / totalFiles) * 100;
                    const additionalPercent = (fileProgress / totalFiles) * 100;
                    const totalPercent = Math.min(100, Math.max(0, basePercent + additionalPercent));
                    
                    sendProgress('progress', { percent: totalPercent });
                }
            });

            this.currentProcess.on('close', (code) => {
                this.currentProcess = null;
                if (code === 0) {
                    resolve();
                } else if (this.isCancelled) {
                    reject(new Error('Cancelado'));
                } else {
                    reject(new Error(`FFmpeg terminó con código ${code}`));
                }
            });

            this.currentProcess.on('error', (err) => {
                this.currentProcess = null;
                reject(err);
            });
        });
    }
}

module.exports = new ExtractorService();
