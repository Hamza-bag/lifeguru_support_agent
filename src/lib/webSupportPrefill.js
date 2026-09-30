const { normalizePhoneDigits } = require('../orders/phone');

/**
 * Parse WhatsApp text pasted from web v2 support (orderSupport.ts template).
 */
function parseWebSupportPrefill(text) {
  const raw = String(text || '');
  const orderMatch = raw.match(/Order ID:\s*(\d+)/i);
  const subMatch = raw.match(/Subscription ID:\s*(\S+)/i);
  const mobileMatch = raw.match(/Registered Mobile Number:\s*([+\d\s-]{10,})/i);
  const registeredMobile = mobileMatch
    ? normalizePhoneDigits(mobileMatch[1])
    : null;

  return {
    orderId: orderMatch ? String(orderMatch[1]).trim() : null,
    subscriptionId: subMatch ? String(subMatch[1]).trim() : null,
    registeredMobile,
    isWebSupportTemplate: /I need help with my order/i.test(raw) && Boolean(orderMatch || subMatch || mobileMatch),
  };
}

/** User text for routing when message is mostly web prefill. */
function routingTextAfterPrefill(text) {
  const raw = String(text || '').trim();
  const prefill = parseWebSupportPrefill(raw);
  if (!prefill.isWebSupportTemplate) return raw;
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const extra = lines.filter(
    (line) =>
      !/^hi,?\s/i.test(line) &&
      !/^order id:/i.test(line) &&
      !/^subscription id:/i.test(line) &&
      !/^registered mobile number:/i.test(line) &&
      !/^i need help with my order/i.test(line),
  );
  if (extra.length) return extra.join(' ');
  return 'order help';
}

module.exports = { parseWebSupportPrefill, routingTextAfterPrefill };
