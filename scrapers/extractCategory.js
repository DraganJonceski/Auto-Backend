function extractCategoryFromUrl(url) {
  const parts = url.split('/').filter(p => p);
  
  return {
    categoryId: parts[2],
    categoryType: parts[3],
    brand: parts[4],
    model: parts[5],
    productCategory: parts[6],
    year: extractYear(parts[6]),
    part: extractPartType(parts[6])
  };
}

function extractYear(text) {
  if (!text) return null;
  const match = text.match(/(\d{2})-(\d{2})/);
  return match ? `19${match[1]}-19${match[2]}` : null;
}

function extractPartType(text) {
  if (!text) return null;
  return text.split('-').pop();
}

module.exports = { extractCategoryFromUrl };
