// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectToDatabase = require('./db');
const createTables = require('./models/createTables');

const searchRoutes = require('./routes/search');
const trackingRoutes = require('./routes/tracking');
const { runDelmakScraper } = require('./scrapers/delmakScraper');
const scrapeAlvadiCategory = require('./scrapers/alvadiScraper');

dotenv.config();

let pool;
global.db = null;

const app = express();

/* ===== Admin middleware ===== */
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== process.env.admin_token) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

/* ===== CORS ===== */
const allowedOrigins = new Set([
  'https://auto-frontend-virid.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      console.error('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  })
);

app.use(express.json());

/* ===== PostgreSQL Init ===== */
async function init() {
  try {
    pool = await connectToDatabase();
    global.db = pool;
    
    // Create tables on startup
    await createTables();
    console.log('PostgreSQL initialized');
  } catch (err) {
    console.error('PostgreSQL error:', err.message);
  }
}

init();

/* ===== Routes ===== */
app.use('/api', searchRoutes);
app.use('/api/tracking', trackingRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const result = await global.db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      dbConnected: !!result.rows
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

/* ===== Admin routes ===== */
app.get('/api/admin/scrape-delmak-now', adminAuth, async (req, res) => {
  try {
    console.log('[ADMIN] Delmak scrape triggered');
    const inserted = await runDelmakScraper();
    res.json({
      success: true,
      supplier: 'Delmak',
      scraped: inserted || 0
    });
  } catch (error) {
    console.error('Delmak scrape error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/scrape-alvadi', adminAuth, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Missing url parameter' });
    }
    const scrapedCount = await scrapeAlvadiCategory(url);
    res.json({
      success: true,
      supplier: 'Alvadi',
      scraped: scrapedCount
    });
  } catch (error) {
    console.error('Alvadi scrape error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/debug-env', (req, res) => {
  res.json({
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
  });
});

/* ===== Export for Vercel ===== */
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
