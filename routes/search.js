// routes/search.js
const express = require('express');
const connectToDatabase = require('../db');
const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.json([]);
    }

    const sql = await connectToDatabase();
    
    const results = await sql`
      SELECT id, part_name, part_number, price, supplier, product_url
      FROM products
      WHERE 
        part_name ILIKE ${`%${q}%`}
        OR part_number ILIKE ${`%${q}%`}
      ORDER BY price ASC
      LIMIT 100
    `;

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
