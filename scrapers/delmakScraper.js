const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDelmakCategory(categoryUrl, retries = 3) {
  try {
    // Build full URL
    const fullUrl = categoryUrl.startsWith('http') 
      ? categoryUrl 
      : 'https://www.delmak.mk' + categoryUrl;
    
    console.log('🔍 Scraping Delmak:', fullUrl);

    let html;
    let attempt = 0;

    while (attempt < retries) {
      try {
        const response = await axios.get(fullUrl, {
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

    // Extract car brand and model from URL
    const urlParts = categoryUrl.split('/');
    const carBrand = urlParts[4]; // honda
    const carModelRaw = urlParts[5]; // honda-civic
    const carModel = carModelRaw.replace(/-/g, ' '); // honda civic

    $('div.product-card').each((index, el) => {
      try {
        const $card = $(el);

        let name = '';
        name = $card.find('h5.pc_title a').text().trim() || 
                $card.find('h6').text().trim() || 
                $card.find('.product-name').text().trim() ||
                $card.find('a[href*="/p/"]').text().trim() ||
                '';

        if (!name) {
          const allText = $card.text();
          const lines = allText.split('\n').filter(l => l.trim().length > 3);
          if (lines.length > 0) {
            name = lines[0].trim();
          }
        }

        const priceContainer = $card.find('div.product-card__price');
        let priceText = priceContainer.text().trim();
        const numbers = priceText.match(/[\d.]+/g) || [];
        let price = 0;

        if (numbers.length >= 2) {
          price = parseFloat(numbers[1].replace(/\./g, '').replace(',', '.'));
        } else if (numbers.length === 1) {
          price = parseFloat(numbers[0].replace(/\./g, '').replace(',', '.'));
        }

        let href = $card.find('h5.pc_title a').attr('href') || 
                   $card.find('a[href*="/p/"]').attr('href') ||
                   $card.find('a').first().attr('href') ||
                   '';

        if (href && !href.startsWith('http')) {
          href = 'https://delmak.mk' + (href.startsWith('/') ? '' : '/') + href;
        }

        let partNumber = null;
        const fullText = $card.text();
        const shifrMatch = fullText.match(/Шифра[:\s]+([0-9A-Za-z\-]+)/);
        if (shifrMatch) {
          partNumber = shifrMatch[1].trim();
        }

        if (name && name.length > 5 && price > 0 && href) {
          products.push({
            part_name: name,
            part_number: partNumber || null,
            price: price,
            supplier: 'Delmak',
            product_url: href,
            car_brand: carBrand,
            car_model: carModel
          });

          console.log(`  ✓ ${name.slice(0, 50)} | ${partNumber || 'N/A'} | ${price} MKD | ${carModel}`);
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

    let inserted = 0;

    if (global.db) {
      for (const product of products) {
        try {
          await global.db`
            INSERT INTO products (part_name, part_number, price, supplier, product_url, car_brand, car_model)
            VALUES (
              ${product.part_name},
              ${product.part_number},
              ${product.price},
              ${product.supplier},
              ${product.product_url},
              ${product.car_brand},
              ${product.car_model}
            )
            ON CONFLICT (product_url) DO UPDATE
            SET price = ${product.price}, car_brand = ${product.car_brand}, car_model = ${product.car_model}, last_updated = CURRENT_TIMESTAMP
          `;
          inserted++;
        } catch (dbErr) {
          console.debug(`  ⚠️ DB: ${dbErr.message.slice(0, 50)}`);
        }

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
