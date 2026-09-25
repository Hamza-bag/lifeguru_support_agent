const policy = require('../config/policy');
const { matchFaq } = require('../faq/matchFaq');
const {
  detectLanguage,
  classifyIntent,
  isOrderIntent,
  isNewBookingQuery,
  isComplexSupportMessage,
  needsEmpatheticHumanHandoff,
  intentFromTopicChoice,
  isPureSocialGreeting,
  isPureThanks,
  requiresDirectHumanHandoffText,
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

  if (policy.faqEnabled && matchFaq(queryText, lang)) {
    return {
      language: lang,
      route: 'faq',
      intent: null,
      reason: 'rules_faq',
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
