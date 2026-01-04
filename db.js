// db.js
const { Pool } = require('pg');

let pool;

async function connectToDatabase() {
  if (pool) return pool;

  console.log('[DB] Creating pool with DATABASE_URL...');
  
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    // Test connection
    console.log('[DB] Testing connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('[DB] PostgreSQL connected at:', result.rows[0].now);
    return pool;
  } catch (err) {
    console.error('[DB] Connection failed');
    console.error('[DB] Error code:', err.code);
    console.error('[DB] Error message:', err.message);
    console.error('[DB] Full error:', JSON.stringify(err, null, 2));
    throw err;
  }
}

module.exports = connectToDatabase;
