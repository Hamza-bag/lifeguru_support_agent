const policy = require('../config/policy');
const { whichPujaFaqId } = require('../faq/whichPuja');
const {
  detectLanguage,
  classifyIntent,
  isOrderIntent,
  isNewBookingQuery,
  isComplexSupportMessage,
  isSpiritualPujaRecommendationQuery,
  needsEmpatheticHumanHandoff,
  intentFromTopicChoice,
  isPureSocialGreeting,
  isPureThanks,
  requiresDirectHumanHandoffText,
  autopayFaqId,
  isCatalogueLiveQuestion,
} = require('./intent');

function isVagueHelpOnly(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (raw.length < 3) return true;
  return /^(help|madad|hlp)$/.test(raw);
}

function resolveRulesIntent(state, queryText) {
  return (
    state.pendingIntent ||
    intentFromTopicChoice(queryText) ||
    classifyIntent(queryText)
  );
}

/**
 * Fast path for production spikes — no Gemini. Returns null if LLM should run.
 */
function tryRulesRoute(state, queryText) {
  const lang = state.language || detectLanguage(queryText);

  const whichPuja = whichPujaFaqId(queryText);
  if (whichPuja && policy.faqEnabled) {
    return {
      language: lang,
      route: 'faq',
      intent: null,
      faqId: whichPuja,
      reason: `rules_${whichPuja}`,
      usedLlm: false,
      llmError: false,
    };
  }

  if (isSpiritualPujaRecommendationQuery(queryText) && policy.faqEnabled) {
    return {
      language: lang,
      route: 'faq',
      intent: null,
      reason: 'rules_spiritual_faq',
      usedLlm: false,
      llmError: false,
    };
  }

  if (needsEmpatheticHumanHandoff(queryText)) {
    return {
      language: lang,
      route: 'human',
      intent: 'human',
      reason: 'rules_complex_human',
      usedLlm: false,
      llmError: false,
      empathetic: true,
    };
  }

  if (isComplexSupportMessage(queryText)) {
    return null;
  }

  if (requiresDirectHumanHandoffText(queryText)) {
    return {
      language: lang,
      route: 'human',
      intent: 'human',
      reason: 'rules_direct_human',
      usedLlm: false,
      llmError: false,
    };
  }

  const intent = resolveRulesIntent(state, queryText);

  if (intent === 'human') {
    return {
      language: lang,
      route: 'human',
      intent: 'human',
      reason: 'rules_human',
      usedLlm: false,
      llmError: false,
    };
  }

  const autopayId = autopayFaqId(queryText);
  if (autopayId && policy.faqEnabled) {
    return {
      language: lang,
      route: 'faq',
      intent: null,
      faqId: autopayId,
      reason: `rules_${autopayId}`,
      usedLlm: false,
      llmError: false,
    };
  }

  if (isCatalogueLiveQuestion(queryText) && policy.faqEnabled) {
    return {
      language: lang,
      route: 'faq',
      intent: null,
      faqId: 'live_puja_not_available',
      reason: 'rules_live_catalogue',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isNewBookingQuery(queryText)) {
    return {
      language: lang,
      route: 'faq',
      intent: null,
      reason: 'rules_new_booking',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isOrderIntent(intent)) {
    return {
      language: lang,
      route: 'admin',
      intent,
      reason: 'rules_intent',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isPureThanks(queryText)) {
    return {
      language: lang,
      route: 'thanks',
      intent: null,
      reason: 'rules_thanks',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isPureSocialGreeting(queryText)) {
    return {
      language: lang,
      route: 'welcome',
      intent: null,
      reason: 'rules_welcome',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isVagueHelpOnly(queryText)) {
    return {
      language: lang,
      route: 'clarify',
      intent: null,
      reason: 'rules_help',
      usedLlm: false,
      llmError: false,
    };
  }

  return null;
}

module.exports = { tryRulesRoute, isVagueHelpOnly, resolveRulesIntent };
