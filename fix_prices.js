// fix_prices.js
require('dotenv').config();
const connectToDatabase = require('./db');

async function fixPrices() {
  try {
    const sql = await connectToDatabase();
    
    // Multiply all prices by 1000 (convert from 1.22 to 1220)
    const result = await sql`
      UPDATE products 
      SET price = ROUND(price * 1000, 2)
      WHERE supplier = 'Delmak' AND price < 100
    `;
    
    console.log('✓ Fixed', result.count, 'Delmak products');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixPrices();
