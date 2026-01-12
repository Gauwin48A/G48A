const pool = require('./src/config/db');
const fs = require('fs');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'posts'
        `);
        const output = res.rows.map(r => `${r.column_name}: ${r.data_type}`).join('\n');
        fs.writeFileSync('posts_schema.txt', output);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
