// DEBUG_delmak.js - Save this and run: node DEBUG_delmak.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function debugDelmakPage() {
  const url = 'https://delmak.mk/c/874/vozila/bmw/bmw-serija-4/delovi-za-bmw-serija-4-g23-cabrio-20--avto-delovi-za-karoserija';

  try {
    console.log('🔍 DEBUGGING Delmak page...\n');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000
    });

    console.log('✓ Page fetched successfully\n');

    const $ = cheerio.load(response.data);

    // Check what containers exist
    console.log('=== CONTAINER ANALYSIS ===\n');
    console.log('div.product-card found:', $('div.product-card').length);
    console.log('div.product-item found:', $('div.product-item').length);
    console.log('li.product found:', $('li.product').length);
    console.log('div[class*="product"]:', $('div[class*="product"]').length);
    console.log('article.product found:', $('article.product').length);

    // Show first few divs with "product" in class
    console.log('\n=== DIVS WITH "product" IN CLASS ===');
    $('div[class*="product"]').slice(0, 3).each((i, el) => {
      console.log(`[${i}] class="${$(el).attr('class')}"`);
    });

    // Try each selector
    console.log('\n=== TESTING SELECTORS ===\n');

    ['div.product-card', 'div.product-item', 'li.product', 'article'].forEach(sel => {
      const count = $(sel).length;
      console.log(`Selector: "${sel}" → Found ${count} elements`);
      
      if (count > 0) {
        const first = $(sel).first();
        console.log(`  Name selectors:`);
        console.log(`    h5.pc_title a: "${first.find('h5.pc_title a').text().slice(0, 50)}"`);
        console.log(`    h5: "${first.find('h5').text().slice(0, 50)}"`);
        console.log(`    .product-name: "${first.find('.product-name').text().slice(0, 50)}"`);
        console.log(`  Price selectors:`);
        console.log(`    div.product-card__price: "${first.find('div.product-card__price').text()}"`);
        console.log(`    .price: "${first.find('.price').text()}"`);
        console.log(`    span: "${first.find('span').first().text().slice(0, 50)}"`);
        console.log('');
      }
    });

    // Detailed HTML sample
    console.log('\n=== HTML SAMPLE (first 2000 chars) ===\n');
    const htmlSnippet = response.data.slice(0, 3000);
    console.log(htmlSnippet);

    // Save full HTML for analysis
    fs.writeFileSync('delmak_page.html', response.data);
    console.log('\n✓ Full HTML saved to delmak_page.html');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

debugDelmakPage();
