const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const pageRepository = require('../repositories/PageRepository');

const projectRoot = path.join(__dirname, '..', '..', '..');
const descargasDir = path.join(projectRoot, 'descargas');

async function syncFilesToDB(event) {
    const sendLog = (msg) => {
        console.log(msg);
        if (event && event.sender) {
            event.sender.send('upload-progress', { type: 'log', message: msg + '\n' });
        }
    };
    try {
        const videosData = [];
        let ignorados = 0;

        // 1. Obtener todas las páginas de la base de datos
        const paginas = await pageRepository.findAll();

        if (paginas.length === 0) {
            sendLog('No hay páginas configuradas. Escáner terminado.');
            return;
        }

        const filesPendientes = [];

        const projectRoot = path.join(__dirname, '..', '..', '..');

        // 2. Iterar sobre cada página y su carpeta absoluta
        paginas.forEach(page => {
            const isAbsolute = path.isAbsolute(page.folder);
            const paginaDir = isAbsolute ? page.folder : path.join(projectRoot, 'descargas', page.folder);
            const paginaNombre = page.folder; // guardamos el folder original

            if (!fs.existsSync(paginaDir)) {
                sendLog(`⚠️ La carpeta de la página no existe o no es válida: ${paginaDir}`);
                return; // skip esta página
            }

            const itemsPagina = fs.readdirSync(paginaDir);

            itemsPagina.forEach(item => {
                const itemPath = path.join(paginaDir, item);
                const stat = fs.statSync(itemPath);

                if (stat.isDirectory()) {
                    if (item === 'procesados') {
                        // Videos ya subidos
                        const procesados = fs.readdirSync(itemPath).filter(f => ['.mp4', '.mov', '.mkv', '.avi'].includes(path.extname(f).toLowerCase()));
                        procesados.forEach(f => {
                            videosData.push({
                                file: f, 
                                rutaAbsoluta: path.join(itemPath, f), 
                                estado: 'completado', 
                                categoria: 'General', 
                                pagina_destino: paginaNombre
                            });
                        });
                    } else {
                        // Subcategorías
                        const categoriaDir = itemPath;
                        const itemsCategoria = fs.readdirSync(categoriaDir);
                        
                        itemsCategoria.forEach(subItem => {
                            const subItemPath = path.join(categoriaDir, subItem);
                            if (fs.statSync(subItemPath).isDirectory() && subItem === 'procesados') {
                                const procesadosCat = fs.readdirSync(subItemPath).filter(f => ['.mp4', '.mov', '.mkv', '.avi'].includes(path.extname(f).toLowerCase()));
                                procesadosCat.forEach(f => {
                                    videosData.push({
                                        file: f, 
                                        rutaAbsoluta: path.join(subItemPath, f), 
                                        estado: 'completado', 
                                        categoria: item, 
                                        pagina_destino: paginaNombre
                                    });
                                });
                            } else if (!fs.statSync(subItemPath).isDirectory() && ['.mp4', '.mov', '.mkv', '.avi'].includes(path.extname(subItem).toLowerCase())) {
                                filesPendientes.push({
                                    file: subItem, 
                                    cat: item, 
                                    pagina_destino: paginaNombre,
                                    dir: categoriaDir, 
                                    procesadosDir: path.join(categoriaDir, 'procesados')
                                });
                            }
                        });
                    }
                } else if (['.mp4', '.mov', '.mkv', '.avi'].includes(path.extname(item).toLowerCase())) {
                    filesPendientes.push({
                        file: item, 
                        cat: 'General', 
                        pagina_destino: paginaNombre,
                        dir: paginaDir, 
                        procesadosDir: path.join(paginaDir, 'procesados')
                    });
                }
            });
        });

        filesPendientes.forEach(item => {
            videosData.push({
                file: item.file, 
                rutaAbsoluta: path.join(item.dir, item.file),
                estado: 'pendiente', 
                categoria: item.cat, 
                pagina_destino: item.pagina_destino
            });
        });

        const records = videosData.map(v => {
            let stats;
            try {
                stats = fs.statSync(v.rutaAbsoluta);
            } catch (e) {
                stats = { birthtime: new Date() };
            }
            
            // Hacer la ruta relativa al proyecto para que se guarde limpia en la BD
            const rutaRelativa = path.relative(projectRoot, v.rutaAbsoluta);
            
            return {
                archivo: v.file,
                ruta: rutaRelativa,
                titulo: path.parse(v.file).name,
                descripcion: '¡Disfruta de este video!', // Texto base
                estado: v.estado,
                categoria: v.categoria,
                pagina_destino: v.pagina_destino,
                fecha_creacion: stats.birthtime.toISOString(),
            };
        });

        // Conectar a la base de datos y obtener registros existentes
        const database = await db.getDb();
        const existingVideos = await database.all('SELECT * FROM videos');
        
        // Usamos el nombre del archivo como identificador único para no perder metadata 
        // importante (como id_facebook) si un archivo se movió a procesados
        const existingMap = new Map();
        for (const v of existingVideos) {
            if (!existingMap.has(v.archivo) || v.id_facebook) {
                existingMap.set(v.archivo, v);
            }
        }

        let agregados = 0;
        let regenerados = 0;

        await database.run('BEGIN TRANSACTION');
        
        try {
            // Vaciamos la tabla para volver a generar los registros desde cero
            await database.run('DELETE FROM videos');

            const stmt = await database.prepare('INSERT INTO videos (archivo, ruta, titulo, descripcion, estado, categoria, pagina_destino, id_facebook, fecha_creacion, fecha_proceso, intentos, error_log) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            const processedFiles = new Set();

            for (const record of records) {
                processedFiles.add(record.archivo);
                const old = existingMap.get(record.archivo);
                
                await stmt.run([
                    record.archivo, 
                    record.ruta, 
                    old ? old.titulo : record.titulo, 
                    old ? old.descripcion : record.descripcion, 
                    record.estado, 
                    record.categoria, 
                    record.pagina_destino, 
                    old ? (old.id_facebook || '') : '', 
                    old ? (old.fecha_creacion || record.fecha_creacion) : record.fecha_creacion, 
                    old ? (old.fecha_proceso || '') : '', 
                    old ? (old.intentos || 0) : 0, 
                    old ? (old.error_log || '') : ''
                ]);

                if (old) {
                    regenerados++;
                } else {
                    agregados++;
                }
            }

            // AHORA RE-INSERTAMOS LOS VIDEOS "COMPLETADOS" QUE YA NO ESTÁN EN EL DISCO
            for (const [archivo, old] of existingMap.entries()) {
                if (!processedFiles.has(archivo) && old.estado === 'completado') {
                    // El archivo ya no está en el disco, pero estaba completado. Lo mantenemos para no perder el id_facebook y el historial.
                    await stmt.run([
                        old.archivo, 
                        old.ruta, 
                        old.titulo, 
                        old.descripcion, 
                        old.estado, 
                        old.categoria, 
                        old.pagina_destino, 
                        old.id_facebook || '', 
                        old.fecha_creacion, 
                        old.fecha_proceso || '', 
                        old.intentos || 0, 
                        old.error_log || ''
                    ]);
                    regenerados++;
                }
            }

            await stmt.finalize();
            await database.run('COMMIT');
        } catch (err) {
            await database.run('ROLLBACK');
            throw err;
        }

        sendLog(`¡Éxito! Se sincronizaron los archivos. Se agregaron ${agregados} nuevos videos y se regeneraron ${regenerados} registros en la base de datos.`);
        return { success: true, message: `Registros generados: ${agregados} nuevos, ${regenerados} regenerados.` };
    } catch (error) {
        if (event && event.sender) event.sender.send('upload-progress', { type: 'log', message: `❌ Error al sincronizar: ${error.message}\n` });
        console.error('Error al sincronizar con SQLite:', error);
        throw error;
    }
}

module.exports = { syncFilesToDB };
