require('dotenv').config();
const connectToDatabase = require('./db');

const categories = [
  { url: '/c/874/vozila/bmw/bmw-serija-4/delovi-za-bmw-serija-4-g23-cabrio-20--avto-delovi-za-karoserija', categoryId: '874' },
  { url: '/c/756/vozila/audi/audi-a3/delovi-za-audi-a3-3dsportback-12-16-avto-delovi-za-karoserija', categoryId: '756' },
  { url: '/c/766/vozila/audi/audi-a4/delovi-za-audi-a4-15-18-avto-delovi-za-karoserija', categoryId: '766' },
  { url: '/c/888/vozila/bmw/bmw-serija-6/delovi-za-bmw-serija-6-f131206-coupecabrio-15-17-avto-delovi-za-karoserija', categoryId: '888' },
  { url: '/c/1258/vozila/honda/honda-civic/delovi-za-honda-civic-hatchback-92-96-avto-delovi-za-karoserija', categoryId: '1258' },
  { url: '/c/1265/vozila/honda/honda-civic/delovi-za-honda-civic-hatchback-longback-01-04-avto-delovi-za-karoserija', categoryId: '1265' },
  { url: '/c/1150/vozila/ford/ford-escort/delovi-za-ford-escort-95-98-avto-delovi-za-karoserija', categoryId: '1150' },
  { url: '/c/1331/vozila/hyundai/hyundai-i30/delovi-za-hyundai-i30-5d-14-17-avto-delovi-za-karoserija', categoryId: '1331' },
  { url: '/c/1963/vozila/opel/opel-corsa/delovi-za-opel-corsa-d-06-15-avto-delovi-za-karoserija', categoryId: '1963' }
];

async function updateModels() {
  try {
    const sql = await connectToDatabase();
    
    for (const cat of categories) {
      const urlParts = cat.url.split('/');
      const brand = urlParts[4];
      const modelRaw = urlParts[5];
      const model = modelRaw.replace(/-/g, ' ');

      console.log(`Updating category ${cat.categoryId}: ${brand} → ${model}`);
      
      // Match by producturl containing the category ID
      await sql`
        UPDATE products 
        SET car_brand = ${brand}, car_model = ${model}
        WHERE supplier = 'Delmak' AND product_url LIKE ${'%/c/' + cat.categoryId + '/%'}
      `;
    }

    console.log('✓ All models updated!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

updateModels();
