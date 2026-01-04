// routes/tracking.js
const express = require('express');
const connectToDatabase = require('../db');
const router = express.Router();

router.post('/click', async (req, res) => {
  try {
    const { productId, supplier } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Missing productId' });
    }

    const sql = await connectToDatabase();

    await sql`
      INSERT INTO clicks (product_id, supplier)
      VALUES (${productId}, ${supplier})
    `;

    res.json({ success: true });
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
