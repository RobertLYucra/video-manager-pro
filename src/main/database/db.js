const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const configDir = path.join(__dirname, '..', '..', '..', 'config');
const dbPath = path.join(configDir, 'database.sqlite');

// Ensure config dir exists
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

let dbPromise = null;

async function getDb() {
    if (dbPromise) {
        return dbPromise;
    }
    
    dbPromise = (async () => {
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        await initializeDb(db);
        return db;
    })();
    
    return dbPromise;
}

async function initializeDb(db) {
    // Create settings table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    // Create pages table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            folder TEXT NOT NULL UNIQUE,
            page_id TEXT NOT NULL,
            token TEXT NOT NULL,
            categories TEXT, -- stored as JSON string
            platform TEXT DEFAULT 'facebook'
        )
    `);

    // Migration for existing tables without 'platform' column
    try {
        await db.exec(`ALTER TABLE pages ADD COLUMN platform TEXT DEFAULT 'facebook'`);
    } catch (err) {
        // Ignorar si la columna ya existe
    }

    // Create videos table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            archivo TEXT NOT NULL,
            ruta TEXT NOT NULL,
            titulo TEXT NOT NULL,
            descripcion TEXT,
            estado TEXT DEFAULT 'pendiente',
            categoria TEXT DEFAULT 'General',
            pagina_destino TEXT,
            nombre_pagina TEXT,
            id_facebook TEXT,
            fecha_creacion DATETIME,
            fecha_proceso DATETIME,
            intentos INTEGER DEFAULT 0,
            error_log TEXT,
            FOREIGN KEY(pagina_destino) REFERENCES pages(folder)
        )
    `);

    // Migrations for existing tables
    try {
        await db.exec(`ALTER TABLE videos ADD COLUMN nombre_pagina TEXT`);
    } catch (err) {
        // Ignorar si la columna ya existe
    }

    // Basic Migration from old JSON and CSV if they exist and DB is empty
    const { count: pagesCount } = await db.get('SELECT COUNT(*) as count FROM pages');
    if (pagesCount === 0) {
        const tokensFile = path.join(__dirname, '..', '..', '..', 'tokens.json');
        if (fs.existsSync(tokensFile)) {
            try {
                const tokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
                for (const t of tokens) {
                    await db.run(
                        'INSERT OR IGNORE INTO pages (name, folder, page_id, token, categories) VALUES (?, ?, ?, ?, ?)',
                        [t.nombre_pag, t.folder, t.page_id, t.token, JSON.stringify(t.categorias || [])]
                    );
                }
                console.log('Migrated tokens.json to SQLite');
            } catch (e) {
                console.error('Error migrating tokens:', e);
            }
        }
    }

    const { count: videosCount } = await db.get('SELECT COUNT(*) as count FROM videos');
    if (videosCount === 0) {
        const csvFile = path.join(__dirname, '..', '..', '..', 'videos.csv');
        if (fs.existsSync(csvFile)) {
            try {
                const fsModule = require('fs');
                const csvParser = require('csv-parser');
                const results = [];
                await new Promise((resolve, reject) => {
                    fsModule.createReadStream(csvFile)
                        .pipe(csvParser())
                        .on('data', (data) => results.push(data))
                        .on('end', () => resolve(results))
                        .on('error', (err) => reject(err));
                });
                
                const stmt = await db.prepare('INSERT INTO videos (archivo, ruta, titulo, descripcion, estado, categoria, pagina_destino, id_facebook, fecha_creacion, fecha_proceso, intentos, error_log) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                for (const v of results) {
                    await stmt.run([
                        v.archivo, v.ruta, v.titulo, v.descripcion, v.estado, v.categoria, v.pagina_destino, v.id_facebook, v.fecha_creacion, v.fecha_proceso, v.intentos || 0, v.error_log
                    ]);
                }
                await stmt.finalize();
                console.log('Migrated videos.csv to SQLite');
            } catch (e) {
                console.error('Error migrating videos:', e);
            }
        }
    }
}

module.exports = {
    getDb
};
