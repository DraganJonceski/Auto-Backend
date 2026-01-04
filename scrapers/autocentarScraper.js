// scrapers/autocentarScraper.js

const cheerio = require('cheerio');
const { createScraperInstance, randomDelay } = require('../utils/scraperConfig');
const { scraperLogger } = require('../utils/logger');

const BASE_URL = 'https://www.autocentar.mk';

/**
 * Discover subcategories from a parent category
 */
async function discoverAutocentarSubcategories(categoryUrl) {
  try {
    scraperLogger.info({ url: categoryUrl }, 'Discovering Autocentar subcategories');

    await randomDelay(500, 1000);

    const scraper = createScraperInstance();
    const response = await scraper.get(categoryUrl);

    if (response.status === 403 || response.status === 429) {
      throw new Error(`Got HTTP ${response.status}`);
    }

    const $ = cheerio.load(response.data);
    const subCategories = [];

    // Adjust selectors based on Autocentar's structure
    $('a.subcategory, div.submenu a, ul.category-list li a').each((_, el) => {
      let href = $(el).attr('href');
      if (href) {
        if (!href.startsWith('http')) {
          href = BASE_URL + '/' + href.replace(/^\/*/, '');
        }
        subCategories.push(href);
      }
    });

    scraperLogger.info({
      parent_url: categoryUrl,
      subcategories_found: subCategories.length
    }, 'Autocentar subcategories discovered');

    return subCategories;
  } catch (err) {
    scraperLogger.warn({ url: categoryUrl, error: err.message }, 'Failed to discover Autocentar subcategories');
    return [];
  }
}

/**
 * Scrape products from Autocentar page
 */
async function scrapeAutocentar(listUrl, retries = 3) {
  try {
    scraperLogger.info({ url: listUrl }, 'Starting Autocentar product scrape');

    await randomDelay(1000, 2500);

    let html;
    let attempt = 0;

    while (attempt < retries) {
      try {
        scraperLogger.debug({ attempt: attempt + 1, retries }, 'Fetching Autocentar page');
        
        const scraper = createScraperInstance();
        scraper.defaults.headers['Referer'] = BASE_URL;
        
        const response = await scraper.get(listUrl);

        if (response.status === 403 || response.status === 429) {
          throw new Error(`Got HTTP ${response.status} - possibly blocked`);
        }

        if (response.data.includes('robot') || response.data.includes('access denied')) {
          throw new Error('Detected robot/access denial page');
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
          'Autocentar fetch attempt failed, retrying...'
        );
        await randomDelay(backoffTime, backoffTime + 1500);
      }
    }

    const $ = cheerio.load(html);
    const products = [];

    // Adjust selectors based on Autocentar's actual HTML
    $('div.item_list div.item_details, div.product-card, li.product-item').each((_, el) => {
      try {
        const card = $(el);

        const linkEl = card.find('div.item_image a, a.product-link, .product-title a').first();
        let href = linkEl.attr('href') || '';

        if (href && !href.startsWith('http')) {
          href = BASE_URL + '/' + href.replace(/^\/*/, '');
        }

        const name = card.find('h3.ptcat.name, h3.product-name, .product-title').text().trim();

        const priceText = card.find('span.price_discounted, span.price, .product-price').text().trim();
        const numeric = priceText.replace(/[^\d,.]/g, '').replace(',', '.');
        const price = numeric ? parseFloat(numeric) : null;

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
        scraperLogger.warn({ error: err.message }, 'Error parsing Autocentar product');
      }
    });

    scraperLogger.info({ count: products.length }, `Autocentar found ${products.length} products`);

    if (products.length === 0) {
      scraperLogger.warn({ url: listUrl }, 'No products found on Autocentar page');
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
        scraperLogger.warn({ product: product.part_name, error: err.message }, 'Insert error for Autocentar product');
      }

      await randomDelay(50, 150);
    }

    scraperLogger.info({ inserted, total: products.length }, 'Autocentar product scrape complete');
    return inserted;
  } catch (err) {
    scraperLogger.error({ error: err.message, url: listUrl }, 'Autocentar product scrape failed');
    throw err;
  }
}

module.exports = {
  scrapeAutocentar,
  discoverAutocentarSubcategories
};
