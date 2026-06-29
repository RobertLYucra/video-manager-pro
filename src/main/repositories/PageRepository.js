const db = require('../database/db');

class PageRepository {
    async findAll() {
        const database = await db.getDb();
        const rows = await database.all('SELECT * FROM pages');
        return rows.map(r => ({
            id: r.id,
            nombre_pag: r.name,
            folder: r.folder,
            page_id: r.page_id,
            token: r.token,
            categorias: r.categories ? JSON.parse(r.categories) : [],
            platform: r.platform || 'facebook'
        }));
    }

    async create(page) {
        const database = await db.getDb();
        const result = await database.run(
            'INSERT INTO pages (name, folder, page_id, token, categories, platform) VALUES (?, ?, ?, ?, ?, ?)',
            [page.nombre_pag, page.folder, page.page_id, page.token, JSON.stringify(page.categorias || []), page.platform || 'facebook']
        );
        return { id: result.lastID, ...page };
    }

    async update(id, page) {
        const database = await db.getDb();
        await database.run(
            'UPDATE pages SET name = ?, folder = ?, page_id = ?, token = ?, categories = ?, platform = ? WHERE id = ?',
            [page.nombre_pag, page.folder, page.page_id, page.token, JSON.stringify(page.categorias || []), page.platform || 'facebook', id]
        );
        return { id, ...page };
    }

    async delete(id) {
        const database = await db.getDb();
        await database.run('DELETE FROM pages WHERE id = ?', [id]);
        return true;
    }
}

module.exports = new PageRepository();
