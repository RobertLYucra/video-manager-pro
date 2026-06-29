const db = require('../database/db');

class VideoRepository {
    async findAll() {
        const database = await db.getDb();
        return await database.all('SELECT * FROM videos ORDER BY id ASC');
    }

    async update(id, data) {
        const database = await db.getDb();
        const keys = Object.keys(data);
        const values = Object.values(data);
        
        if (keys.length === 0) return;
        
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        values.push(id);
        
        await database.run(`UPDATE videos SET ${setClause} WHERE id = ?`, values);
    }
}

module.exports = new VideoRepository();
