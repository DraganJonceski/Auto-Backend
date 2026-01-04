// scrapers/delmakScraper.js - FIXED VERSION

const axios = require('axios');
const cheerio = require('cheerio');
const DELMAK_CATEGORIES = require('./delmakCategories');

const BASE_URL = 'https://delmak.mk';

async function scrapeDelmakCategory(categoryUrl, retries = 3) {
  try {
    console.log(`[DELMAK] Scraping: ${categoryUrl.substring(0, 80)}...`);

    let html;
    let attempt = 0;

    while (attempt < retries) {
      try {
        const response = await axios.get(categoryUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        });

        if (response.status === 403 || response.status === 429) {
          throw new Error(`Got HTTP ${response.status}`);
        }

        html = response.data;
        console.log(`[DELMAK] ✅ Got response (${html.length} bytes)`);
        break;
      } catch (err) {
        attempt++;
        if (attempt >= retries) throw err;
        console.log(`[DELMAK] Attempt ${attempt} failed, retrying...`);
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
      }
    }

    const $ = cheerio.load(html);
    const products = [];

    $('div.product-card, div[class*="product-card"], li[class*="product"]').each((_, el) => {
      try {
        const card = $(el);

        let name = card.find('h6, .pc_title, .product-title, a[href*="/d/"]').first().text().trim();
        if (!name) {
          name = card.find('a').first().text().trim();
        }

        if (!name) return;

        let productUrl = card.find('a[href*="/d/"]').attr('href') || card.find('a').first().attr('href') || '';
        if (!productUrl.startsWith('http')) {
          productUrl = BASE_URL + (productUrl.startsWith('/') ? '' : '/') + productUrl;
        }

        if (!productUrl.includes('delmak')) return;

        let priceText = card.find('.product-card-price, .price, [class*="price"]').first().text().trim();
        const priceMatch = priceText.match(/[\d,\.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;

        if (price === 0 || isNaN(price)) {
          console.warn(`[DELMAK] Warning: Could not parse price for "${name}"`);
        }

        let partNumber = card.find('[class*="sku"], [class*="code"], [class*="sifra"]').text().trim();
        if (!partNumber) {
          const titleParts = name.split(/[\(\)\-]/);
          partNumber = titleParts[titleParts.length - 1]?.trim() || null;
        }

        if (name && productUrl && price > 0) {
          products.push({
            part_name: name,
            part_number: partNumber || null,
            price: price,
            supplier: 'Delmak',
            product_url: productUrl
          });
        }
      } catch (err) {
        console.warn('[DELMAK] Error parsing product:', err.message);
      }
    });

    console.log(`[DELMAK] ✅ Found ${products.length} products on this page`);

    if (products.length === 0) {
      return 0;
    }

    let inserted = 0;
    for (const product of products) {
      try {
        await global.db`
          INSERT INTO products (part_name, part_number, price, supplier, product_url)
          VALUES (${product.part_name}, ${product.part_number}, ${product.price}, ${product.supplier}, ${product.product_url})
        `;
        inserted++;
      } catch (err) {
        if (err.message.includes('unique constraint')) {
          console.log('[DELMAK] Product already exists (skipped)');
        } else {
          console.warn('[DELMAK] Insert error:', err.message);
        }
      }

      await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
    }

    console.log(`[DELMAK] ✅ Inserted ${inserted}/${products.length} products`);
    return inserted;
  } catch (err) {
    console.error('[DELMAK] Scrape error:', err.message);
    throw err;
  }
}

async function runDelmakScraper() {
  console.log(`\n[DELMAK] Starting scrape of ${DELMAK_CATEGORIES.length} categories\n`);
  
  let totalInserted = 0;

  for (let i = 0; i < DELMAK_CATEGORIES.length; i++) {
    const url = DELMAK_CATEGORIES[i];
    try {
      console.log(`[DELMAK] Category ${i + 1}/${DELMAK_CATEGORIES.length}`);
      const inserted = await scrapeDelmakCategory(url);
      totalInserted += inserted;
      
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
    } catch (err) {
      console.error(`[DELMAK] Failed to scrape category ${i + 1}:`, err.message);
    }
  }

  console.log(`\n[DELMAK] ✅ TOTAL INSERTED: ${totalInserted} products\n`);
  return totalInserted;
}

module.exports = { scrapeDelmakCategory, runDelmakScraper };
