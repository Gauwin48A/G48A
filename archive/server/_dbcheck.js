require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mhub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

(async () => {
  try {
    // 1. Find image-related columns
    const cols = await p.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='posts' AND (column_name LIKE '%imag%' OR column_name LIKE '%media%' OR column_name LIKE '%photo%' OR column_name LIKE '%thumb%') ORDER BY column_name"
    );
    console.log('IMAGE COLS:', cols.rows.map(x => x.column_name));

    // 2. Sample posts with images field
    const posts = await p.query('SELECT post_id, title, images FROM posts LIMIT 5');
    posts.rows.forEach(row => console.log(JSON.stringify(row)));

    // 3. Check if any post has non-empty images
    const hasImages = await p.query("SELECT count(*) as total, count(*) FILTER (WHERE images IS NOT NULL AND images::text != '[]' AND images::text != '{}' AND images::text != 'null') as with_images FROM posts");
    console.log('IMAGE STATS:', hasImages.rows[0]);

    // 4. Check channels table
    const chanCols = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='channels' ORDER BY column_name");
    console.log('CHANNEL COLS:', chanCols.rows.map(x => x.column_name));
    const chanCount = await p.query("SELECT count(*) FROM channels");
    console.log('CHANNEL COUNT:', chanCount.rows[0].count);

    // 5. Check users table cols
    const userCols = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND (column_name LIKE '%id%' OR column_name LIKE '%email%' OR column_name LIKE '%name%' OR column_name LIKE '%phone%') ORDER BY column_name");
    console.log('USER COLS:', userCols.rows.map(x => x.column_name));
    const userIdCol = userCols.rows.find(x => x.column_name === 'user_id') ? 'user_id' : 'id';
    const users = await p.query(`SELECT ${userIdCol}, email, name FROM users LIMIT 3`);
    console.log('SAMPLE USERS:', users.rows);

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    p.end();
  }
})();
