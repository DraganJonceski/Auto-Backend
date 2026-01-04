// scrapers/alvadiScraper.js
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://alvadi.mk';

async function scrapeAlvadiCategory(listUrl) {
  try {
    console.log('Scraping Alvadi:', listUrl);
    
    const { data: html } = await axios.get(listUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

    const $ = cheerio.load(html);
    const products = [];

    $('div.cpd-article').each((_, el) => {
      const card = $(el);

      // title + link
      const titleLink = card.find('h3 a').first();
      const name = titleLink.text().trim();
      let href = titleLink.attr('href') || '';

      if (href && !href.startsWith('http')) {
        href = `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
      }

      // item code (шифра на производ)
      const itemId = card.find('span').first().text().trim();

      // price on list
      let price = null;
      let priceText = card.find('strong.price, span.price').first().text().trim();

      if (priceText) {
        const numeric = priceText.replace(/[^\d,\\.]/g, '').replace(',', '.');
        price = numeric ? Number(numeric) : null;
      }

      if (!name || !href) return;

      products.push({
        part_name: name,
        part_number: itemId || null,
        price: price || 0,
        supplier: 'Alvadi',
        product_url: href
      });
    });

    console.log(`Alvadi found ${products.length} products before saving`);

    if (products.length === 0) {
      return 0;
    }

    // Delete old Alvadi products
    await global.db.query('DELETE FROM products WHERE supplier = $1', ['Alvadi']);

    // Insert new products into PostgreSQL
    const query = `
      INSERT INTO products (part_name, part_number, price, supplier, product_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    let inserted = 0;
    for (const product of products) {
      try {
        await global.db.query(query, [
          product.part_name,
          product.part_number,
          product.price,
          product.supplier,
          product.product_url
        ]);
        inserted++;
      } catch (err) {
        console.warn('Insert error for', product.part_name, ':', err.message);
      }
    }

    console.log(`Scraped ${inserted} Alvadi products`);
    return inserted;
  } catch (err) {
    console.error('Alvadi scrape error:', err.message);
    throw err;
  }
}

module.exports = scrapeAlvadiCategory;
