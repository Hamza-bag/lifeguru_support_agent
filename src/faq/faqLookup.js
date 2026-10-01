const { readFaqEntries } = require('../content/loadContent');
const { applyKbPlaceholders } = require('../content/kbPlaceholders');

function templateLocale(lang) {
  if (lang === 'hi' || lang === 'hinglish') return lang;
  return 'en';
}

function entryToHit(entry, lang) {
  const locale = templateLocale(lang);
  const body = applyKbPlaceholders(entry[locale] || entry.en);
  return { id: entry.id, text: body, handoff: Boolean(entry.handoff) };
}

function faqById(id, lang = 'en') {
  const entry = readFaqEntries().find((e) => e.id === id);
  if (!entry) return null;
  return entryToHit(entry, lang);
}

module.exports = { faqById, templateLocale };
