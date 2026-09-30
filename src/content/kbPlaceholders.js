const config = require('../config');

/**
 * KB JSON uses {{PUJA_UPDATES_SENDER}} — Interakt outbound (default 7619486274, LifeGuru Puja Updates).
 * {{SUPPORT_WHATSAPP}} — support chat (default +91 8147560485), not Interakt.
 */
function applyKbPlaceholders(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\{\{PUJA_UPDATES_SENDER\}\}/g, config.pujaUpdatesSenderLabel)
    .replace(/\{\{SUPPORT_WHATSAPP\}\}/g, config.supportWhatsAppDisplay);
}

module.exports = { applyKbPlaceholders };
