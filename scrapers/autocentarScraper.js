// scrapers/autocentarScraper.js

const cheerio = require('cheerio');
const { createScraperInstance, randomDelay } = require('../utils/scraperConfig');
const { scraperLogger } = require('../utils/logger');

const BASE_URL = 'https://www.autocentar.mk';

/**
 * Enhanced Autocentar scraper with intelligent detection avoidance
 */
async function scrapeAutocentar(listUrl, retries = 3) {
  try {
    scraperLogger.info({ url: listUrl }, 'Starting Autocentar scrape');

    // Add delay before scraping
    await randomDelay(1000, 2500);

    let html;
    let attempt = 0;

    // Retry logic with exponential backoff
    while (attempt < retries) {
      try {
        scraperLogger.debug({ attempt: attempt + 1, retries }, 'Fetching page');
        
        const scraper = createScraperInstance();
        
        // Add referer header (looks more natural)
        scraper.defaults.headers['Referer'] = BASE_URL;
        
        const response = await scraper.get(listUrl);

        // Check if we got blocked
        if (response.status === 403 || response.status === 429) {
          throw new Error(`Got HTTP ${response.status} - possibly blocked`);
        }

        if (response.data.includes('robot') || response.data.includes('access denied')) {
          throw new Error('Detected robot/access denial page');
        }

        html = response.data;
        break; // Success
      } catch (err) {
        attempt++;
        if (attempt >= retries) {
          throw err;
        }

        const backoffTime = Math.pow(2, attempt) * 1000;
        scraperLogger.warn(
          { error: err.message, nextRetryMs: backoffTime },
          'Scrape attempt failed, retrying...'
        );
        await randomDelay(backoffTime, backoffTime + 1500);
      }
    }

    // Parse with Cheerio
    const $ = cheerio.load(html);
    const products = [];

    // Inspect the actual HTML structure and adjust these selectors
    $('div.item_list div.item_details, div.product-card, li.product-item').each((_, el) => {
      try {
        const card = $(el);

        // Extract link
        const linkEl = card.find('div.item_image a, a.product-link, .product-title a').first();
        let href = linkEl.attr('href') || '';

        if (href && !href.startsWith('http')) {
          href = `${BASE_URL}/${href.replace(/^\/*/, '')}`;
        }

        // Extract name
        const name = card.find('h3.ptcat.name, h3.product-name, .product-title').text().trim();

        // Extract price (discounted price or regular price)
        const priceText = card.find('span.price_discounted, span.price, .product-price').text().trim();
        const numeric = priceText.replace(/[^\d,.]/g, '').replace(',', '.');
        const price = numeric ? parseFloat(numeric) : null;

        // Validate before adding
        if (name && href && price) {
          products.push({
            part_name: name,
            part_number: null,
            price: price,
            supplier: 'Autocentar',
            product_url: href
          });
        }
      } catch (err) {
        scraperLogger.warn({ error: err.message }, 'Error parsing individual product');
      }
    });

    scraperLogger.info({ count: products.length }, `Autocentar found ${products.length} products`);

    if (products.length === 0) {
      scraperLogger.warn({ url: listUrl }, 'No products found - selector may be outdated');
      return 0;
    }

    // Clear old Autocentar products
    const deleteResult = await global.db`
      DELETE FROM products WHERE supplier = 'Autocentar'
    `;
    scraperLogger.info({ deleted: deleteResult.count }, 'Cleared old Autocentar products');

    // Insert new products
    let inserted = 0;
    for (const product of products) {
      try {
        await global.db`
          INSERT INTO products (part_name, part_number, price, supplier, product_url)
          VALUES (${product.part_name}, ${product.part_number}, ${product.price}, ${product.supplier}, ${product.product_url})
          ON CONFLICT (product_url) DO NOTHING
        `;
        inserted++;
      } catch (err) {
        scraperLogger.warn({ product: product.part_name, error: err.message }, 'Insert error');
      }

      // Add delay between inserts
      await randomDelay(50, 150);
    }

    scraperLogger.info({ inserted, total: products.length, url: listUrl }, 'Autocentar scrape complete');
    return inserted;
  } catch (err) {
    scraperLogger.error({ error: err.message, url: listUrl }, 'Autocentar scrape failed');
    throw err;
  }
}

module.exports = scrapeAutocentar;
