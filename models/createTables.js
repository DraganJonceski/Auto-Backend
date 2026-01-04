// models/createTables.js
const connectToDatabase = require('../db');

async function createTables() {
  try {
    const sql = await connectToDatabase();
    
    console.log('[TABLES] Creating products table...');
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        part_name VARCHAR(255) NOT NULL,
        part_number VARCHAR(100),
        price DECIMAL(10, 2),
        supplier VARCHAR(100),
        product_url TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('[TABLES] Creating price_history table...');
    await sql`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        price DECIMAL(10, 2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('[TABLES] Creating clicks table...');
    await sql`
      CREATE TABLE IF NOT EXISTS clicks (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        supplier VARCHAR(100),
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('[TABLES] All tables created successfully');
  } catch (err) {
    console.error('[TABLES] Error creating tables:', err.message);
    throw err;
  }
}

module.exports = createTables;
