// server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const connectToDatabase = require('./db');
const createTables = require('./models/createTables');
const searchRoutes = require('./routes/search');
const trackingRoutes = require('./routes/click');
const adminRoutes = require('./routes/admin');
const { logger } = require('./utils/logger');

dotenv.config();

let pool;
global.db = null;
let dbInitialized = false;

const app = express();

/* ===== Admin middleware ===== */
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== process.env.admin_token) {
    logger.warn({ token: token ? 'provided' : 'missing' }, 'Admin auth failed');
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
      logger.warn({ origin }, 'CORS blocked origin');
      return callback(new Error('Not allowed by CORS'));
    }
  })
);

app.use(express.json());

/* ===== PostgreSQL Init ===== */
async function init() {
  try {
    logger.info('[INIT] DATABASE_URL env var:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    if (!process.env.DATABASE_URL) {
      logger.error('[INIT] ERROR: DATABASE_URL not found in environment variables');
      return;
    }

    pool = await connectToDatabase();
    global.db = pool;
    logger.info('[INIT] Pool created, creating tables...');
    await createTables();
    dbInitialized = true;
    logger.info('[INIT] PostgreSQL fully initialized and ready');
  } catch (err) {
    logger.error('[INIT] PostgreSQL initialization error:', err.message);
    logger.error('[INIT] Full error:', err);
    dbInitialized = false;
  }
}

init();

/* ===== Routes ===== */
app.use('/api', searchRoutes);
app.use('/api/click', trackingRoutes);
app.use('/api/admin', adminRoutes); // ADD THIS

app.get('/api/health', async (req, res) => {
  try {
    const sql = await connectToDatabase();
    const result = await sql`SELECT NOW()`;
    logger.info('Health check OK');
    res.json({
      status: 'ok',
      dbConnected: !!result[0],
      timestamp: result[0].now
    });
  } catch (err) {
    logger.error({ error: err.message }, 'Health check failed');
    res.status(500).json({ status: 'error', error: err.message });
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

/* ===== Export for Vercel ===== */
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

module.exports = app;
