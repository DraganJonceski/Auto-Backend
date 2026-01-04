// routes/click.js
const express = require('express');
const router = express.Router();

router.post('/track-click', async (req, res) => {
  try {
    const { productId, supplier } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Missing productId' });
    }

    // Record click in PostgreSQL
    const clickQuery = `
      INSERT INTO clicks (product_id, supplier)
      VALUES ($1, $2)
      RETURNING *
    `;

    await global.db.query(clickQuery, [productId, supplier]);

    // Get product URL from database
    const productQuery = `
      SELECT product_url FROM products WHERE id = $1
    `;

    const productResult = await global.db.query(productQuery, [productId]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productUrl = productResult.rows[0].product_url;

    // Redirect to affiliate/product URL
    res.redirect(productUrl);
  } catch (error) {
    console.error('Click tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
