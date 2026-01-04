// alvadiScraper.js

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

async function scrapeAlvadiCategory(categoryUrl) {
  let browser;
  try {
    console.log('🔍 Scraping Alvadi:', categoryUrl);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Go to page and wait for products to load
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for products to appear
    await page.waitForSelector('div.catalog-product, article, .product-item', { timeout: 10000 }).catch(() => null);
    
    // Get page HTML after JS renders
    const html = await page.content();
    
    const $ = cheerio.load(html);
    const products = [];

    // Parse products
    $('div.catalog-product, article, .product-item').each((index, el) => {
      try {
        const $el = $(el);

        // Get product name
        let name = $el.find('h2, h3, .product-name, a').first().text().trim() || '';
        
        // Get price
        let priceText = $el.find('.price, strong, span').text().trim() || '';
        const priceMatch = priceText.match(/\d+[\.,\d]*/);
        let price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : null;

        // Get URL
        let href = $el.find('a[href*="/spare-parts/"]').attr('href') || 
                   $el.find('a').attr('href') || '';

        if (href && !href.startsWith('http')) {
          href = 'https://alvadi.mk' + (href.startsWith('/') ? '' : '/') + href;
        }

        // Get part number
        let partNumber = $el.attr('data-product-id') || null;

        if (name && name.length > 5 && href) {
          products.push({
            part_name: name,
            part_number: partNumber,
            price: price,
            supplier: 'Alvadi',
            product_url: href
          });

          console.log(`  ✓ ${name.slice(0, 60)}`);
        }
      } catch (err) {
        // Silent
      }
    });

    await browser.close();

    console.log(`📊 Found ${products.length} products\n`);

    // Insert to DB
    let inserted = 0;
    if (global.db && products.length > 0) {
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
          // Continue
        }
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    console.log(`✅ Inserted ${inserted}/${products.length}\n`);
    return inserted;

  } catch (err) {
    console.error(`❌ Error: ${err.message}\n`);
    if (browser) await browser.close();
    return 0;
  }
}

async function runAlvadiScraper() {
  try {
    const ALVADI_CATEGORIES = require('./alvadiCategories');
    console.log(`\n🚀 Alvadi scraper (${ALVADI_CATEGORIES.length} categories)\n`);

    let total = 0;
    for (const url of ALVADI_CATEGORIES) {
      const count = await scrapeAlvadiCategory(url);
      total += count;
      await new Promise(resolve => setTimeout(resolve, 3000)); // Longer delay between requests
    }

    console.log(`\n🎉 TOTAL: ${total} products\n`);
    return total;

  } catch (err) {
    console.error('Fatal:', err.message);
    return 0;
  }
}

module.exports = { scrapeAlvadiCategory, runAlvadiScraper };
