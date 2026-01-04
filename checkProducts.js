require('dotenv').config();
const connectToDatabase = require('./db');

async function check() {
  try {
    const sql = await connectToDatabase();
    const results = await sql`
      SELECT id, products.part_name, car_brand, car_model, product_url 
      FROM products 
      LIMIT 5
    `;
    console.log('Products in DB:');
    console.table(results);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
