require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mhub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Category-appropriate picsum photo IDs for realistic product images
const categoryImages = {
  'Vehicles': [
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=400&fit=crop',
  ],
  'Electronics': [
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop',
  ],
  'Fashion': [
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558171813-01f60b710af5?w=400&h=400&fit=crop',
  ],
  'Home & Garden': [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=400&fit=crop',
  ],
  'Sports': [
    'https://images.unsplash.com/photo-1461896836934-bd45ba05cda5?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
  ],
  'default': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop',
  ]
};

(async () => {
  try {
    // Get all posts with their categories
    const { rows: posts } = await pool.query(`
      SELECT p.post_id, p.title, c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.category_id
      ORDER BY p.created_at
    `);

    console.log(`Found ${posts.length} posts to update with images`);

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const cat = post.category_name || 'default';
      
      // Pick images based on category, with fallback
      const pool_imgs = categoryImages[cat] || categoryImages['default'];
      // Assign 2 images per post, rotating through available
      const img1 = pool_imgs[i % pool_imgs.length];
      const img2 = pool_imgs[(i + 1) % pool_imgs.length];
      const images = [img1, img2];

      await pool.query(
        'UPDATE posts SET images = $1::json WHERE post_id = $2',
        [JSON.stringify(images), post.post_id]
      );
      console.log(`  [${i+1}/${posts.length}] ${post.title} (${cat}) → ${images.length} images`);
    }

    console.log('\nDone! All posts now have product images.');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
})();
