const express = require('express');
const router = express.Router();
const connectToDatabase = require('../db');

async function searchProducts(query) {
  try {
    const sql = await connectToDatabase();
    
    if (!query || String(query).trim().length === 0) {
      return [];
    }

    const searchTerm = `%${query}%`;
    
    const results = await sql`
      SELECT 
        id,
        part_name,
        part_number,
        price,
        supplier,
        product_url,
        car_brand,
        car_model,
        category
      FROM products
      WHERE 
        LOWER(part_name) LIKE LOWER(${searchTerm}) OR
        LOWER(part_number) LIKE LOWER(${searchTerm}) OR
        LOWER(car_brand) LIKE LOWER(${searchTerm}) OR
        LOWER(car_model) LIKE LOWER(${searchTerm}) OR
        LOWER(category) LIKE LOWER(${searchTerm})
      ORDER BY car_brand, car_model, part_name
      LIMIT 100
    `;
    
    return results;
  } catch (err) {
    console.error('Search error:', err.message);
    throw err;
  }
}

router.get('/search', async (req, res) => {
  try {
    const query = req.query.query || '';
    
    if (!query.trim()) {
      return res.json({ success: true, data: [] });
    }

    console.log(`Searching for: ${query}`);
    const results = await searchProducts(query);
    console.log(`Found ${results.length} results`);
    
    res.json({ 
      success: true, 
      data: results,
      count: results.length
    });
  } catch (err) {
    console.error('Search route error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
