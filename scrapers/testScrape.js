require('dotenv').config();
const { scrapeDelmakCategory } = require('./delmakScraper');
const categories = require('./delmakCategories');

async function run() {
  console.log('Starting scrape for all categories...\n');
  let totalScraped = 0;
  
  try {
    for (const categoryUrl of categories) {
      console.log(`Processing: ${categoryUrl}`);
      const count = await scrapeDelmakCategory(categoryUrl);
      totalScraped += count;
    }
    console.log(`\n✓ Total scraped: ${totalScraped} products!`);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

run();
