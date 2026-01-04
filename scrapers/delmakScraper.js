// scrapers/delmakScraper.js - COMPLETE WORKING VERSION

const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDelmakCategory(categoryUrl, retries = 3) {
  try {
    console.log('🔍 Scraping Delmak:', categoryUrl);

    let html;
    let attempt = 0;

    // Retry with exponential backoff
    while (attempt < retries) {
      try {
        const response = await axios.get(categoryUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
          },
          timeout: 15000
        });

        if (response.status === 403 || response.status === 429) {
          throw new Error(`HTTP ${response.status} - blocked`);
        }

        html = response.data;
        break;
      } catch (err) {
        attempt++;
        if (attempt >= retries) {
          throw err;
        }
        const backoff = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️ Attempt ${attempt} failed: ${err.message}. Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }

    const $ = cheerio.load(html);
    const products = [];

    // CORRECT: div.product-card (found 90!)
    $('div.product-card').each((index, el) => {
      try {
        const $card = $(el);

        // Get product name - look in nested elements
        let name = '';
        name = $card.find('h5.pc_title a').text().trim() || 
                $card.find('h6').text().trim() || 
                $card.find('.product-name').text().trim() ||
                $card.find('a[href*="/p/"]').text().trim() ||
                '';

        // If still no name, search all text content
        if (!name) {
          const allText = $card.text();
          const lines = allText.split('\n').filter(l => l.trim().length > 3);
          if (lines.length > 0) {
            name = lines[0].trim();
          }
        }

        // Get PRICE from div.product-card__price
const priceContainer = $card.find('div.product-card__price');
let priceText = priceContainer.text().trim();

// Extract ALL numbers (don't stop at first decimal)
const numbers = priceText.match(/[\d.]+/g) || [];
let price = 0;

if (numbers.length >= 2) {
  // Take the SECOND number (current price)
  price = parseFloat(numbers[1].replace(/\./g, '').replace(',', '.'));
} else if (numbers.length === 1) {
  price = parseFloat(numbers[0].replace(/\./g, '').replace(',', '.'));
}

        // Get product link
        let href = $card.find('h5.pc_title a').attr('href') || 
                   $card.find('a[href*="/p/"]').attr('href') ||
                   $card.find('a').first().attr('href') ||
                   '';

        // Normalize URL
        if (href && !href.startsWith('http')) {
          href = 'https://delmak.mk' + (href.startsWith('/') ? '' : '/') + href;
        }

        // Get part number - search for "Шифра:"
        let partNumber = null;
        const fullText = $card.text();
        const shifrMatch = fullText.match(/Шифра[:\s]+([0-9A-Za-z\-]+)/);
        if (shifrMatch) {
          partNumber = shifrMatch[1].trim();
        }

        // Only add if we have name, price, and valid URL
        if (name && name.length > 5 && price > 0 && href) {
          products.push({
            part_name: name,
            part_number: partNumber || null,
            price: price,
            supplier: 'Delmak',
            product_url: href
          });

          console.log(`  ✓ ${name.slice(0, 50)} | ${partNumber || 'N/A'} | ${price} MKD`);
        }
      } catch (err) {
        // Silent fail on individual products
      }
    });

    console.log(`\n📊 Extracted ${products.length} products\n`);

    if (products.length === 0) {
      console.log('❌ No products found');
      return 0;
    }

    // Insert into PostgreSQL - FIXED VERSION
    let inserted = 0;

    if (global.db) {
      for (const product of products) {
        try {
          await global.db`
            INSERT INTO products (part_name, part_number, price, supplier, product_url)
            VALUES (
              ${product.part_name},
              ${product.part_number},
              ${product.price},
              ${product.supplier},
              ${product.product_url}
            )
            ON CONFLICT (product_url) DO UPDATE
            SET price = ${product.price}, last_updated = CURRENT_TIMESTAMP
          `;
          inserted++;
        } catch (dbErr) {
          // Unique constraint or other error - continue
          console.debug(`  ⚠️ DB: ${dbErr.message.slice(0, 50)}`);
        }

        // Small delay between inserts
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    console.log(`✅ Inserted ${inserted}/${products.length} products\n`);
    return inserted;

  } catch (err) {
    console.error(`❌ Scrape error for ${categoryUrl}: ${err.message}`);
    return 0;
  }
}

async function runDelmakScraper() {
  try {
    const DELMAK_CATEGORIES = require('./delmakCategories');

    console.log(`\n🚀 Starting Delmak scraper (${DELMAK_CATEGORIES.length} categories)\n`);

    let total = 0;
    for (const url of DELMAK_CATEGORIES) {
      const count = await scrapeDelmakCategory(url);
      total += count;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n🎉 TOTAL: ${total} products scraped\n`);
    return total;

  } catch (err) {
    console.error('Fatal error:', err.message);
    return 0;
  }
}

module.exports = { scrapeDelmakCategory, runDelmakScraper };
