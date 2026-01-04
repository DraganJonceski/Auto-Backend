require('dotenv').config();
const connectToDatabase = require('./db');

async function fixModels() {
  try {
    const sql = await connectToDatabase();
    
    // First, delete the wrong data
    console.log('Deleting incorrect updates...');
    await sql`DELETE FROM products WHERE car_model = 'opel corsa' AND supplier = 'Delmak'`;
    
    // Now update with correct categories
    const categories = [
      { categoryId: '874', brand: 'bmw', model: 'bmw serija 4' },
      { categoryId: '756', brand: 'audi', model: 'audi a3' },
      { categoryId: '766', brand: 'audi', model: 'audi a4' },
      { categoryId: '888', brand: 'bmw', model: 'bmw serija 6' },
      { categoryId: '1258', brand: 'honda', model: 'honda civic' },
      { categoryId: '1265', brand: 'honda', model: 'honda civic' },
      { categoryId: '1150', brand: 'ford', model: 'ford escort' },
      { categoryId: '1331', brand: 'hyundai', model: 'hyundai i30' },
      { categoryId: '1963', brand: 'opel', model: 'opel corsa' }
    ];
    
    for (const cat of categories) {
      console.log(`Updating ${cat.categoryId}: ${cat.brand} ${cat.model}`);
      const result = await sql`
        UPDATE products 
        SET car_brand = ${cat.brand}, car_model = ${cat.model}
        WHERE product_url LIKE ${'%/c/' + cat.categoryId + '/%'} AND supplier = 'Delmak'
      `;
    }
    
    console.log('✓ All models fixed!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixModels();
