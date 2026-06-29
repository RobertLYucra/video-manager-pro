require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const db = require('../database/db');

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB fragmentos

let isCancelled = false;

async function startUpload(event, options = {}) {
    isCancelled = false;
    const targetPagina = options.pagina || 'todas';
    const targetCategoria = options.categoria || 'todas';
    const limiteVideos = options.limite || 7;
    const intervaloInicial = options.intervaloInicial || 10;
    const intervaloSucesivo = options.intervaloSucesivo || 60;
    const fechaExacta = options.fechaExacta || null; // string in format YYYY-MM-DDTHH:mm
    
    const PUBLICAR_INMEDIATO = options.publicarInmediato || (process.env.PUBLICAR_INMEDIATO === 'true'); 
    
    const tokensDb = await db.getPages();

    if (tokensDb.length === 0) {
        event.reply('upload-progress', 'ERROR: No se encontraron páginas configuradas. Ve a Configuración para añadirlas.');
        event.reply('upload-complete', { success: false });
        return;
    }

    try {
        const records = await db.getVideos();

        const pendingVideos = [];
        for (let i = 0; i < records.length; i++) {
            let matchPagina = true;
            if (targetPagina && targetPagina.toLowerCase() !== 'todas') {
                matchPagina = records[i].pagina_destino && records[i].pagina_destino.toLowerCase() === targetPagina.toLowerCase();
            }
            
            let matchCategoria = true;
            if (targetCategoria && targetCategoria.toLowerCase() !== 'todas') {
                matchCategoria = records[i].categoria && records[i].categoria.toLowerCase() === targetCategoria.toLowerCase();
            }

            if (records[i].estado === 'pendiente' && matchPagina && matchCategoria) {
                pendingVideos.push(records[i]);
                if (pendingVideos.length === limiteVideos) break;
            }
        }

        if (pendingVideos.length === 0) {
            event.reply('upload-progress', `¡No hay más videos pendientes para esta página!`);
            event.reply('upload-complete', { success: true });
            return;
        }

        event.reply('upload-progress', `Se encontraron ${pendingVideos.length} videos. Iniciando...`);
        
        let initialOffsetMs = intervaloInicial * 60 * 1000;
        const nowMs = Date.now();

        if (fechaExacta) {
            const exactDate = new Date(fechaExacta).getTime();
            if (!isNaN(exactDate) && exactDate > nowMs) {
                initialOffsetMs = exactDate - nowMs;
                event.reply('upload-progress', `⏰ Usando fecha exacta de inicio: ${new Date(exactDate).toLocaleString()}`);
            } else {
                event.reply('upload-progress', '⚠️ La fecha exacta provista ya pasó o es inválida. Usando intervalo inicial en minutos.');
            }
        }

        const SCHEDULE_OFFSETS_MS = pendingVideos.map((_, index) => {
            if (index === 0) return initialOffsetMs;
            return initialOffsetMs + (index * intervaloSucesivo * 60 * 1000);
        });

        for (let i = 0; i < pendingVideos.length; i++) {
            if (isCancelled) {
                event.reply('upload-progress', 'Subida cancelada por el usuario.');
                break;
            }

            const video = pendingVideos[i];
            const projectRoot = path.join(__dirname, '..', '..', '..');
            const filePath = path.isAbsolute(video.ruta) ? video.ruta : path.join(projectRoot, video.ruta);

            // Encontrar token para esta página
            const pageCreds = tokensDb.find(t => t.folder === video.pagina_destino);
            if (!pageCreds) {
                event.reply('upload-progress', `❌ Ignorando ${video.titulo}: No hay credenciales para la página "${video.pagina_destino}"`);
                continue;
            }
            
            const PAGE_ID = pageCreds.page_id;
            const PAGE_ACCESS_TOKEN = pageCreds.token;

            event.reply('upload-progress', `Procesando [${i + 1}/${pendingVideos.length}]: ${video.titulo} (Destino: ${pageCreds.nombre_pag})`);

            if (!fs.existsSync(filePath)) {
                event.reply('upload-progress', `❌ Archivo no existe: ${filePath}`);
                await db.updateVideo(video.id, { estado: 'error', error_log: 'Archivo no encontrado' });
                continue; 
            }

            const stats = fs.statSync(filePath);
            await db.updateVideo(video.id, { intentos: (video.intentos || 0) + 1 });

            try {
                event.reply('upload-progress', '🔄 Fase 1: START...');
                const startRes = await axios.post(`https://graph.facebook.com/v19.0/${PAGE_ID}/videos`, null, {
                    params: { access_token: PAGE_ACCESS_TOKEN, upload_phase: 'start', file_size: stats.size }
                });

                const { upload_session_id, video_id } = startRes.data;
                let { start_offset } = startRes.data;

                const fd = fs.openSync(filePath, 'r');
                let currentOffset = parseInt(start_offset, 10);

                while (currentOffset < stats.size) {
                    if (isCancelled) break;
                    const bytesToRead = Math.min(CHUNK_SIZE, stats.size - currentOffset);
                    const buffer = Buffer.alloc(bytesToRead);
                    fs.readSync(fd, buffer, 0, bytesToRead, currentOffset);

                    const form = new FormData();
                    form.append('access_token', PAGE_ACCESS_TOKEN);
                    form.append('upload_phase', 'transfer');
                    form.append('upload_session_id', upload_session_id);
                    form.append('start_offset', currentOffset.toString());
                    form.append('video_file_chunk', buffer, { filename: 'chunk.mp4' });

                    const porcentaje = Math.round((currentOffset / stats.size) * 100);
                    event.reply('upload-progress', `📤 Subiendo chunk... (${porcentaje}%) - ${video.titulo}`);
                    
                    event.reply('upload-bar', { title: video.titulo, percent: porcentaje, totalVideos: pendingVideos.length, currentVideo: i + 1 });

                    const transferRes = await axios.post(`https://graph.facebook.com/v19.0/${PAGE_ID}/videos`, form, {
                        headers: form.getHeaders(),
                        maxBodyLength: Infinity,
                        maxContentLength: Infinity
                    });

                    const newOffset = parseInt(transferRes.data.start_offset, 10);
                    if (newOffset === currentOffset) throw new Error('Network error on FB offset');
                    currentOffset = newOffset;
                }
                fs.closeSync(fd);
                if (isCancelled) break;

                event.reply('upload-progress', '✅ Fase 3: FINISH...');
                let finalDescription = `${video.titulo}\n${video.descripcion || ''}`;
                const finishParams = {
                    access_token: PAGE_ACCESS_TOKEN,
                    upload_phase: 'finish',
                    upload_session_id: upload_session_id,
                    title: video.titulo,
                    description: finalDescription,
                    published: PUBLICAR_INMEDIATO
                };

                if (!PUBLICAR_INMEDIATO) {
                    const publishTimeUnix = Math.floor((nowMs + SCHEDULE_OFFSETS_MS[i]) / 1000);
                    finishParams.scheduled_publish_time = publishTimeUnix;
                    
                    const dateVisual = new Date(nowMs + SCHEDULE_OFFSETS_MS[i]).toLocaleString();
                    event.reply('upload-progress', `⏰ Video programado para publicarse el: ${dateVisual}`);
                }

                const finishRes = await axios.post(`https://graph.facebook.com/v19.0/${PAGE_ID}/videos`, null, { params: finishParams });

                if (finishRes.data.success) {
                    event.reply('upload-progress', `🎉 ¡Éxito! Subido correctamente.`);
                    event.reply('upload-bar', { title: video.titulo, percent: 100, totalVideos: pendingVideos.length, currentVideo: i + 1 });
                    
                    const updateData = {
                        estado: 'completado',
                        id_facebook: video_id,
                        fecha_proceso: new Date().toISOString(),
                        error_log: ''
                    };

                    // Mover el archivo procesado a su subcarpeta 'procesados' relativa a su ubicación actual
                    const procesadosDir = path.join(path.dirname(filePath), 'procesados');
                    
                    if (!fs.existsSync(procesadosDir)) fs.mkdirSync(procesadosDir, { recursive: true });

                    const nuevaRuta = path.join(procesadosDir, video.archivo);
                    try {
                        fs.renameSync(filePath, nuevaRuta);
                        updateData.ruta = path.relative(__dirname, nuevaRuta);
                    } catch (err) {}

                    await db.updateVideo(video.id, updateData);
                }
            } catch (videoError) {
                const msgError = videoError.response ? JSON.stringify(videoError.response.data) : videoError.message;
                event.reply('upload-progress', `❌ Error subiendo ${video.titulo}: ${msgError}`);
                await db.updateVideo(video.id, { estado: 'error', error_log: msgError });
            }
        }
        
        event.reply('upload-complete', { success: !isCancelled });

    } catch (err) {
        event.reply('upload-progress', `Fatal error: ${err.message}`);
        event.reply('upload-complete', { success: false });
    }
}

function cancelUpload() {
    isCancelled = true;
}

module.exports = { startUpload, cancelUpload };
