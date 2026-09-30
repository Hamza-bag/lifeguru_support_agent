function detectLanguage(text) {
  return detectReplyLanguage(text).locale;
}

/** Non-Devanagari Indic scripts (Gujarati, Bengali, Tamil, …) — templates stay English; mirror localizes. */
function hasOtherIndicScript(raw) {
  return /[\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/.test(
    raw,
  );
}

const HINDI_ROMAN_MARKERS =
  /\b(meri|mera|mere|mujhe|mujhpe|kab|kya|hai|hain|nahi|nhi|aayegi|aayega|chahiye|batao|bataiye|batawo|kal|aaj|dhanyavad|milega|aaya|chahida)\b/;

/** Roman Punjabi (often mixed with English). */
function isRomanPunjabi(lower) {
  return /\b(meye|maine|kidi|kithe|kadon|ehno|ihno|daso|batawo|chahida|chahidi|karda|kardi|karna|schedule batawo)\b/.test(
    lower,
  );
}

/** Roman script Gujarati (often mixed with English words). Check before Hindi — "puja" alone is not Hindi. */
function isRomanGujarati(lower) {
  const guj =
    /\b(mari|maru|mara|tamari|tamaru|kyare|kyar|keware|kewa?re|kem|kevi|kevo|nathi|avse|avshe|aavse|awse|chhe|mane|tame|su|thase|thay|kari|sake)\b/.test(
      lower,
    );
  return guj && !HINDI_ROMAN_MARKERS.test(lower);
}

function isRomanMarathi(lower) {
  const mr =
    /\b(majhi|maza|mazhi|mazha|kay|aahe|kadhi|mala|tula|zala|hotay|nahi ka)\b/.test(lower);
  return mr && !HINDI_ROMAN_MARKERS.test(lower) && !isRomanGujarati(lower);
}

/**
 * Template locale (en|hi only in copy.js) + LLM mirror for the user's real language.
 * Roman Hinglish / Eng-Gujarati / Eng-Marathi → en templates + mirror.
 */
function detectReplyLanguage(text) {
  const raw = String(text || '');
  if (/[\u0900-\u097F]/.test(raw)) {
    return { locale: 'hi', mirror: true, register: 'devanagari' };
  }
  if (hasOtherIndicScript(raw)) {
    return { locale: 'en', mirror: true, register: 'indic_regional' };
  }
  const lower = raw.toLowerCase();
  if (isRomanGujarati(lower)) {
    return { locale: 'en', mirror: true, register: 'eng_gujarati' };
  }
  if (isRomanMarathi(lower)) {
    return { locale: 'en', mirror: true, register: 'eng_marathi' };
  }
  if (isRomanPunjabi(lower)) {
    return { locale: 'en', mirror: true, register: 'punjabi_roman' };
  }
  if (HINDI_ROMAN_MARKERS.test(lower)) {
    return { locale: 'en', mirror: true, register: 'hinglish_or_roman_hi' };
  }
  return { locale: 'en', mirror: true, register: 'en' };
}

/** Hi/hello only — welcome reply, no Gemini or Admin. */
function isPureSocialGreeting(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (/^(hi|hello|hey|hii|yo|namaste|नमस्ते)[!.?\s]*$/i.test(lower)) return true;
  if (/^(hi|hello|hey|namaste)\s+(there|all|team|sir|madam)[!.?\s]*$/i.test(lower)) return true;
  return false;
}

/** Short thanks only — polite ack, no Gemini or Admin. */
function isPureThanks(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (
    /^(thanks|thank you|thankyou|thx|thanks a lot|many thanks|ok thanks|okay thanks|ty)[!.?\s]*$/i.test(
      lower,
    )
  ) {
    return true;
  }
  if (/^(dhanyavad|dhanyavaad|shukriya|शुक्रिया|धन्यवाद|थैंक्यू|थैंक)[!.?\s]*$/i.test(raw)) {
    return true;
  }
  return false;
}

function textContainsExternalLink(text) {
  const raw = String(text || '');
  if (!raw.trim()) return false;
  if (/\bhttps?:\/\//i.test(raw)) return true;
  if (/\bwww\./i.test(raw)) return true;
  if (
    /\b(wa\.me|api\.whatsapp\.com|t\.me|bit\.ly|tinyurl\.com|goo\.gl|instagram\.com|facebook\.com|fb\.me|youtube\.com|youtu\.be|drive\.google\.com|docs\.google\.com)\//i.test(
      raw,
    )
  ) {
    return true;
  }
  return false;
}

/** Sankalp / gotra / name on booking — always human (MVP rules path). */
function isSankalpOrGotraChangeRequest(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  if (!/(naam|name|gotra|sankalp|snakalp|संकल्प|नाम|गोत्र)/i.test(raw)) return false;
  const lower = raw.toLowerCase();
  return (
    /\b(change|changes|changing|update|correct|edit|fix|wrong|badal|badlo|badalna|karna|karni|kqrna|chahiye|galat)\b/i.test(
      lower,
    ) || /बदल|सही|गलत|अपडेट|बदलना|करना|चाहिए|गलत/i.test(raw)
  );
}

/** Upset tone on any topic — not tied to autopay, video, or one product. */
function isIrritatedOrAngry(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  return (
    /\b(angry|anger|irritated|irritating|furious|scam|fraud|cheat|cheated|cheating|thug|bakwas|bakwaas|worst|useless|pathetic|disgusting|shame)\b/.test(
      lower,
    ) ||
    /\b(gussa|pagal|bewakoof|dhoka|thagi|bekar)\b/.test(lower) ||
    /धोखा|ठगी|गुस्सा|बेकार|बकवास|फ्रॉड/.test(raw)
  );
}

/** Calm “how do I stop autopay” — the word cancel here is not a puja cancellation. */
function isCalmAutopayHelp(text) {
  const raw = String(text || '');
  if (!raw.trim() || isIrritatedOrAngry(raw)) return false;
  if (/\b(refund|money back|paisa wapas)\b/i.test(raw) || /पैस[ाे].*वाप|वापस.*पैस/.test(raw)) {
    return false;
  }
  return (
    /\b(autopay|auto[\s-]?pay|upi\s*mandate|\bmandate\b)\b/i.test(raw) ||
    /ऑटोपे|ऑटो\s*पे|मंडेट/.test(raw)
  );
}

function autopayFaqId(text) {
  if (!isCalmAutopayHelp(text)) return null;
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  const whyCharged =
    /\b(kyu|why|kata|charged|deduct|deducted|501|301|701)\b/.test(lower) ||
    /क्यों|कट\s*ग/.test(raw);
  const wantsSteps =
    /\b(stop|cancel|band|kaise|how|steps)\b/.test(lower) || /कैसे|रोक|बंद/.test(raw);
  if (whyCharged && !wantsSteps) return 'autopay_501';
  return 'sub_autopay_cancel_steps';
}

function mentionsLive(text) {
  const raw = String(text || '');
  return /\blive\b/i.test(raw) || /लाइव/.test(raw);
}

function mentionsOwnBooking(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  return /\b(my|meri|mera|mere|link|opted|included)\b/.test(lower) || /मेरी|मेरा|लिंक/.test(raw);
}

/** Any “is this puja live?” that is not about their booking. Never answer from the puja name. */
function isCatalogueLiveQuestion(text) {
  return mentionsLive(text) && !mentionsOwnBooking(text);
}

/** Their own booking’s live add-on. Confirmed only from the LivePuja line item. */
function isOwnLiveBookingQuestion(text) {
  return mentionsLive(text) && mentionsOwnBooking(text);
}

/**
 * Call request, screenshot, upset tone, or a payment dispute that is not a calm autopay how-to.
 */
function requiresDirectHumanHandoffText(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  if (isIrritatedOrAngry(raw)) return true;
  if (isSankalpOrGotraChangeRequest(raw)) return true;
  if (textContainsExternalLink(raw)) return true;
  const lower = raw.toLowerCase();

  if (
    /\b(screenshot|screen\s*shot|screen\s*capture|snap\s*sent|photo\s*sent|image\s*sent|shared\s*(a\s*)?(photo|image|screenshot)|sent\s*(you\s*)?(a\s*)?(photo|screenshot|ss))\b/i.test(
      lower,
    ) ||
    /\b(ss\s*bhej|screenshot\s*bhej|photo\s*bhej|photo\s*bheja|screenshot\s*bheja)\b/i.test(lower) ||
    /स्क्रीनशॉट|स्क्रीन\s*शॉट|फोटो\s*भेज/i.test(raw)
  ) {
    return true;
  }

  if (
    /\b(call me|call us|call you|please call|can you call|can u call|could you call|how can i call|give me a call|give us a call|callback|call back|phone call|talk on call|speak on phone|need a call)\b/i.test(
      lower,
    ) ||
    /\b(call karo|call kar|call kijiye|phone karo|phone kar|mujhe call|mujko call|call pe|baat phone)\b/i.test(
      lower,
    ) ||
    /कॉल\s*कर|फोन\s*कर|कॉल\s*म|call\s*chahiye/i.test(raw)
  ) {
    return true;
  }

  if (
    !isCalmAutopayHelp(raw) &&
    (/\b(money\s*deduct|deducted|deduction|amount\s*deduct|wrong\s*deduct|charged|charge\s*cut|paise\s*kat|paisa\s*kat|money\s*cut|cut\s*gaya|cut\s*gayi|kat\s*gaya|kat\s*gayi|amount\s*cut)\b/i.test(
      lower,
    ) ||
      /कट\s*गया|कट\s*गय|पैस[ेा]\s*कट|राशि\s*कट/i.test(raw))
  ) {
    return true;
  }

  if (
    /\b(voice\s*note|voice\s*message|audio\s*message|sent\s*audio|whatsapp\s*audio|voice\s*note)\b/i.test(
      lower,
    ) ||
    /वॉइस\s*नोट|ऑडियो\s*मैसेज|ऑडियो\s*भेज/i.test(raw)
  ) {
    return true;
  }

  return false;
}

function wantsHuman(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return false;
  if (requiresDirectHumanHandoffText(text)) return true;
  if (isCalmAutopayHelp(text)) return false;
  if (
    /\b(human agent|talk to (a )?(human|agent|someone|person)|customer care|operator|refund|cancel|complaint|manager)\b/.test(
      raw,
    )
  ) {
    return true;
  }
  if (
    /एजेंट|ऑपरेटर|इन्सान|इंसान|रिफंड|शिकायत|कम्प्लेन|कम्प्लेन्ट|रद्द|हेल्प डेस्क|पैस[ाा].*वाप|वापस.*पैस|refund|paisa wapas/i.test(
      raw,
    )
  ) {
    return true;
  }
  return false;
}

function wantsNoMore(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return false;
  if (
    /^(no|nope|nah|no thanks|no thank you|that's all|thats all|nothing|nothing else|not really|i'm good|im good|all good|done|bye|goodbye|thanks|thank you|thankyou|end|no need)$/i.test(
      raw,
    )
  ) {
    return true;
  }
  if (/\b(no more|don't need|dont need|nothing else|no thanks)\b/.test(raw)) {
    return true;
  }
  if (
    /^(नहीं|नही|ना|नहीं चाहिए|नही चाहिए|और नहीं|और नही|जी नहीं|जी नही|बस|बस इतना|बस इतना ही|धन्यवाद|थैंक्यू|बाय|खत्म|nahi|nhi)$/.test(
      raw,
    )
  ) {
    return true;
  }
  if (/नहीं चाहिए|और कुछ नहीं|कोई जरूरत नहीं|जरूरत नहीं/.test(raw)) {
    return true;
  }
  return false;
}

function wantsYesMore(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return false;
  if (/^(yes|y|yeah|yep|yup|haan|ha|more)$/i.test(raw)) return true;
  if (/^(हाँ|हां|जी|जी हाँ|जी हां|हाँ और|और)$/.test(raw)) return true;
  return false;
}

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Long emotional / business-distress / custom-deal messages — not "when is my puja".
 * Must not trigger keyword admin lookup or rules-only puja intent.
 */
function isComplexSupportMessage(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  const words = wordCount(raw);
  const len = raw.length;

  if (len > 220 || words > 45) return true;
  if (words > 22 && /[.!?।\n]/.test(raw)) return true;

  const distress =
    /karobaar|karobar|business|sale nahi|partner|dost|outstanding|faas|fass|minimum sale|20k|18k|charaunga|charaenge|bimar|continuous|sochta|utha dene|puja se possible/i.test(
      raw,
    ) ||
    /करोबार|व्यापार|सेल|पार्टनर|दोस्त|फंस|बिमार|माँ|मां|outstanding|minimum/i.test(raw);

  if (distress && (len > 90 || words > 16)) return true;
  return false;
}

/** Short, explicit post-booking status questions — safe for keyword "puja/video" routing. */
function isClearPostBookingStatusQuery(text) {
  if (isComplexSupportMessage(text)) return false;
  const raw = String(text || '').trim();
  const lower = raw.toLowerCase();
  const words = wordCount(raw);

  const statusCue =
    /\b(when|cuando|kab|keware|kyare|awse|avse|aavse|status|tracking|time|aayeg|aayega|aaya|aayi|schedule|milegi|milega|receive|received|published|ready)\b/.test(
      lower,
    ) ||
    /\b(not arrived|did not arrive|didn't arrive|not received|nahi aaya|nahi aayi|nahi mila)\b/.test(
      lower,
    ) ||
    /कब|समय|ट्रैक|स्टेटस|स्थिति|नहीं आया|नहीं मिला/.test(raw);

  const myBookingCue =
    /\b(when is my|my puja|mi puja|meri puja|mari puja|maro puja|puja kab|video kab|prasad kab|tracking|order status|cuando)\b/i.test(
      lower,
    ) ||
    /meri.*puja.*kab|video.*aayeg|prasad.*milega|prasad.*delivery|वीडियो.*कब|पूजा.*कब|प्रसाद|ट्रैक/i.test(
      raw,
    );

  if (myBookingCue) return words <= 25;
  if (statusCue && /\b(puja|pooja|video|prasad|chadhava|order|booking)\b/i.test(lower)) {
    return words <= 25;
  }
  return false;
}

function isSpiritualPujaRecommendationQuery(text) {
  const raw = String(text || '').trim();
  if (!raw || wordCount(raw) > 45) return false;
  if (isClearPostBookingStatusQuery(raw)) return false;
  const lower = raw.toLowerCase();
  if (
    /\b(money return|max return|maximum return|guarantee|guaranteed|profit|labh|returns|financial)\b/i.test(
      lower,
    )
  ) {
    return false;
  }
  const lifeTopic =
    /\b(marriage|shaadi|shadi|vivah|wedding|health|bemar|bimar|sick|court|case|debt|rin|money|job|career|black magic|negative|problem|pareshani|tension)\b/i.test(
      lower,
    ) || /शादी|बीमार|कोर्ट|कर्ज|परेशानी/.test(raw);
  const asksPuja =
    /\b(which puja|kaunsi puja|konsi puja|kayi puja|recommend|suggest|best puja|puja karu|puja karni|chadhava karu|seva karu)\b/i.test(
      lower,
    ) || /कौन\s*सी\s*पूजा|कौनसी\s*पूजा/.test(raw);
  return lifeTopic && (asksPuja || /\b(puja|chadhava|seva)\b/i.test(lower));
}

function isPujaGuideQuery(text) {
  const raw = String(text || '').toLowerCase();
  return (
    /\b(dos and dont|do's and don't|dos dont|donts|do and dont|mantra|mantras|chant|jap|guideline|puja guide|recommended practice)\b/.test(
      raw,
    ) || /मंत्र|जाप|डू|डोंट|क्या कर|क्या न कर/.test(text)
  );
}

function needsEmpatheticHumanHandoff(text) {
  if (isSpiritualPujaRecommendationQuery(text)) return false;
  return isComplexSupportMessage(text);
}

/** New puja/chadhava booking — not "when is my puja" post-booking support. */
function isNewBookingQuery(text) {
  const raw = String(text || '').toLowerCase();
  if (
    /\b(how to book|booking link|book puja|book pooja|book chadhava|new booking|nayi booking)\b/.test(
      raw,
    )
  ) {
    return true;
  }
  if (/\b(kaise book|book karna|karwana hai|karwana chahte|puja karwa)\b/.test(raw)) {
    return true;
  }
  /** Roman Gujarati: "mane puja karawu che" = want puja done — not "when is my puja". */
  if (
    /\b(puja|pooja|chadhava)\b/.test(raw) &&
    /\b(karawu|karavu|karawa|karvi|karwana|karwa)\b/.test(raw) &&
    !/\b(kyare|keware|kewa?re|awse|avse|aavse|kab|when|status|video)\b/.test(raw)
  ) {
    return true;
  }
  if (/\b(mane puja|mane chadhava)\b/.test(raw) && !/\b(kyare|keware|kewa?re)\b/.test(raw)) {
    return true;
  }
  if (
    /\b(want|wants|get|need|like to|wish to|would like)\b/.test(raw) &&
    /\b(puja|pooja|chadhava)\b/.test(raw) &&
    !/\b(my|meri|mera|when|kab|time|video|status|refund|order|already)\b/.test(raw)
  ) {
    return true;
  }
  return false;
}

function classifyIntent(text) {
  if (isOwnLiveBookingQuestion(text)) return 'live';
  if (isNewBookingQuery(text)) return null;
  if (isComplexSupportMessage(text)) return null;
  if (isPujaGuideQuery(text)) return 'guide';
  if (!isClearPostBookingStatusQuery(text)) return null;
  const raw = String(text || '').toLowerCase();
  const video =
    /\b(video|recording|clip)\b/.test(raw) || /वीडियो|विडियो/.test(raw);
  const puja =
    /\b(puja|pooja|timing|schedule)\b/.test(raw) ||
    /पूजा|टाइमिंग/.test(raw) ||
    (/\b(when|kab)\b/.test(raw) && !video && !/prasad|prasada|delivery|tracking/.test(raw));
  const prasad =
    /\b(prasad|prasada|tracking|delivery|courier)\b/.test(raw) ||
    /प्रसाद|डिलीवरी|ट्रैक/.test(raw);
  if (prasad && (video || puja)) return 'both';
  if (prasad) return 'prasad';
  if (video && puja) return 'both';
  if (video) return 'video';
  if (puja) return 'puja';
  return null;
}

function isOrderIntent(intent) {
  return (
    intent === 'puja' ||
    intent === 'video' ||
    intent === 'prasad' ||
    intent === 'both' ||
    intent === 'guide' ||
    intent === 'live'
  );
}

function intentFromTopicChoice(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return null;
  if (/^(human agent|agent|operator|एजेंट|टीम)$/.test(raw)) return 'human';
  if (/^(puja schedule|puja time|schedule|पूजा समय|पूजा)$/.test(raw)) return 'puja';
  if (/^(video|वीडियो|विडियो)$/.test(raw)) return 'video';
  if (/^(prasad|प्रसाद)$/.test(raw)) return 'prasad';
  return classifyIntent(text);
}

function topicSuggestions(lang) {
  return lang === 'hi'
    ? ['पूजा समय', 'वीडियो', 'प्रसाद']
    : ['Puja schedule', 'Video', 'Prasad'];
}

module.exports = {
  detectLanguage,
  detectReplyLanguage,
  isPureSocialGreeting,
  isPureThanks,
  isIrritatedOrAngry,
  isCalmAutopayHelp,
  autopayFaqId,
  isCatalogueLiveQuestion,
  isOwnLiveBookingQuestion,
  requiresDirectHumanHandoffText,
  isSankalpOrGotraChangeRequest,
  isSpiritualPujaRecommendationQuery,
  isPujaGuideQuery,
  hasOtherIndicScript,
  isRomanGujarati,
  isRomanMarathi,
  wantsHuman,
  wantsNoMore,
  wantsYesMore,
  isNewBookingQuery,
  isComplexSupportMessage,
  isClearPostBookingStatusQuery,
  needsEmpatheticHumanHandoff,
  classifyIntent,
  isOrderIntent,
  intentFromTopicChoice,
  topicSuggestions,
  wordCount,
};
