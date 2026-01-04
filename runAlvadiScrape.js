// runAlvadiScrape.js

require('dotenv').config();
const connectToDatabase = require('./db');
const { runAlvadiScraper } = require('./alvadiScraper');

async function main() {
  try {
    global.db = await connectToDatabase();
    console.log('✓ Database connected\n');

    const total = await runAlvadiScraper();
    console.log(`✅ Done: ${total} products`);
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
