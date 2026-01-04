// routes/search.js

const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');

/**
 * GET /api/search?query=...
 * Search products by part_name
 */
router.get('/search', async (req, res) => {
  try {
    const { query, limit = 50, offset = 0 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Query must be at least 2 characters'
      });
    }

    logger.info({ query, limit, offset }, 'Search requested');

    // Search in database
    const results = await global.db`
      SELECT 
        id,
        part_name,
        part_number,
        price,
        supplier,
        product_url,
        last_updated,
        created_at
      FROM products
      WHERE part_name ILIKE ${'%' + query + '%'}
        OR part_number ILIKE ${'%' + query + '%'}
      ORDER BY last_updated DESC
      LIMIT ${parseInt(limit)}
      OFFSET ${parseInt(offset)}
    `;

    // Get total count for pagination
    const countResult = await global.db`
      SELECT COUNT(*) as count
      FROM products
      WHERE part_name ILIKE ${'%' + query + '%'}
        OR part_number ILIKE ${'%' + query + '%'}
    `;

    const total = parseInt(countResult[0].count);

    // Map database fields to frontend field names
    const mappedResults = results.map(product => ({
      _id: product.id.toString(),                    // ← Map id to _id
      partNumber: product.part_number,               // ← Map part_number to partNumber
      partName: product.part_name,                   // ← Add part_name
      price: parseFloat(product.price),
      supplier: product.supplier,
      productUrl: product.product_url,               // ← Map product_url to productUrl
      affiliateUrl: product.product_url,             // ← Same as productUrl (for now)
      description: `${product.supplier} - Part #${product.part_number || 'N/A'}`, // ← Generate description
      lastUpdated: product.last_updated,
      createdAt: product.created_at
    }));

    logger.info({ 
      query, 
      results_count: mappedResults.length, 
      total_count: total 
    }, 'Search completed');

    res.json({
      data: mappedResults,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + parseInt(limit)) < total
    });
  } catch (error) {
    logger.error({ error: error.message, query }, 'Search error');
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

module.exports = router;
