// db.js
const { Pool } = require('pg');

let pool;

async function connectToDatabase() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // needed for Neon + Vercel
    }
  });

  // Test connection
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected at:', result.rows.now);
    return pool;
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    throw err;
  }
}

module.exports = connectToDatabase;
