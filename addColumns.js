require('dotenv').config();
const connectToDatabase = require('./db');

async function addColumns() {
  try {
    const sql = await connectToDatabase();
    
    console.log('Adding year column...');
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS year VARCHAR(20)`;
    console.log('✓ Year column added');
    
    console.log('Adding part_type column...');
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS part_type VARCHAR(255)`;
    console.log('✓ Part_type column added');
    
    console.log('\n✓ All columns added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

addColumns();
