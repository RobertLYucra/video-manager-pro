const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class EditorService {
    constructor() {
        this.currentProcess = null;
        this.isCancelled = false;
    }

    _sendProgress(event, type, data) {
        if (event && event.sender) {
            event.sender.send('editor-progress', { type, ...data });
        }
    }

    _getDurationInSeconds(timeStr) {
        // timeStr format: HH:MM:SS or MM:SS
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 0;
    }

    async processFile(event, commandArgs, successMessage) {
        return new Promise((resolve, reject) => {
            let totalDuration = 0;
            this.currentProcess = spawn(ffmpegPath, commandArgs);

            this.currentProcess.stderr.on('data', (data) => {
                const output = data.toString();
                // Extract duration to calculate progress
                const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                if (durationMatch) {
                    totalDuration = this._getDurationInSeconds(`${durationMatch[1]}:${durationMatch[2]}:${durationMatch[3]}`);
                }

                const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                if (timeMatch && totalDuration > 0) {
                    const currentTime = this._getDurationInSeconds(`${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`);
                    const percent = Math.min((currentTime / totalDuration) * 100, 100);
                    this._sendProgress(event, 'progress', { percent });
                }

                this._sendProgress(event, 'log', { message: output, isError: false });
            });

            this.currentProcess.on('close', (code) => {
                this.currentProcess = null;
                if (this.isCancelled) {
                    this._sendProgress(event, 'log', { message: '🛑 Proceso cancelado por el usuario.\n', isError: true });
                    resolve(false);
                } else if (code === 0) {
                    this._sendProgress(event, 'log', { message: `✅ ${successMessage}\n`, isSuccess: true });
                    resolve(true);
                } else {
                    this._sendProgress(event, 'log', { message: `❌ Proceso falló con código ${code}\n`, isError: true });
                    resolve(false);
                }
            });
        });
    }

    async startTrim(event, { file, start, end }) {
        this.isCancelled = false;
        this._sendProgress(event, 'log', { message: `Iniciando recorte rápido de: ${path.basename(file)}\n`, isSuccess: false });
        this._sendProgress(event, 'progress', { percent: 0 });

        const ext = path.extname(file);
        const name = path.basename(file, ext);
        const outputDir = path.dirname(file);
        const outputPath = path.join(outputDir, `${name}_recortado${ext}`);

        // ffmpeg -ss start -to end -i input -c copy output
        const args = ['-ss', start, '-to', end, '-i', file, '-c', 'copy', outputPath, '-y'];

        const success = await this.processFile(event, args, 'Recorte completado con éxito.');
        this._sendProgress(event, 'complete', { success, outputPath: success ? outputPath : null });
    }

    async startCompress(event, { file, level }) {
        this.isCancelled = false;
        this._sendProgress(event, 'log', { message: `Iniciando compresión de: ${path.basename(file)}\n`, isSuccess: false });
        this._sendProgress(event, 'progress', { percent: 0 });

        const ext = path.extname(file);
        const name = path.basename(file, ext);
        const outputDir = path.dirname(file);
        const outputPath = path.join(outputDir, `${name}_comprimido${ext}`);

        let crf = '28';
        let preset = 'medium'; // x265 is slower, so medium is a good balance

        if (level === 'ligero') {
            crf = '24';
        } else if (level === 'medio') {
            crf = '28';
        } else if (level === 'agresivo') {
            crf = '32';
        }

        // Usar libx265 (HEVC) para reducir drásticamente el peso manteniendo la calidad visual original
        // ffmpeg -i input -vcodec libx265 -crf X -preset medium -acodec aac -b:a 128k output
        const args = ['-i', file, '-vcodec', 'libx265', '-crf', crf, '-preset', preset, '-acodec', 'aac', '-b:a', '128k', outputPath, '-y'];

        const success = await this.processFile(event, args, 'Compresión completada con éxito.');
        this._sendProgress(event, 'complete', { success, outputPath: success ? outputPath : null });
    }

    async startJoin(event, { files }) {
        this.isCancelled = false;
        this._sendProgress(event, 'log', { message: `Iniciando unificación de ${files.length} videos...\n`, isSuccess: false });
        this._sendProgress(event, 'progress', { percent: 0 });

        if (!files || files.length < 2) {
            this._sendProgress(event, 'log', { message: '❌ Se necesitan al menos 2 videos para unir.\n', isError: true });
            this._sendProgress(event, 'complete', { success: false });
            return;
        }

        const ext = path.extname(files[0]);
        const outputDir = path.dirname(files[0]);
        const outputPath = path.join(outputDir, `Video_Unificado_${Date.now()}${ext}`);
        
        // Crear archivo de lista temporal para el concat demuxer
        const listPath = path.join(outputDir, `concat_list_${Date.now()}.txt`);
        let listContent = '';
        files.forEach(f => {
            // Reemplazar barras invertidas con diagonales para ffmpeg
            listContent += `file '${f.replace(/\\/g, '/')}'\n`;
        });
        fs.writeFileSync(listPath, listContent, 'utf8');

        // ffmpeg -f concat -safe 0 -i list.txt -c copy output
        const args = ['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath, '-y'];

        const success = await this.processFile(event, args, 'Unificación completada con éxito.');
        
        // Limpiar archivo temporal
        if (fs.existsSync(listPath)) fs.unlinkSync(listPath);

        this._sendProgress(event, 'complete', { success, outputPath: success ? outputPath : null });
    }

    cancel() {
        this.isCancelled = true;
        if (this.currentProcess) {
            this.currentProcess.kill('SIGKILL');
        }
    }
}

module.exports = new EditorService();
