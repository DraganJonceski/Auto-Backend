// createTables.js - COMPLETE FULL FILE

require('dotenv').config();
const db = require('./db');

async function createTables() {
  console.log('[TABLES] Starting table creation...');

  try {
    console.log('[TABLES] Dropping existing tables...');
    await db`DROP TABLE IF EXISTS clicks CASCADE`;
    await db`DROP TABLE IF EXISTS price_history CASCADE`;
    await db`DROP TABLE IF EXISTS products CASCADE`;
    console.log('[TABLES] Old tables dropped ✅');
  } catch (error) {
    console.log('[TABLES] No existing tables to drop');
  }

  try {
    console.log('[TABLES] Creating products table...');
    await db`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        part_name VARCHAR(255) NOT NULL,
        part_number VARCHAR(100),
        price DECIMAL(10, 2),
        supplier VARCHAR(100),
        product_url VARCHAR(500) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('[TABLES] Products table created ✅');
  } catch (error) {
    console.error('[TABLES] Error creating products table:', error.message);
    throw error;
  }

  try {
    console.log('[TABLES] Creating price_history table...');
    await db`
      CREATE TABLE price_history (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        old_price DECIMAL(10, 2),
        new_price DECIMAL(10, 2),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('[TABLES] Price history table created ✅');
  } catch (error) {
    console.error('[TABLES] Error creating price_history table:', error.message);
    throw error;
  }

  try {
    console.log('[TABLES] Creating clicks table...');
    await db`
      CREATE TABLE clicks (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_agent VARCHAR(500),
        ip_address VARCHAR(50)
      )
    `;
    console.log('[TABLES] Clicks table created ✅');
  } catch (error) {
    console.error('[TABLES] Error creating clicks table:', error.message);
    throw error;
  }

  console.log('[TABLES] All tables created successfully! ✅');
}

if (require.main === module) {
  (async () => {
    try {
      await createTables();
      console.log('[TABLES] Database initialization complete!');
      process.exit(0);
    } catch (error) {
      console.error('[TABLES] Fatal error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = createTables;
