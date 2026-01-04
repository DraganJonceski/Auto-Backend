// routes/search.js
const express = require('express');
const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.json([]);
    }

    const query = `
      SELECT id, part_name, part_number, price, supplier, product_url
      FROM products
      WHERE 
        part_name ILIKE $1 
        OR part_number ILIKE $1
      ORDER BY price ASC
      LIMIT 100
    `;

    const result = await global.db.query(query, [`%${q}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
