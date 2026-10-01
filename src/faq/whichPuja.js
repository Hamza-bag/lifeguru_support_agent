/**
 * "Which puja for this problem?" — no Gemini, and no product URL.
 * The reply points at the listing pages, which show only sevas still open,
 * and then connects the customer to the team.
 */
function whichPujaFaqId(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const blob = `${lower}\n${raw}`;

  if (/\b(video|refund|cancel|tracking|prasad)\b/.test(lower)) return null;
  if (/वीडियो|रिफंड|प्रसाद/.test(raw)) return null;
  const choosing =
    /konsi|kaunsi|which|ke liye|karani hai|karni hai|karwana|any puja|koi puja/.test(lower) ||
    /कौन\s*सी|के लिए|करनी है|करानी/.test(raw);
  if (
    /\b(kab|when is|status)\b/.test(lower) &&
    !choosing
  ) {
    return null;
  }

  if (/ganpati|ganapati|\bganesh\b|गणपति|गणेश/.test(blob)) {
    return 'which_puja_not_in_catalogue';
  }
  if (/hanuman|हनुमान/.test(blob) && /puja|seva|पूजा|सेवा/.test(blob)) {
    return 'which_puja_hanuman';
  }
  if (!choosing) return null;

  if (/karz|debt|\bloan\b|\bemi\b|\brin\b|कर्ज|ऋण|क़र्ज़/.test(blob)) {
    return 'which_puja_debt';
  }
  if (/shaadi|shadi|\bvivah\b|marriage|rishta|शादी|विवाह/.test(blob)) {
    return 'which_puja_marriage';
  }
  return null;
}

module.exports = { whichPujaFaqId };
