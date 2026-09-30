const { faqById } = require('./faqLookup');

/** Use the id already chosen by classify. No extra Gemini call. */
function resolveFaq(_userText, lang = 'en', faqId = null) {
  if (!faqId) return null;
  const hit = faqById(String(faqId), lang);
  if (!hit) return null;
  return { ...hit, matchMethod: 'llm', reason: `llm_faq:${hit.id}` };
}

/** CS-editable copy from content/kb (system ids), with template fallback. */
function kbLines(lang, ids, fallbackKeys, t) {
  const locale = lang === 'hi' ? 'hi' : 'en';
  return ids.map((id, i) => {
    const hit = faqById(id, locale);
    if (hit?.text) return hit.text;
    const key = fallbackKeys[i];
    return key ? t(locale, key) : '';
  }).filter(Boolean);
}

module.exports = {
  resolveFaq,
  faqById,
  kbLines,
};
