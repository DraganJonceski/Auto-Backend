// scrapers/delmakScraper.js

const axios = require('axios');
const cheerio = require('cheerio');
const { createScraperInstance, randomDelay } = require('../utils/scraperConfig');
const { scraperLogger } = require('../utils/logger');

const BASE_URL = 'https://www.delmak.mk';

/**
 * Scrape a single Delmak category
 */
async function scrapeDelmakCategory(categoryUrl, retries = 3) {
  try {
    scraperLogger.info({ url: categoryUrl }, 'Starting Delmak category scrape');

    await randomDelay(500, 1500);

    let html;
    let attempt = 0;

    while (attempt < retries) {
      try {
        scraperLogger.debug({ attempt: attempt + 1, retries }, 'Fetching Delmak page');
        
        const scraper = createScraperInstance();
        const response = await scraper.get(categoryUrl);

        if (response.status === 403 || response.status === 429) {
          throw new Error(`Got HTTP ${response.status} - possibly blocked`);
        }

        if (response.data.includes('robot') || response.data.includes('captcha')) {
          throw new Error('Detected robot/CAPTCHA page');
        }

        html = response.data;
        break;
      } catch (err) {
        attempt++;
        if (attempt >= retries) {
          throw err;
        }

        const backoffTime = Math.pow(2, attempt) * 1000;
        scraperLogger.warn(
          { error: err.message, nextRetryMs: backoffTime },
          'Delmak fetch attempt failed, retrying...'
        );
        await randomDelay(backoffTime, backoffTime + 500);
      }
    }

    const $ = cheerio.load(html);
    const products = [];

    // Adjust selector based on Delmak's actual HTML structure
    $('div.product-item, div.product-card, li.product').each((_, el) => {
      try {
        const card = $(el);

        const name = card.find('h3, .product-name, .title').text().trim();
        const priceText = card.find('.price, span.price').text().trim();
        let href = card.find('a').first().attr('href') || '';
        const partNumber = card.find('.part-number, .sku, .code').text().trim();

        // Normalize URL
        if (href && !href.startsWith('http')) {
          href = BASE_URL + (href.startsWith('/') ? '' : '/') + href;
        }

        // Parse price
        const price = priceText ? parseFloat(priceText.replace(/[^\d.]/g, '')) : null;

        if (name && href && price) {
          products.push({
            part_name: name,
            part_number: partNumber || null,
            price: price,
            supplier: 'Delmak',
            product_url: href
          });
        }
      } catch (err) {
        scraperLogger.warn({ error: err.message }, 'Error parsing Delmak product');
      }
    });

    scraperLogger.info({ count: products.length }, `Delmak found ${products.length} products`);

    if (products.length === 0) {
      scraperLogger.warn({ url: categoryUrl }, 'No products found on Delmak category');
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
        scraperLogger.warn({ product: product.part_name, error: err.message }, 'Insert error for Delmak product');
      }

      await randomDelay(50, 150);
    }

    scraperLogger.info({ inserted, total: products.length }, 'Delmak category scrape complete');
    return inserted;
  } catch (err) {
    scraperLogger.error({ error: err.message, url: categoryUrl }, 'Delmak category scrape failed');
    throw err;
  }
}

/**
 * Run all Delmak categories
 */
async function runDelmakScraper(categories = null) {
  const defaultCategories = [
    'https://www.delmak.mk/spare-parts/air-filters',
    'https://www.delmak.mk/spare-parts/oil-filters'
  ];

  const categoriesToScrape = categories || defaultCategories;
  let total = 0;

  for (const category of categoriesToScrape) {
    try {
      const count = await scrapeDelmakCategory(category);
      total += count;
      await randomDelay(1000, 2000);
    } catch (err) {
      scraperLogger.error({ category, error: err.message }, 'Failed to scrape Delmak category');
    }
  }

  return total;
}

module.exports = { scrapeDelmakCategory, runDelmakScraper };
