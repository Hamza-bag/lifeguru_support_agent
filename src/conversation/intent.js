function detectLanguage(text) {
  return detectReplyLanguage(text).locale;
}

/** Non-Devanagari Indic scripts. The reply model localizes these; code does not name the language. */
function hasOtherIndicScript(raw) {
  return /[\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/.test(
    raw,
  );
}

const HINDI_ROMAN_MARKERS =
  /\b(meri|mera|mere|mujhe|mujhpe|kab|kya|hai|hain|nahi|nhi|aayegi|aayega|chahiye|batao|bataiye|kal|aaj|dhanyavad|milega|aaya)\b/;

/** Plain English can use the template. */
function looksLikeEnglish(text) {
  const words = String(text || '')
    .toLowerCase()
    .match(/[a-z]{2,}/g) || [];
  if (!words.length) return true;
  const known =
    /^(a|an|the|i|is|are|was|my|your|me|we|you|when|what|where|how|please|video|puja|pooja|prasad|booking|order|orders|chadhava|help|hi|hello|hey|thanks|thank|yes|no|status|link|live|refund|cancel|name|gotra|today|and|or|to|for|of|on|in|it|its|this|that|not|have|has|will|can|do|about|any|which|with|from|ok|okay|want|book|last|latest|first|time|schedule|same|number|days|already|more|long|need|get|show|send|team|human|agent|list|few|than)$/;
  const hits = words.filter((word) => known.test(word)).length;
  return hits / words.length >= 0.6;
}

/**
 * Stored templates: English, Devanagari Hindi, and Roman Hinglish.
 * Any other language is left for the reply model. Code does not name it.
 */
function detectReplyLanguage(text) {
  const raw = String(text || '');
  if (/[\u0900-\u097F]/.test(raw)) {
    return { locale: 'hi', mirror: false, register: 'devanagari' };
  }
  const lower = raw.toLowerCase();
  if (HINDI_ROMAN_MARKERS.test(lower)) {
    return { locale: 'hinglish', mirror: false, register: 'hinglish' };
  }
  if (hasOtherIndicScript(raw) || !looksLikeEnglish(raw)) {
    return { locale: 'en', mirror: true, register: 'other' };
  }
  return { locale: 'en', mirror: false, register: 'en' };
}

/** Stretched hello (Hellooooo, hiii) — still a greeting, not a question. */
function isGreetingLike(text) {
  if (isPureSocialGreeting(text)) return true;
  const lower = String(text || '').trim().toLowerCase();
  return /^(h+e+l+o+|h+i+|he+y+|helo+|namaste+|namaskar+)[!.?\s]*$/i.test(lower);
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

/**
 * Asking whether a puja brings money, profit, or a result.
 * That is a knowledge-base question, not a demand to return a payment.
 */
function asksAboutMoneyOutcome(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  if (/\b(refund|money back)\b/.test(lower) || /रिफंड/.test(raw)) return false;
  if (/\b(cancel|cancellation)\b/.test(lower) && /\b(puja|pooja|booking|order|chadhava)\b/.test(lower)) {
    return false;
  }
  if (/\b(returns?|profit|guarantee|guaranteed)\b/.test(lower) || /गारंटी/.test(raw)) return true;
  const money = /\b(paisa|paise|money|fayda|labh|dhan)\b/.test(lower) || /पैसा|पैसे|फायदा|लाभ|धन/.test(raw);
  const outcome =
    /\b(milega|milegi|milta|milti|hoga|hogi|aayega|aayegi)\b/.test(lower) ||
    /मिलेगा|मिलेगी|होगा|होगी/.test(raw);
  return money && outcome;
}

/**
 * Refund or cancellation of a booking, in English or Hindi.
 * The team still handles it, after we know which booking.
 * AutoPay how-to, anger, and other languages are left for the model.
 * A question about whether the puja itself brings money is also left for the model.
 */
function isRefundOrCancelRequest(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  if (/\b(autopay|auto[\s-]?pay|mandate)\b/.test(lower) || /ऑटोपे|मंडेट/.test(raw)) return false;
  if (asksAboutMoneyOutcome(raw)) return false;
  if (/\b(refund|money back|paisa wapas)\b/.test(lower)) return true;
  if (/\b(cancel|cancellation)\b/.test(lower) && /\b(puja|pooja|booking|order|chadhava)\b/.test(lower)) {
    return true;
  }
  return /रिफंड|रद्द|पैस[ाे].*वाप|वापस.*पैस/.test(raw);
}

function mentionsLive(text) {
  const raw = String(text || '');
  return /\blive\b/i.test(raw) || /लाइव/.test(raw);
}

function mentionsOwnBooking(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  return /\b(my|meri|mera|mere|opted|included)\b/.test(lower) || /मेरी|मेरा/.test(raw);
}

/** Any “is this puja live?” that is not about their booking. Never answer from the puja name. */
function isCatalogueLiveQuestion(text) {
  if (!mentionsLive(text) || mentionsOwnBooking(text)) return false;
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  // Hearing or seeing a name on a stream is not "which puja is live".
  if (/\b(sunai|naam|name|clear|inaudible|network|glitch)\b/.test(lower) || /सुनाई|नाम/.test(raw)) {
    return false;
  }
  return true;
}

/** Their own booking’s live add-on. Confirmed only from the LivePuja line item. */
function isOwnLiveBookingQuestion(text) {
  return mentionsLive(text) && mentionsOwnBooking(text);
}

/** A pasted link is handed to a person. What the words mean is left for the model. */
function requiresDirectHumanHandoffText(text) {
  return textContainsExternalLink(text);
}

/** Invoice, bill, or receipt. Always a person — there is no invoice to send from here. */
function isInvoiceRequest(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  if (/\b(invoice|invoices|receipt|receipts|bill|bills)\b/.test(lower)) return true;
  return /इनवॉइस|इनवॉयस|रसीद|बिल/.test(raw);
}

function wantsHuman(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return false;
  if (isInvoiceRequest(text)) return true;
  if (requiresDirectHumanHandoffText(text)) return true;
  if (/^(human|agent|human agent)( please| pls)?$/i.test(raw)) return true;
  if (
    /\b(human|agent|insaan|insan)\b/.test(raw) &&
    /\b(baat|talk|connect|karao|karo|chahiye)\b/.test(raw)
  ) {
    return true;
  }
  return /एजेंट से बात|इंसान से बात/.test(String(text || ''));
}

/** Clear irritation or abuse. Forces a person even if the model picked a booking or a FAQ. */
function isIrritatedOrAngry(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  if (
    /\b(furious|angry|idiot|stupid|fraud|cheat|cheated|useless|bakwas|gussa|abuse|abusing|scam)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  return /गुस्सा|गाली|धोखा|बेवकूफ/.test(raw);
}

function isSankalpOrGotraChangeRequest(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  const target = /\b(gotra|naam|name|sankalp)\b/.test(lower) || /गोत्र|नाम|संकल्प/.test(raw);
  if (!target) return false;
  const changeAction = /\b(change|badal|update|correct|kardo|kar do)\b/.test(lower) || /बदल/.test(raw);
  if (changeAction) return true;
  const describedWrong = /\bgalat\b/.test(lower) || /गलत/.test(raw);
  if (!describedWrong) return false;
  // "The pandit said the name wrong" is about the video, not a change request.
  if (/\b(video|pandit|bola|sunai|stream)\b/.test(lower) || /वीडियो|पंडित|बोला|सुनाई/.test(raw)) {
    return false;
  }
  return true;
}

/** How long the puja lasts. A “when is it” question is a booking lookup, not this. */
function isPujaDurationQuery(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  if (/\b(how long|duration|kitni der|kitne time|kitna time|kitne ghante)\b/.test(lower)) return true;
  if (/कितनी देर|कितने घंटे|कितना समय/.test(raw)) return true;
  return /\b(chalegi|chalti)\b/.test(lower) && /\b(puja|pooja)\b/.test(lower);
}

/**
 * They already got the steps and now want us to do the action.
 * "kaise / how do I" is still a question we should answer.
 */
function insistsAgentPerform(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  if (/\b(kaise|how do i|how to|how can i)\b/.test(lower)) return false;
  if (/\b(tum hi|aap hi|you do it|you yourself)\b/.test(lower)) return true;
  if (/\bkhud\b/.test(lower) && /\b(karo|kardo|kar do|cancel|band)\b/.test(lower)) return true;
  if (
    /\b(tum|aap)\b/.test(lower) &&
    /\b(karo|kardo|kar do|cancel karo|band karo|rok do)\b/.test(lower)
  ) {
    return true;
  }
  if (/\b(cancel|stop|band) (it|this) for me\b/.test(lower)) return true;
  return /तुम ही|आप ही|तुम करो|आप करो|आप कर दो|खुद करो/.test(raw);
}

function autopayFaqId(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  if (!(/\b(autopay|auto[\s-]?pay|mandate)\b/.test(lower) || /ऑटोपे|मंडेट/.test(raw))) return null;
  if (isIrritatedOrAngry(raw)) return null;
  const askingWhy =
    /\b(why|kyu|kyun|kyon|charged|deducted|501|301|701)\b/.test(lower) &&
    !/\b(cancel|stop|band)\b/.test(lower);
  return askingWhy ? 'autopay_501' : 'sub_autopay_cancel_steps';
}

function isDamagedPrasad(text) {
  const lower = String(text || '').toLowerCase();
  const box = /\b(prasad|dabba|box|package)\b/.test(lower) || /प्रसाद|डिब्बा/.test(String(text || ''));
  const broken = /\b(toota|tuta|damaged|broken|kharab)\b/.test(lower) || /टूटा|खराब/.test(String(text || ''));
  return box && broken;
}

function isAddPrasadRequest(text) {
  const lower = String(text || '').toLowerCase();
  return /\b(prasad|box|dabba)\b/.test(lower) && /\badd\b/.test(lower);
}

function isNoBenefitComplaint(text) {
  const lower = String(text || '').toLowerCase();
  return /\b(fayda nahi|koi fayda|no benefit|no effect|kuch nahi hua)\b/.test(lower);
}

function isPaymentFailedBooking(text) {
  const lower = String(text || '').toLowerCase();
  if (/\b(autopay|refund)\b/.test(lower)) return false;
  const money = /\b(payment|paid|paise|paisa)\b/.test(lower);
  const missing = /\b(pending|failed|nahi hui|nahi hua)\b/.test(lower) || /नहीं हुई|नहीं हुआ/.test(String(text || ''));
  return money && missing;
}

function isBookingConfirmedAsk(text) {
  if (isPaymentFailedBooking(text)) return false;
  const lower = String(text || '').toLowerCase();
  return /\b(booking confirm|confirm hai|payment ho chuki|payment ho gayi)\b/.test(lower);
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

/** Very long messages are not a booking-status shortcut. The model reads them. */
function isComplexSupportMessage(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  const words = wordCount(raw);
  if (raw.length > 220 || words > 45) return true;
  return words > 22 && /[.!?।\n]/.test(raw);
}

/** Short, explicit post-booking status questions — safe for keyword "puja/video" routing. */
function isClearPostBookingStatusQuery(text) {
  if (isComplexSupportMessage(text)) return false;
  if (asksAboutMoneyOutcome(text)) return false;
  const lowerEarly = String(text || '').toLowerCase();
  if (/\b(kya karun|kya karu|what should i do|what do i do)\b/.test(lowerEarly)) return false;
  if (/\b(kab hogi|kab hoga|when will)\b/.test(lowerEarly) || /कब होगी|कब होगा/.test(String(text || ''))) {
    return false;
  }
  const raw = String(text || '').trim();
  const lower = raw.toLowerCase();
  const words = wordCount(raw);

  const statusCue =
    /\b(when|kab|status|tracking|aayega|aayegi|aaya|schedule|milega|milegi)\b/.test(
      lower,
    ) ||
    /\b(not arrived|did not arrive|didn't arrive|not received|nahi aaya|nahi aayi|nahi mila)\b/.test(
      lower,
    ) ||
    /कब|समय|ट्रैक|स्टेटस|स्थिति|नहीं आया|नहीं मिला/.test(raw);

  const myBookingCue =
    /\b(when is my|my puja|meri puja|puja kab|video kab|prasad kab|tracking|order status)\b/i.test(
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

/** Schedule, video, or prasad — only what the question names. */
function intentForBookingQuestion(text, classified) {
  if (classified === 'both') return 'both';
  if (isOrderIntent(classified)) return classified;
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  const video = /\b(video|recording)\b/.test(lower) || /वीडियो|विडियो/.test(raw);
  const prasad = /\b(prasad|tracking|courier)\b/.test(lower) || /प्रसाद|ट्रैक/.test(raw);
  if (video && prasad) return 'both';
  if (video) return 'video';
  if (prasad) return 'prasad';
  return 'puja';
}

function classifyIntent(text) {
  if (isOwnLiveBookingQuestion(text)) return 'live';
  if (isComplexSupportMessage(text)) return null;
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

/** Video, prasad, or puja time once a booking is already chosen. */
function followUpOnOpenBooking(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  if (/\b(video|recording)\b/.test(lower) || /वीडियो|विडियो/.test(raw)) return 'video';
  if (/\b(prasad|tracking|courier)\b/.test(lower) || /प्रसाद|ट्रैक/.test(raw)) return 'prasad';
  if (/\blive\b/i.test(raw) || /लाइव/.test(raw)) return 'live';
  if (/\b(puja|pooja|schedule)\b/.test(lower) || /पूजा/.test(raw)) return 'puja';
  return null;
}

function topicSuggestions(lang) {
  if (lang === 'hi') return ['पूजा समय', 'वीडियो', 'प्रसाद'];
  if (lang === 'hinglish') return ['Puja samay', 'Video', 'Prasad'];
  return ['Puja schedule', 'Video', 'Prasad'];
}

module.exports = {
  detectLanguage,
  detectReplyLanguage,
  isPureSocialGreeting,
  isGreetingLike,
  isPureThanks,
  isCatalogueLiveQuestion,
  isOwnLiveBookingQuestion,
  requiresDirectHumanHandoffText,
  hasOtherIndicScript,
  wantsHuman,
  isInvoiceRequest,
  isIrritatedOrAngry,
  isSankalpOrGotraChangeRequest,
  isPujaDurationQuery,
  insistsAgentPerform,
  autopayFaqId,
  isDamagedPrasad,
  isAddPrasadRequest,
  isNoBenefitComplaint,
  isPaymentFailedBooking,
  isBookingConfirmedAsk,
  isRefundOrCancelRequest,
  wantsNoMore,
  wantsYesMore,
  isComplexSupportMessage,
  isClearPostBookingStatusQuery,
  classifyIntent,
  intentForBookingQuestion,
  followUpOnOpenBooking,
  isOrderIntent,
  intentFromTopicChoice,
  topicSuggestions,
  wordCount,
};
