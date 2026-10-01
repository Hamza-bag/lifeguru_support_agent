const config = require('../config');
const siteLinks = require('../../content/links/site.json');

const LINK_TOKENS = {
  LINK_MANDIR_PUJA: siteLinks.mandirPuja,
  LINK_MANDIR_CHADHAVA: siteLinks.mandirChadhava,
};

/**
 * KB and reply copy use tokens. Edit content/links/site.json to change a URL everywhere.
 * {{PUJA_UPDATES_SENDER}} — Interakt outbound (default 7619486274, LifeGuru Puja Updates).
 * {{SUPPORT_WHATSAPP}} — support chat (default +91 8147560485), not Interakt.
 */
function applyKbPlaceholders(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text
    .replace(/\{\{PUJA_UPDATES_SENDER\}\}/g, config.pujaUpdatesSenderLabel)
    .replace(/\{\{SUPPORT_WHATSAPP\}\}/g, config.supportWhatsAppDisplay);
  for (const [token, url] of Object.entries(LINK_TOKENS)) {
    out = out.replaceAll(`{{${token}}}`, url || '');
  }
  return out;
}

module.exports = { applyKbPlaceholders };
