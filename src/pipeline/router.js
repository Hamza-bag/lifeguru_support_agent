const config = require('../config');
const policy = require('../config/policy');
const { classifyUserMessage, normalizeClassifyResult } = require('../llm/classify');
const { shouldSkipLlmClassify } = require('../conversation/routingGate');
const { tryRulesRoute } = require('../conversation/rulesRoute');
const { isGeminiCircuitOpen } = require('../llm/geminiCircuit');
const { formatRecentForClassify } = require('../conversation/chatContext');
const { faqById, resolveFaq } = require('../faq/matchFaq');
const { whichPujaFaqId } = require('../faq/whichPuja');
const {
  detectLanguage,
  isNewBookingQuery,
  wantsHuman,
  classifyIntent,
  isOrderIntent,
  intentFromTopicChoice,
  needsEmpatheticHumanHandoff,
  isSpiritualPujaRecommendationQuery,
} = require('../conversation/intent');
const { t } = require('../conversation/copy');
const { reply, forward, askMoreSuggestions } = require('./responses');

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
  return { state: next, route: 'admin', intent: c.intent, classifyMeta: meta };
}

function withClassifyMeta(response, meta) {
  if (!meta) return response;
  return { ...response, classifyMeta: meta };
}

async function replyFromFaq(state, userText, faqId = null) {
  const lang = state.language || 'en';
  const whichId = whichPujaFaqId(userText) || (String(faqId || '').startsWith('which_puja_') ? faqId : null);
  if (whichId) {
    const picked = faqById(whichId, lang);
    if (picked) {
      return {
        state: { ...state, stage: 'ask_more', askMoreAttempts: 0 },
        response: withClassifyMeta(
          reply([picked.text, t(lang, 'askMore')], { suggestions: askMoreSuggestions(lang) }),
          { route: 'faq', intent: null, reason: `faq:${picked.id}`, usedLlmClassify: false },
        ),
      };
    }
  }
  if (isNewBookingQuery(userText)) {
    const hit = faqById('how_to_book', lang);
    if (hit) {
      return {
        state: { ...state, stage: 'ask_more', askMoreAttempts: 0 },
        response: withClassifyMeta(
          reply([hit.text, t(lang, 'askMore')], { suggestions: askMoreSuggestions(lang) }),
          { route: 'faq', intent: null, reason: `faq:${hit.id}`, usedLlmClassify: false },
        ),
      };
    }
  }
  if (!policy.faqEnabled) {
    return { state, response: withClassifyMeta(forward(lang), { route: 'faq', reason: 'faq_disabled' }) };
  }
  if (isSpiritualPujaRecommendationQuery(userText)) {
    const spiritual = faqById('spiritual_choose_puja_devotion', lang);
    if (spiritual) {
      return {
        state: { ...state, stage: 'ask_more', askMoreAttempts: 0 },
        response: withClassifyMeta(
          reply([spiritual.text, t(lang, 'askMore')], { suggestions: askMoreSuggestions(lang) }),
          { route: 'faq', intent: null, reason: `faq:${spiritual.id}`, usedLlmClassify: false },
        ),
      };
    }
  }
  const hit = resolveFaq(userText, lang, faqId);
  if (!hit) {
    return { state, response: withClassifyMeta(forward(lang), { route: 'faq', reason: 'no_faq_match' }) };
  }
  const reason =
    hit.matchMethod === 'llm' ? hit.reason || `llm_faq:${hit.id}` : `faq:${hit.id}`;
  return {
    state: { ...state, stage: 'ask_more', askMoreAttempts: 0 },
    response: withClassifyMeta(
      reply([hit.text, t(lang, 'askMore')], { suggestions: askMoreSuggestions(lang) }),
      { route: 'faq', intent: null, reason, usedLlmClassify: hit.matchMethod === 'llm' },
    ),
  };
}

async function applyRouting(state, queryText) {
  const lang = state.language || detectLanguage(queryText);
  let next = { ...state, language: lang };

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
      return applyClassifyResult(next, lang, rulesHit);
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
    return applyClassifyResult(next, lang, c);
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
    if (needsEmpatheticHumanHandoff(queryText)) {
      return {
        state: next,
        route: 'human',
        intent: 'human',
        classifyMeta: classifyMetaFrom(null, 'rules_complex_human'),
      };
    }
    return {
      state: next,
      route: 'clarify',
      intent: null,
      classifyMeta: classifyMetaFrom(null, 'rules_clarify'),
    };
  }
  return {
    state: next,
    route: 'admin',
    intent,
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
