const { readFaqEntries } = require('../content/loadContent');
const { applyKbPlaceholders } = require('../content/kbPlaceholders');

const MAX_CATALOG = 120;
const CUE_CHARS = 70;

/** Drop the shared greeting and URLs so the cue is the part that differs between cards. */
function answerCue(en) {
  return applyKbPlaceholders(String(en || ''))
    .replace(/\s+/g, ' ')
    .replace(/^Namaste\s*🙏?\s*/i, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s*:\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CUE_CHARS);
}

/**
 * Every published card, as the question it answers plus a short answer cue.
 * The knowledge-base id is chosen in that same Gemini call — there is no second request.
 */
function faqCatalogForLlm() {
  return readFaqEntries()
    .filter((e) => !(e.tags || []).includes('_system'))
    .slice(0, MAX_CATALOG)
    .map((e) => ({
      id: e.id,
      ask: String(e.example || '').replace(/\s+/g, ' ').trim(),
      cue: answerCue(e.en),
    }));
}

module.exports = { faqCatalogForLlm };
