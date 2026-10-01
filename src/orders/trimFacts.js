const MAX_PRODUCT_NAME = 80;

function trimProductName(name) {
  let s = String(name || 'booking')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return 'booking';
  const beforeTitle = s.split(/\s+title\s+/i)[0].trim();
  if (beforeTitle.length >= 3 && beforeTitle.length < s.length) s = beforeTitle;
  if (s.length > 48) {
    const sentence = s.split(/[.!?।]/)[0].trim();
    if (sentence.length >= 8 && sentence.length < s.length) s = sentence;
  }
  if (s.length > 48) {
    const slice = s.slice(0, 47);
    const word = slice.lastIndexOf(' ');
    s = `${(word > 16 ? slice.slice(0, word) : slice).trim()}…`;
  }
  return s || 'booking';
}

function normalizeFactsPayload(data) {
  if (!data || typeof data !== 'object') return data;
  return {
    ...data,
    productName: trimProductName(data.productName),
  };
}

module.exports = { trimProductName, normalizeFactsPayload, MAX_PRODUCT_NAME };
