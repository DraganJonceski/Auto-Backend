// db.js
const { neon } = require('@neondatabase/serverless');

let sql;

async function connectToDatabase() {
  if (sql) return sql;

  console.log('[DB] Initializing Neon serverless connection...');
  
  try {
    sql = neon(process.env.DATABASE_URL);
    
    // Test connection
    console.log('[DB] Testing connection...');
    const result = await sql`SELECT NOW()`;
    console.log('[DB] Neon connected at:', result[0].now);
    return sql;
  } catch (err) {
    console.error('[DB] Connection failed');
    console.error('[DB] Error message:', err.message);
    throw err;
  }
}

module.exports = connectToDatabase;
