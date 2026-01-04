// utils/logger.js - SIMPLE VERSION (no pino-pretty)

const logger = {
  info: (msg, data = '') => {
    console.log(`[INFO] ${new Date().toISOString()} ${msg}`, data);
  },
  error: (msg, error = '') => {
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, error.message || error);
  },
  warn: (msg, data = '') => {
    console.warn(`[WARN] ${new Date().toISOString()} ${msg}`, data);
  },
  debug: (msg, data = '') => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()} ${msg}`, data);
    }
  }
};

module.exports = logger;
