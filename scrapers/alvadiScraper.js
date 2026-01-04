// scrapers/alvadiScraper.js

const cheerio = require('cheerio');
const { createScraperInstance, randomDelay } = require('../utils/scraperConfig');
const { scraperLogger } = require('../utils/logger');

const BASE_URL = 'https://alvadi.mk';

/**
 * Enhanced Alvadi scraper with intelligent detection avoidance
 */
async function scrapeAlvadiCategory(listUrl, retries = 3) {
  try {
    scraperLogger.info({ url: listUrl }, 'Starting Alvadi scrape');

    // Add delay before scraping
    await randomDelay(1000, 2000);

    let html;
    let attempt = 0;

    // Retry logic with exponential backoff
    while (attempt < retries) {
      try {
        scraperLogger.debug({ attempt: attempt + 1, retries }, 'Fetching page');
        
        const scraper = createScraperInstance();
        const response = await scraper.get(listUrl);

        // Check if we got blocked (403, 429) or redirected to login
        if (response.status === 403 || response.status === 429) {
          throw new Error(`Got HTTP ${response.status} - possibly blocked`);
        }

        if (response.data.includes('login') || response.data.includes('captcha')) {
          throw new Error('Detected login/CAPTCHA page');
        }

        html = response.data;
        break; // Success
      } catch (err) {
        attempt++;
        if (attempt >= retries) {
          throw err;
        }
        
        // Exponential backoff: 2s, 4s, 8s
        const backoffTime = Math.pow(2, attempt) * 1000;
        scraperLogger.warn(
          { error: err.message, nextRetryMs: backoffTime },
          'Scrape attempt failed, retrying...'
        );
        await randomDelay(backoffTime, backoffTime + 1000);
      }
    }

    // Parse with Cheerio
    const $ = cheerio.load(html);
    const products = [];

    // Adjust selector based on Alvadi's current structure
    // You may need to inspect the page and update these selectors
    $('div.cpd-article, div.product-item, li.product').each((_, el) => {
      try {
        const card = $(el);

        // Extract product name and URL
        const titleLink = card.find('h3 a, a.product-link, .product-name a').first();
        const name = titleLink.text().trim();
        let href = titleLink.attr('href') || '';

        // Normalize URL
        if (href && !href.startsWith('http')) {
          href = `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
        }

        // Extract product code/SKU
        const itemId = card.find('span.item-code, span.sku, .product-code').first().text().trim();

        // Extract price
        let price = null;
        const priceText = card.find('strong.price, span.price, .product-price').first().text().trim();
        if (priceText) {
          const numeric = priceText.replace(/[^\d,.]/g, '').replace(',', '.');
          price = numeric ? parseFloat(numeric) : null;
        }

        // Validate before adding
        if (name && href && price) {
          products.push({
            part_name: name,
            part_number: itemId || null,
            price: price || 0,
            supplier: 'Alvadi',
            product_url: href
          });
        }
      } catch (err) {
        scraperLogger.warn({ error: err.message }, 'Error parsing individual product');
      }
    });

    scraperLogger.info({ count: products.length }, `Alvadi found ${products.length} products`);

    if (products.length === 0) {
      scraperLogger.warn({ url: listUrl }, 'No products found - selector may be outdated');
      return 0;
    }

    // Insert into database
    let inserted = 0;
    for (const product of products) {
      try {
        await global.db`
          INSERT INTO products (part_name, part_number, price, supplier, product_url)
          VALUES (${product.part_name}, ${product.part_number}, ${product.price}, ${product.supplier}, ${product.product_url})
          ON CONFLICT (product_url) DO UPDATE 
          SET price = ${product.price}, last_updated = CURRENT_TIMESTAMP
        `;
        inserted++;
      } catch (err) {
        scraperLogger.warn({ product: product.part_name, error: err.message }, 'Insert error');
      }

      // Add delay between inserts
      await randomDelay(50, 200);
    }

    scraperLogger.info({ inserted, total: products.length, url: listUrl }, 'Alvadi scrape complete');
    return inserted;
  } catch (err) {
    scraperLogger.error({ error: err.message, url: listUrl }, 'Alvadi scrape failed');
    throw err;
  }
}

module.exports = scrapeAlvadiCategory;
