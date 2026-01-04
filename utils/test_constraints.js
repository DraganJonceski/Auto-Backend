// test_constraint.js
const connectToDatabase = require('./db');

async function test() {
  try {
    const sql = await connectToDatabase();
    
    // Check if UNIQUE constraint exists
    const result = await sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name='products' AND constraint_type='UNIQUE'
    `;
    
    console.log('UNIQUE constraints:', result);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

test();
