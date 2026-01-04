// scrapers/alvadiScraper.js

const cheerio = require('cheerio');
const { createScraperInstance, randomDelay } = require('../utils/scraperConfig');
const { scraperLogger } = require('../utils/logger');

const BASE_URL = 'https://alvadi.mk';

/**
 * Discover subcategories from a parent category page
 */
async function discoverAlvadiSubcategories(categoryUrl) {
  try {
    scraperLogger.info({ url: categoryUrl }, 'Discovering Alvadi subcategories');

    await randomDelay(500, 1000);

    const scraper = createScraperInstance();
    const response = await scraper.get(categoryUrl);

    if (response.status === 403 || response.status === 429) {
      throw new Error(`Got HTTP ${response.status}`);
    }

    const $ = cheerio.load(response.data);
    const subCategories = [];

    // Look for subcategory links
    // Adjust selectors based on actual Alvadi HTML structure
    $('a.subcategory, div.category-list a, nav.categories a').each((_, el) => {
      let href = $(el).attr('href');
      if (href) {
        if (!href.startsWith('http')) {
          href = BASE_URL + (href.startsWith('/') ? '' : '/') + href;
        }
        subCategories.push(href);
      }
    });

    scraperLogger.info({ 
      parent_url: categoryUrl,
      subcategories_found: subCategories.length 
    }, 'Alvadi subcategories discovered');

    return subCategories;
  } catch (err) {
    scraperLogger.warn({ url: categoryUrl, error: err.message }, 'Failed to discover Alvadi subcategories');
    return [];
  }
}

/**
 * Scrape products from Alvadi page
 */
async function scrapeAlvadiCategory(listUrl, retries = 3) {
  try {
    scraperLogger.info({ url: listUrl }, 'Starting Alvadi product scrape');

    await randomDelay(1000, 2000);

    let html;
    let attempt = 0;

    while (attempt < retries) {
      try {
        scraperLogger.debug({ attempt: attempt + 1, retries }, 'Fetching Alvadi page');
        
        const scraper = createScraperInstance();
        const response = await scraper.get(listUrl);

        if (response.status === 403 || response.status === 429) {
          throw new Error(`Got HTTP ${response.status} - possibly blocked`);
        }

        if (response.data.includes('login') || response.data.includes('captcha')) {
          throw new Error('Detected login/CAPTCHA page');
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
          'Alvadi fetch attempt failed, retrying...'
        );
        await randomDelay(backoffTime, backoffTime + 1000);
      }
    }

    const $ = cheerio.load(html);
    const products = [];

    // Adjust selectors based on Alvadi's actual HTML
    $('div.cpd-article, div.product-item, li.product').each((_, el) => {
      try {
        const card = $(el);

        const titleLink = card.find('h3 a, a.product-link, .product-name a').first();
        const name = titleLink.text().trim();
        let href = titleLink.attr('href') || '';

        if (!name || !href) return;

        if (!href.startsWith('http')) {
          href = BASE_URL + (href.startsWith('/') ? '' : '/') + href;
        }

        const itemId = card.find('span.item-code, span.sku, .product-code').first().text().trim();

        let price = null;
        const priceText = card.find('strong.price, span.price, .product-price').first().text().trim();
        if (priceText) {
          const numeric = priceText.replace(/[^\d,.]/g, '').replace(',', '.');
          price = numeric ? parseFloat(numeric) : null;
        }

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
        scraperLogger.warn({ error: err.message }, 'Error parsing Alvadi product');
      }
    });

    scraperLogger.info({ count: products.length }, `Alvadi found ${products.length} products`);

    if (products.length === 0) {
      scraperLogger.warn({ url: listUrl }, 'No products found on Alvadi page');
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
        scraperLogger.warn({ product: product.part_name, error: err.message }, 'Insert error for Alvadi product');
      }

      await randomDelay(50, 150);
    }

    scraperLogger.info({ inserted, total: products.length }, 'Alvadi product scrape complete');
    return inserted;
  } catch (err) {
    scraperLogger.error({ error: err.message, url: listUrl }, 'Alvadi product scrape failed');
    throw err;
  }
}

module.exports = {
  scrapeAlvadiCategory,
  discoverAlvadiSubcategories
};
