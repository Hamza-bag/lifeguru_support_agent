/** Catalogue “which puja” picks. Other wording is left for the model. */
function whichPujaFaqId(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  if (/\b(video|refund|cancel|tracking)\b/.test(lower) || /वीडियो|रिफंड/.test(raw)) return null;

  if (/\b(ganpati|ganesh|ganapati)\b/.test(lower) || /गणपति|गणेश/.test(raw)) {
    return 'which_puja_not_in_catalogue';
  }
  if ((/\bhanuman\b/.test(lower) || /हनुमान/.test(raw)) && /\b(puja|pooja)\b/.test(lower)) {
    return 'which_puja_hanuman';
  }

  const choosing =
    /\b(konsi|kaunsi|which|ke liye|karani hai|karni hai|karwana|any puja|koi puja)\b/.test(lower) ||
    /कौन सी|कौनसी|के लिए/.test(raw);
  if (!choosing) return null;
  // "When will it happen" is a wish, not a request to pick a puja from the list.
  if (/\b(kab hogi|kab hoga|when will)\b/.test(lower) || /कब होगी|कब होगा/.test(raw)) return null;
  if (/\b(karz|debt|loan)\b/.test(lower) || /कर्ज|ऋण/.test(raw)) return 'which_puja_debt';
  if (/\b(shaadi|vivah|marriage|wedding)\b/.test(lower) || /शादी|विवाह/.test(raw)) {
    return 'which_puja_marriage';
  }
  return null;
}

module.exports = { whichPujaFaqId };
