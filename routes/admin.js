// routes/admin.js - COMPLETE FULL FILE

const express = require('express');
const router = express.Router();

function logInfo(msg, data = '') {
  console.log(`[ADMIN INFO] ${new Date().toISOString()} ${msg}`, data);
}

function logError(msg, error = '') {
  console.error(`[ADMIN ERROR] ${new Date().toISOString()} ${msg}`, error.message || error);
}

router.use((req, res, next) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== process.env.admin_token) {
    return res.status(403).json({ error: 'Forbidden - Invalid token' });
  }
  next();
});

router.get('/stats', async (req, res) => {
  try {
    logInfo('Admin stats requested');

    if (!global.db) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not initialized' 
      });
    }

    const results = await global.db`
      SELECT 
        supplier,
        COUNT(*) as total_products,
        MAX(last_updated) as last_scrape_time,
        MAX(created_at) as first_product_added
      FROM products
      GROUP BY supplier
      ORDER BY supplier ASC
    `;

    const totalProducts = await global.db`SELECT COUNT(*) FROM products`;
    
    const stats = {
      total_products: parseInt(totalProducts[0].count),
      by_supplier: results.map(r => ({
        supplier: r.supplier,
        count: parseInt(r.total_products),
        last_scrape: r.last_scrape_time,
        first_added: r.first_product_added
      })),
      generated_at: new Date().toISOString()
    };

    logInfo('Stats retrieved', stats);
    res.json(stats);
  } catch (error) {
    logError('Stats endpoint error', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/scrape-all', async (req, res) => {
  try {
    logInfo('Scrape-all triggered');

    if (!global.db) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not initialized' 
      });
    }

    const { runDelmakScraper } = require('../scrapers/delmakScraper');
    const results = {};
    const startTime = Date.now();

    try {
      logInfo('Starting Delmak scrape...');
      const delmakCount = await runDelmakScraper();
      results.delmak = delmakCount;
      logInfo('Delmak scrape completed', { count: delmakCount });
    } catch (err) {
      logError('Delmak scrape failed', err);
      results.delmak = { error: err.message };
    }

    const duration = Date.now() - startTime;
    logInfo('Scrape-all completed', { results, duration_ms: duration });

    res.json({
      success: true,
      results,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logError('Scrape-all endpoint error', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/products', async (req, res) => {
  try {
    const { supplier, limit = 50, offset = 0, search } = req.query;

    logInfo('Products list requested', { supplier, limit, offset, search });

    if (!global.db) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not initialized' 
      });
    }

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (supplier) {
      query += ' AND supplier = $1';
      params.push(supplier);
    }

    if (search) {
      const paramIndex = params.length + 1;
      query += ` AND part_name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
    }

    let countQuery = 'SELECT COUNT(*) FROM products WHERE 1=1';
    if (supplier) countQuery += ' AND supplier = $1';
    if (search) countQuery += ` AND part_name ILIKE $${params.length}`;

    const countResult = await global.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY last_updated DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const result = await global.db.query(query, params);

    logInfo('Products retrieved', { 
      count: result.rows.length, 
      total,
      limit,
      offset 
    });

    res.json({
      products: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total,
        has_more: (parseInt(offset) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    logError('Products endpoint error', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logInfo('Deleting product', { id });

    if (!global.db) {
      return res.status(503).json({ error: 'Database not initialized' });
    }

    const result = await global.db`
      DELETE FROM products WHERE id = ${id}
      RETURNING id, part_name
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    logInfo('Product deleted', result[0]);
    res.json({ success: true, deleted: result[0] });
  } catch (error) {
    logError('Delete product error', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/products/supplier/:supplier', async (req, res) => {
  try {
    const { supplier } = req.params;
    logInfo('Deleting supplier products', { supplier });

    if (!global.db) {
      return res.status(503).json({ error: 'Database not initialized' });
    }

    const result = await global.db`
      DELETE FROM products WHERE supplier = ${supplier}
    `;

    logInfo('Supplier products deleted', { supplier, count: result.count });
    res.json({ 
      success: true, 
      deleted_count: result.count,
      supplier 
    });
  } catch (error) {
    logError('Delete supplier error', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
