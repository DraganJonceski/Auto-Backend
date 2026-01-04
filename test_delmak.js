// test_delmak.js - DIAGNOSTIC SCRIPT

const axios = require('axios');
const cheerio = require('cheerio');

async function testDelmakScraper() {
  try {
    console.log('=== TESTING DELMAK SCRAPER ===\n');

    // Test different possible URLs
    const urlsToTest = [
      'https://www.delmak.mk',
      'https://www.delmak.mk/spare-parts',
      'https://www.delmak.mk/spare-parts/air-filters',
      'https://www.delmak.mk/kategorija/air-filters',
      'https://delmak.mk',
    ];

    for (const url of urlsToTest) {
      console.log(`\n\n📍 Testing URL: ${url}`);
      console.log('='.repeat(60));

      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        console.log(`✅ Status: ${response.status}`);
        console.log(`📄 Content length: ${response.data.length} bytes`);
        console.log(`📝 First 500 chars:\n${response.data.substring(0, 500)}\n`);

        // Parse with cheerio
        const $ = cheerio.load(response.data);
        
        // Look for product elements
        console.log('🔍 Looking for products...');
        
        const productSelectors = [
          '.product-item',
          '.product-card',
          '.product',
          '.item',
          '[class*="product"]',
          '[class*="item"]',
          'div[class*="product"]',
          'li.product',
          '.proizvod',
          '.artikal'
        ];

        let foundProducts = 0;
        for (const selector of productSelectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            console.log(`   Found ${elements.length} elements with selector: ${selector}`);
            foundProducts += elements.length;
          }
        }

        if (foundProducts === 0) {
          console.log('   ❌ No products found with any selector');
        }

        // Look for category links
        console.log('\n🔍 Looking for category/navigation links...');
        const links = $('a').slice(0, 30);
        console.log('   First 30 links:');
        links.each((i, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim().substring(0, 40);
          if (href && text) {
            console.log(`     [${i+1}] "${text}" -> ${href}`);
          }
        });

        // Check for API or async loading
        console.log('\n🔍 Checking for dynamic content...');
        const html = response.data;
        if (html.includes('api') || html.includes('fetch') || html.includes('axios') || html.includes('async')) {
          console.log('   ⚠️  Page might use API/JavaScript to load products!');
        }

        if (html.includes('data-product') || html.includes('data-item')) {
          console.log('   ℹ️  Page uses data- attributes');
        }

      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

testDelmakScraper();
