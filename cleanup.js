// cleanup.js
const connectToDatabase = require('./db');

async function cleanup() {
  try {
    const sql = await connectToDatabase();
    
    console.log('Dropping tables...');
    await sql`DROP TABLE IF EXISTS clicks CASCADE`;
    await sql`DROP TABLE IF EXISTS price_history CASCADE`;
    await sql`DROP TABLE IF EXISTS products CASCADE`;
    
    console.log('✓ All tables dropped');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

cleanup();
