const { readFaqEntries } = require('../content/loadContent');

function normalize(s) {
  return String(s || '').toLowerCase();
}

function matchFaq(userText, lang = 'en') {
  const text = normalize(userText);
  if (!text) return null;
  const entries = readFaqEntries();
  let best = null;
  let bestScore = 0;
  for (const entry of entries) {
    let score = 0;
    for (const kw of entry.keywords || []) {
      if (text.includes(normalize(kw))) score += 2;
    }
    for (const tag of entry.tags || []) {
      if (text.includes(normalize(tag))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (!best || bestScore < 2) return null;
  const locale = lang === 'hi' ? 'hi' : 'en';
  const body = best[locale] || best.en;
  return { id: best.id, text: body };
}

function faqById(id, lang = 'en') {
  const entry = readFaqEntries().find((e) => e.id === id);
  if (!entry) return null;
  const locale = lang === 'hi' ? 'hi' : 'en';
  return { id: entry.id, text: entry[locale] || entry.en };
}

/** CS-editable copy from content/kb/faq.json (system ids), with template fallback. */
function kbLines(lang, ids, fallbackKeys, t) {
  const locale = lang === 'hi' ? 'hi' : 'en';
  return ids.map((id, i) => {
    const hit = faqById(id, locale);
    if (hit?.text) return hit.text;
    const key = fallbackKeys[i];
    return key ? t(locale, key) : '';
  }).filter(Boolean);
}

module.exports = { matchFaq, faqById, kbLines };
