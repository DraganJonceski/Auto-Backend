// force_recreate.js
require('dotenv').config();
const connectToDatabase = require('./db');

async function forceRecreate() {
  try {
    const sql = await connectToDatabase();
    
    console.log('Dropping all tables...');
    await sql`DROP TABLE IF EXISTS clicks CASCADE`;
    await sql`DROP TABLE IF EXISTS price_history CASCADE`;
    await sql`DROP TABLE IF EXISTS products CASCADE`;
    
    console.log('Creating products table with UNIQUE constraint...');
    await sql`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        part_name VARCHAR(255) NOT NULL,
        part_number VARCHAR(100),
        price DECIMAL(10, 2),
        supplier VARCHAR(100),
        product_url TEXT UNIQUE NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Creating price_history table...');
    await sql`
      CREATE TABLE price_history (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        price DECIMAL(10, 2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Creating clicks table...');
    await sql`
      CREATE TABLE clicks (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        supplier VARCHAR(100),
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✓ All tables created with UNIQUE constraint on product_url');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

forceRecreate();
