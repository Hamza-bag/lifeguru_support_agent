const { geminiGenerateJson } = require('./geminiJson');
const { isGeminiCircuitOpen } = require('./geminiCircuit');
const config = require('../config');
const {
  detectLanguage,
  classifyIntent,
  isOrderIntent,
  isComplexSupportMessage,
  isRefundOrCancelRequest,
  isIrritatedOrAngry,
  isInvoiceRequest,
} = require('../conversation/intent');
const { classifyRulesBlockForPrompt } = require('../content/loadContent');
const { faqById } = require('../faq/faqLookup');
const { faqCatalogForLlm } = require('../faq/faqSelect');
const { chooseOrderLookup } = require('../orders/orderLookup');

const VALID_ROUTES = new Set([
  'admin',
  'faq',
  'human',
  'clarify',
  'sankalp_change',
  'booking_handoff',
]);
const VALID_INTENTS = new Set(['puja', 'video', 'prasad', 'both', null]);

function buildClassifyPrompt(userText, recentConversation = '', catalog = []) {
  const contextBlock = recentConversation
    ? `\nRecent conversation (oldest first):\n${recentConversation}\n`
    : '';
  const catalogBlock = catalog.length
    ? `\nKnowledge-base catalog (use an id only when route is "faq"). Match the customer's meaning to the question. Use the cue only when two questions are close. Never invent an id.\n${catalog
        .map((c) => `- ${c.id} | ${c.ask || c.cue} | ${c.cue}`)
        .join('\n')}\n`
    : '';
  return `${classifyRulesBlockForPrompt()}You are LifeGuru's customer support router. The person messaging is a LifeGuru customer asking about Mandir Puja, Chadhava, or their booking. Output JSON only — no chat reply.

{
  "language": "en" | "hi" (template hint only — user may write any language; routing must still work),
  "route": "admin" | "faq" | "human" | "clarify" | "sankalp_change" | "booking_handoff",
  "intent": "puja" | "video" | "prasad" | "both" | null,
  "faqId": "<catalog id>" | null,
  "orderLookup": "latest" | "first" | "on_date" | "between" | "puja_on" | null,
  "orderDate": "YYYY-MM-DD" | null,
  "orderDateFrom": "YYYY-MM-DD" | null,
  "orderDateTo": "YYYY-MM-DD" | null,
  "reason": "short internal note"
}

Scope (LifeGuru only):
- IN scope: their puja/chadhava booking, schedule, video, prasad, payment/autopay questions, app, booking links, sankalp info.
- OUT of scope (coding, homework, jokes, other brands, general AI chit-chat): route "clarify" if they might need puja help; route "human" if clearly unrelated spam/abuse.

Routes:
- "admin" + intent: THEIR booking lookup — puja time, video status, prasad/tracking (any language: Hindi, Hinglish, Marathi, Gujarati, Bengali, Tamil, Telugu, US English, etc. — if intent is clear).
- On "admin", set orderLookup when they name which booking. Otherwise null (we load the latest 3).
  latest = most recent one. first = earliest ever. null = latest 3 bookings.
  on_date = booked on orderDate. between = booked from orderDateFrom through orderDateTo.
  puja_on = puja scheduled on orderDate (not the booking date). Dates are YYYY-MM-DD only. Never invent a date.
- "faq": LifeGuru policy/how-to, no order lookup (autopay explainer, how to book, want to book/get puja done — not existing order status). When route is "faq", set faqId to one catalog id that matches the question. For every other route, faqId must be null. Never invent an id.
- "human": complaint, fraud, media/screenshot, video delay insist/anger, sensitive; long emotional life/business distress; custom sales guarantees or partner money disputes; health/family hardship — even if they mention puja/₹51/sankalp. Also human when they want a person, even if a word is misspelled (for example a transfer or connect request). Read the meaning, not the exact spelling.
- A refund or cancellation of a booking is not "human" yet. Route "booking_handoff" so we ask which booking first, then connect them.
- A question about whether a puja brings money, profit, or a guaranteed result is "faq". Pick the catalog card. It is not "booking_handoff".
- Name or gotra change is not "human" yet. Route "sankalp_change" so we ask which booking first. The team checks whether that booking can still be changed.
- NOT "admin": they want help opening a business, minimum sales promises, or puja "so business runs" — that is human, not booking status lookup.
- "clarify": hi/hello only, vague "help", or ambiguous (one short routing step — never answer off-topic).

Video: status → admin/video; insist/angry → human.

Never invent order IDs or dates. Never answer the user — JSON only.
Use the full conversation when the latest message is short or refers to earlier lines (e.g. "that one", "jaldi", order numbers).
${catalogBlock}${contextBlock}
Current user message (may combine several lines sent together):
${JSON.stringify(String(userText || ''))}`;
}

function acceptedFaqId(route, rawId) {
  if (route !== 'faq') return null;
  const id = rawId == null ? '' : String(rawId).trim();
  if (!id || id === 'null') return null;
  return faqById(id, 'en') ? id : null;
}

function preferBookingHandoff(result, userText) {
  if (!isRefundOrCancelRequest(userText)) return result;
  return { ...result, route: 'booking_handoff', intent: 'human', faqId: null };
}

function preferDirectHuman(result, userText) {
  if (isInvoiceRequest(userText)) {
    return {
      ...result,
      route: 'human',
      intent: null,
      faqId: null,
      empathetic: false,
      reason: 'invoice_override',
    };
  }
  if (!isIrritatedOrAngry(userText)) return result;
  return {
    ...result,
    route: 'human',
    intent: null,
    faqId: null,
    empathetic: true,
    reason: 'abuse_override',
  };
}

function normalizeClassifyResult(parsed, userText) {
  return preferDirectHuman(preferBookingHandoff(buildClassifyResult(parsed, userText), userText), userText);
}

function buildClassifyResult(parsed, userText) {
  const fallbackLang = detectLanguage(userText);
  if (!parsed || typeof parsed !== 'object') {
    if (isComplexSupportMessage(userText)) {
      return {
        language: fallbackLang,
        route: 'human',
        intent: null,
        reason: 'complex_rules_fallback_human',
        usedLlm: false,
        empathetic: true,
      };
    }
    const intent = classifyIntent(userText);
    return {
      language: fallbackLang,
      route: isOrderIntent(intent) ? 'admin' : 'clarify',
      intent: intent || null,
      reason: 'rules_fallback',
      usedLlm: false,
    };
  }

  const language = parsed.language === 'hi' ? 'hi' : parsed.language === 'en' ? 'en' : fallbackLang;
  let route = VALID_ROUTES.has(parsed.route) ? parsed.route : 'clarify';
  let intent =
    parsed.intent === null || parsed.intent === 'null'
      ? null
      : VALID_INTENTS.has(parsed.intent)
        ? parsed.intent
        : classifyIntent(userText);

  const orderLookup = chooseOrderLookup(parsed, userText);
  if (route === 'admin' && !isOrderIntent(intent)) {
    if (orderLookup?.key) {
      intent = 'both';
    } else {
      intent = classifyIntent(userText);
      if (!isOrderIntent(intent)) {
        route = 'clarify';
      }
    }
  }

  let empathetic = false;
  if (isComplexSupportMessage(userText) && route === 'admin') {
    route = 'human';
    intent = null;
    empathetic = true;
  }

  const out = {
    language,
    route,
    intent: isOrderIntent(intent) ? intent : null,
    faqId: acceptedFaqId(route, parsed.faqId),
    reason: String(parsed.reason || '').slice(0, 120),
    usedLlm: true,
  };
  if (out.route === 'admin' && orderLookup?.key) out.orderLookup = orderLookup;
  if (empathetic) {
    out.empathetic = true;
    out.reason = `${out.reason || 'llm'}_complex_override`.slice(0, 120);
  }
  return out;
}

async function classifyUserMessage({ apiKey, model, userText, recentConversation = '' }) {
  const text = String(userText || '').trim();
  if (!text) {
    return {
      language: 'en',
      route: 'clarify',
      intent: null,
      reason: 'empty',
      usedLlm: false,
    };
  }
  if (!apiKey) {
    return normalizeClassifyResult(null, text);
  }

  if (isGeminiCircuitOpen()) {
    return {
      ...normalizeClassifyResult(null, text),
      reason: 'gemini_circuit_open',
      llmError: true,
      geminiStatus: 429,
    };
  }

  const catalog = config.llmFaqSelectEnabled ? faqCatalogForLlm() : [];
  const gemini = await geminiGenerateJson({
    apiKey,
    model,
    prompt: buildClassifyPrompt(text, recentConversation, catalog),
    timeoutMs: config.llmClassifyTimeoutMs,
  });
  if (!gemini?.ok) {
    return {
      ...normalizeClassifyResult(null, text),
      reason: 'llm_unavailable_rules_fallback',
      llmError: true,
      geminiStatus: gemini?.status || 0,
      geminiReason: gemini?.reason || null,
    };
  }
  return { ...normalizeClassifyResult(gemini.data, text), llmError: false };
}

module.exports = {
  buildClassifyPrompt,
  normalizeClassifyResult,
  classifyUserMessage,
};
