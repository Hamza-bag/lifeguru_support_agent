const MAX_PRODUCT_NAME = 80;

function trimProductName(name) {
  let s = String(name || 'booking')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return 'booking';
  if (s.length > MAX_PRODUCT_NAME) {
    return `${s.slice(0, MAX_PRODUCT_NAME - 1)}…`;
  }
  return s;
}

function normalizeFactsPayload(data) {
  if (!data || typeof data !== 'object') return data;
  return {
    ...data,
    productName: trimProductName(data.productName),
  };
}

module.exports = { trimProductName, normalizeFactsPayload, MAX_PRODUCT_NAME };
