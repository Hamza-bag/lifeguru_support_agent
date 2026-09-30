const { geminiGenerateJson } = require('./geminiJson');
const { isGeminiCircuitOpen } = require('./geminiCircuit');
const config = require('../config');
const {
  detectLanguage,
  classifyIntent,
  isOrderIntent,
  isComplexSupportMessage,
} = require('../conversation/intent');
const { classifyRulesBlockForPrompt } = require('../content/loadContent');
const { faqById } = require('../faq/faqLookup');
const { faqCatalogForLlm } = require('../faq/faqSelect');

const VALID_ROUTES = new Set(['admin', 'faq', 'human', 'clarify']);
const VALID_INTENTS = new Set(['puja', 'video', 'prasad', 'both', null]);

function buildClassifyPrompt(userText, recentConversation = '', catalog = []) {
  const contextBlock = recentConversation
    ? `\nRecent conversation (oldest first):\n${recentConversation}\n`
    : '';
  const catalogBlock = catalog.length
    ? `\nKnowledge-base catalog (use an id only when route is "faq"):\n${catalog
        .map((c) => `- ${c.id}: ${c.hint}`)
        .join('\n')}\n`
    : '';
  return `${classifyRulesBlockForPrompt()}You are a router ONLY for LifeGuru WhatsApp support (Mandir Puja, Chadhava, bookings). Output JSON only — no chat, no advice outside LifeGuru.

{
  "language": "en" | "hi" (template hint only — user may write any language; routing must still work),
  "route": "admin" | "faq" | "human" | "clarify",
  "intent": "puja" | "video" | "prasad" | "both" | null,
  "faqId": "<catalog id>" | null,
  "reason": "short internal note"
}

Scope (LifeGuru only):
- IN scope: their puja/chadhava booking, schedule, video, prasad, payment/autopay questions, app, booking links, sankalp info.
- OUT of scope (coding, homework, jokes, other brands, general AI chit-chat): route "clarify" if they might need puja help; route "human" if clearly unrelated spam/abuse.

Routes:
- "admin" + intent: THEIR booking lookup — puja time, video status, prasad/tracking (any language: Hindi, Hinglish, Marathi, Gujarati, Bengali, Tamil, Telugu, US English, etc. — if intent is clear).
- "faq": LifeGuru policy/how-to, no order lookup (autopay explainer, how to book, want to book/get puja done — not existing order status). When route is "faq", set faqId to one catalog id that matches the question. For every other route, faqId must be null. Never invent an id.
- "human": refund, complaint, fraud, naam/gotra CHANGE on order, media/screenshot, video delay insist/anger, sensitive; long emotional life/business distress; custom sales guarantees or partner money disputes; health/family hardship — even if they mention puja/₹51/sankalp.
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

function normalizeClassifyResult(parsed, userText) {
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

  if (route === 'admin' && !isOrderIntent(intent)) {
    intent = classifyIntent(userText);
    if (!isOrderIntent(intent)) {
      route = 'clarify';
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
