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
let dbInitialized = false;

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
    console.log('[INIT] DATABASE_URL env var:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    
    if (!process.env.DATABASE_URL) {
      console.error('[INIT] ERROR: DATABASE_URL not found in environment variables');
      return;
    }

    pool = await connectToDatabase();
    global.db = pool;
    
    console.log('[INIT] Pool created, creating tables...');
    await createTables();
    
    dbInitialized = true;
    console.log('[INIT] PostgreSQL fully initialized and ready');
  } catch (err) {
    console.error('[INIT] PostgreSQL initialization error:', err.message);
    console.error('[INIT] Full error:', err);
    dbInitialized = false;
  }
}

// Start initialization immediately
init();

/* ===== Routes ===== */
app.use('/api', searchRoutes);
app.use('/api/tracking', trackingRoutes);

app.get('/api/health', async (req, res) => {
  try {
    if (!global.db) {
      return res.status(503).json({ 
        status: 'error', 
        error: 'Database not initialized',
        dbInitialized: dbInitialized,
        databaseUrlSet: !!process.env.DATABASE_URL
      });
    }

    const result = await global.db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      dbConnected: !!result.rows[0],
      timestamp: result.rows[0].now
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      error: err.message,
      dbInitialized: dbInitialized
    });
  }
});

app.get('/api/debug-env', (req, res) => {
  res.json({
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    dbInitialized: dbInitialized,
    globalDbExists: !!global.db,
    nodeEnv: process.env.NODE_ENV
  });
});

/* ===== Admin routes ===== */
app.get('/api/admin/scrape-delmak-now', adminAuth, async (req, res) => {
  try {
    if (!global.db) {
      return res.status(503).json({ success: false, error: 'Database not initialized' });
    }

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
    if (!global.db) {
      return res.status(503).json({ success: false, error: 'Database not initialized' });
    }

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

/* ===== Export for Vercel ===== */
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
