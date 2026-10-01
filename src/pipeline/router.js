const config = require('../config');
const policy = require('../config/policy');
const { classifyUserMessage, normalizeClassifyResult } = require('../llm/classify');
const { shouldSkipLlmClassify } = require('../conversation/routingGate');
const { tryRulesRoute } = require('../conversation/rulesRoute');
const { isGeminiCircuitOpen } = require('../llm/geminiCircuit');
const { formatRecentForClassify } = require('../conversation/chatContext');
const { faqById, resolveFaq } = require('../faq/matchFaq');
const {
  detectLanguage,
  wantsHuman,
  isRefundOrCancelRequest,
  classifyIntent,
  isOrderIntent,
  intentFromTopicChoice,
} = require('../conversation/intent');
const { t } = require('../conversation/copy');
const { reply, forward, forwardUnclear, askMoreSuggestions } = require('./responses');
const { parseOrderLookup } = require('../orders/orderLookup');

function resolveIntent(state, queryText) {
  return (
    state.pendingIntent ||
    intentFromTopicChoice(queryText) ||
    classifyIntent(queryText)
  );
}

function classifyMetaFrom(c, fallbackReason) {
  if (!c) {
    return {
      usedLlmClassify: false,
      route: null,
      intent: null,
      reason: fallbackReason || 'no_classify',
      llmError: false,
    };
  }
  return {
    usedLlmClassify: Boolean(c.usedLlm && !c.llmError),
    route: c.route,
    intent: c.intent ?? null,
    faqId: c.faqId || null,
    reason: c.reason || fallbackReason || '',
    llmError: Boolean(c.llmError),
    geminiStatus: c.geminiStatus ?? null,
    geminiReason: c.geminiReason ?? null,
  };
}

function applyClassifyResult(next, lang, c) {
  const meta = classifyMetaFrom(c);
  // Language detection from the actual user text owns template locale.
  // Gemini's en/hi value is only a fallback hint and must not change register.
  next = { ...next, language: next.language || lang || c.language };
  if (c.route === 'sankalp_change') {
    return { state: next, route: 'sankalp_change', intent: null, classifyMeta: meta };
  }
  if (c.route === 'booking_handoff') {
    return { state: next, route: 'booking_handoff', intent: 'human', classifyMeta: meta };
  }
  if (c.route === 'human') {
    return {
      state: next,
      route: 'human',
      intent: 'human',
      llmError: Boolean(c.llmError),
      classifyMeta: { ...meta, empathetic: Boolean(c.empathetic) },
    };
  }
  if (c.route === 'faq') {
    return { state: next, route: 'faq', intent: null, classifyMeta: meta };
  }
  if (c.route === 'welcome') {
    return { state: next, route: 'welcome', intent: null, classifyMeta: meta };
  }
  if (c.route === 'thanks') {
    return { state: next, route: 'thanks', intent: null, classifyMeta: meta };
  }
  if (c.route === 'clarify' || !isOrderIntent(c.intent)) {
    return { state: next, route: 'clarify', intent: c.intent, classifyMeta: meta };
  }
  const orderLookup = c.orderLookup?.key ? c.orderLookup : null;
  return {
    state: { ...next, orderLookup },
    route: 'admin',
    intent: c.intent,
    orderLookup,
    classifyMeta: meta,
  };
}

function withClassifyMeta(response, meta) {
  if (!meta) return response;
  return { ...response, classifyMeta: meta };
}

function faqAnswer(lang, text) {
  return reply(`${text}\n\n${t(lang, 'askMore')}`, { suggestions: askMoreSuggestions(lang) });
}

function rememberFaq(state, faqId) {
  const same = state.lastFaqId === faqId;
  return {
    ...state,
    lastFaqId: faqId,
    faqRepeatCount: same ? (state.faqRepeatCount || 0) + 1 : 1,
  };
}

function answeredFaq(state, lang, picked, meta) {
  const remembered = rememberFaq(state, picked.id);
  if (picked.handoff) {
    return {
      state: { ...remembered, stage: 'ask_more', askMoreAttempts: 0, handoffEscalation: picked.id },
      response: withClassifyMeta(
        { action: 'forward', replies: [`${picked.text}\n\n${t(lang, 'forward')}`] },
        { ...meta, route: 'human', reason: `faq_handoff:${picked.id}` },
      ),
    };
  }
  return {
    state: { ...remembered, stage: 'ask_more', askMoreAttempts: 0 },
    response: withClassifyMeta(faqAnswer(lang, picked.text), meta),
  };
}

async function replyFromFaq(state, userText, faqId = null) {
  const lang = state.language || 'en';
  const whichId = String(faqId || '').startsWith('which_puja_') ? faqId : null;
  if (whichId) {
    const picked = faqById(whichId, lang);
    if (picked) {
      return answeredFaq(state, lang, picked, {
        route: 'faq',
        intent: null,
        reason: `faq:${picked.id}`,
        usedLlmClassify: false,
      });
    }
  }
  if (!policy.faqEnabled) {
    return { state, response: withClassifyMeta(forward(lang), { route: 'faq', reason: 'faq_disabled' }) };
  }
  const hit = resolveFaq(userText, lang, faqId);
  if (!hit) {
    return { state, response: withClassifyMeta(forwardUnclear(lang), { route: 'faq', reason: 'no_faq_match' }) };
  }
  const reason =
    hit.matchMethod === 'llm' ? hit.reason || `llm_faq:${hit.id}` : `faq:${hit.id}`;
  return answeredFaq(state, lang, hit, {
    route: 'faq',
    intent: null,
    reason,
    usedLlmClassify: hit.matchMethod === 'llm',
  });
}

function blockRepeatedFaq(state, result) {
  if (!result || result.route !== 'faq') return result;
  const faqId = result.classifyMeta?.faqId;
  if (!faqId || state.lastFaqId !== faqId || (state.faqRepeatCount || 0) < 2) return result;
  return {
    ...result,
    route: 'human',
    intent: 'human',
    classifyMeta: {
      ...result.classifyMeta,
      route: 'human',
      faqId: null,
      reason: 'faq_repeat',
    },
  };
}

async function applyRouting(state, queryText) {
  const lang = state.language || detectLanguage(queryText);
  let next = { ...state, language: lang };

  if (isRefundOrCancelRequest(queryText)) {
    return {
      state: next,
      route: 'booking_handoff',
      intent: 'human',
      classifyMeta: classifyMetaFrom(null, 'booking_handoff'),
    };
  }

  if (wantsHuman(queryText)) {
    return {
      state: next,
      route: 'human',
      intent: 'human',
      classifyMeta: classifyMetaFrom(null, 'keyword_human'),
    };
  }

  if (policy.routingStrategy === 'rules_first') {
    const rulesHit = tryRulesRoute(state, queryText);
    if (rulesHit) {
      return blockRepeatedFaq(next, applyClassifyResult(next, lang, rulesHit));
    }
  }

  const recentConversation = formatRecentForClassify(state);
  const mayCallLlm =
    config.llmClassifyEnabled &&
    config.geminiApiKey &&
    !shouldSkipLlmClassify(state, queryText) &&
    !isGeminiCircuitOpen();

  if (mayCallLlm) {
    const c = await classifyUserMessage({
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
      userText: queryText,
      recentConversation,
    });
    return blockRepeatedFaq(next, applyClassifyResult(next, lang, c));
  }

  if (
    config.llmClassifyEnabled &&
    config.geminiApiKey &&
    !shouldSkipLlmClassify(state, queryText) &&
    isGeminiCircuitOpen()
  ) {
    const c = {
      ...normalizeClassifyResult(null, queryText),
      reason: 'gemini_circuit_open',
      llmError: true,
      geminiStatus: 429,
    };
    return applyClassifyResult(next, lang, c);
  }

  const intent = resolveIntent(state, queryText);
  if (intent === 'human') {
    return {
      state: next,
      route: 'human',
      intent: 'human',
      classifyMeta: classifyMetaFrom(null, 'rules_human'),
    };
  }
  if (!isOrderIntent(intent)) {
    return {
      state: next,
      route: 'clarify',
      intent: null,
      classifyMeta: classifyMetaFrom(null, 'rules_clarify'),
    };
  }
  const lookup = parseOrderLookup(queryText);
  const orderLookup = lookup?.key ? lookup : null;
  return {
    state: { ...next, orderLookup },
    route: 'admin',
    intent,
    orderLookup,
    classifyMeta: {
      usedLlmClassify: false,
      route: 'admin',
      intent,
      reason: 'rules',
      llmError: false,
    },
  };
}

module.exports = {
  resolveIntent,
  classifyMetaFrom,
  applyClassifyResult,
  withClassifyMeta,
  replyFromFaq,
  applyRouting,
};
