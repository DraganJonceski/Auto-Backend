// scrapers/categoryUrls.js

/**
 * Base category URLs for hybrid discovery
 * These are parent categories that will be auto-discovered for subcategories
 */
const BASE_CATEGORIES = {
  alvadi: [
    'https://alvadi.mk/filters',           // Will discover: air, oil, cabin filters
    'https://alvadi.mk/fluids',            // Will discover: coolant, brake fluid, etc
    'https://alvadi.mk/brakes',            // Will discover: pads, rotors, fluid
    'https://alvadi.mk/electrical',        // Will discover: spark plugs, bulbs, etc
  ],

  autocentar: [
    'https://www.autocentar.mk/filteri',        // Filters category
    'https://www.autocentar.mk/kocnice',        // Brakes
    'https://www.autocentar.mk/elektricni',     // Electrical
    'https://www.autocentar.mk/maslini',        // Oils/Fluids
  ],

  delmak: [
    'https://www.delmak.mk/spare-parts/filters',
    'https://www.delmak.mk/spare-parts/brakes',
    'https://www.delmak.mk/spare-parts/electrical',
    'https://www.delmak.mk/spare-parts/fluids',
  ]
};

module.exports = BASE_CATEGORIES;
