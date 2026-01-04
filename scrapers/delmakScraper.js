const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.delmak.mk';

async function scrapeDelmakCategory(categoryUrl) {
  try {
    console.log('Scraping Delmak:', categoryUrl);
    
    const response = await axios.get(BASE_URL + categoryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}\
        timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const products = [];

    $('.product-item, .product-card').each((i, el) => {
      const name = $(el).find('.product-name, .title').text().trim();
      const price = $(el).find('.price').text().trim();
      const link = $(el).find('a').attr('href');
      const partNumber = $(el).find('.part-number, .sku').text().trim();

      if (name && price && link) {
        products.push({
          part_name: name,
          part_number: partNumber || null,
          price: parseFloat(price.replace(/[^\d.]/g, '')) || 0,
          supplier: 'Delmak',
          product_url: link.startsWith('http') ? link : BASE_URL + link
        });
      }
    });

    if (products.length === 0) {
      console.log('No products found');
      return 0;
    }

    // Insert into PostgreSQL
    const connectToDatabase = require('../db');
    const sql = await connectToDatabase();
    
    let inserted = 0;
    for (const product of products) {
      try {
        await sql`
          INSERT INTO products (part_name, part_number, price, supplier, product_url)
          VALUES (
            ${product.part_name},
            ${product.part_number},
            ${product.price},
            ${product.supplier},
            ${product.product_url}
          )
          ON CONFLICT (product_url) DO NOTHING
        `;
        inserted++;
      } catch (err) {
        console.warn('Insert error for', product.part_name, ':', err.message);
      }
    }

    console.log(`Inserted ${inserted} Delmak products`);
    return inserted;
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.error('Scraper timeout');
    }
    throw err;  // Or retry logic
  }
}

async function runDelmakScraper() {
  // Scrape multiple Delmak category URLs
  const categories = [
    '/spare-parts/air-filters',
    '/spare-parts/oil-filters'
  ];

  let total = 0;
  for (const category of categories) {
    const count = await scrapeDelmakCategory(category);
    total += count;
  }

  return total;
}

module.exports = { scrapeDelmakCategory, runDelmakScraper };
