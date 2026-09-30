const { readFaqEntries } = require('../content/loadContent');

const MAX_CATALOG = 120;
const HINT_CHARS = 100;

/**
 * Short id + hint list for the classify prompt.
 * The knowledge-base id is chosen in that same Gemini call — there is no second request.
 */
function faqCatalogForLlm() {
  return readFaqEntries()
    .filter((e) => !(e.tags || []).includes('_system'))
    .slice(0, MAX_CATALOG)
    .map((e) => ({
      id: e.id,
      hint: String(e.en || '').replace(/\s+/g, ' ').slice(0, HINT_CHARS),
    }));
}

module.exports = { faqCatalogForLlm };
