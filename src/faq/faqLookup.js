const { readFaqEntries } = require('../content/loadContent');
const { applyKbPlaceholders } = require('../content/kbPlaceholders');

function entryToHit(entry, lang) {
  const locale = lang === 'hi' ? 'hi' : 'en';
  const body = applyKbPlaceholders(entry[locale] || entry.en);
  return { id: entry.id, text: body };
}

function faqById(id, lang = 'en') {
  const entry = readFaqEntries().find((e) => e.id === id);
  if (!entry) return null;
  return entryToHit(entry, lang);
}

module.exports = { faqById };
