const { shouldSkipLlmMirror } = require('../conversation/routingGate');
const { tryRulesRoute } = require('../conversation/rulesRoute');
const { salesIqRequestId } = require('./payload');
const { estimateSyncTurnMs, syncWebhookBudgetMs } = require('../lib/webhookBudget');

/**
 * Use SalesIQ pending + callback when sync 5s budget would drop mirror after classify.
 */
function shouldUseAsyncWebhook({ config, callbackClient, payload, text, state, isNewChat }) {
  if (!config.salesIqPendingEnabled) return false;
  if (!callbackClient?.isConfigured?.()) return false;
  if (!text || !String(text).trim()) return false;
  if (isNewChat && !text) return false;
  if (payload?.handler === 'failure') return false;
  if (!salesIqRequestId(payload)) return false;

  if (!config.llmMirrorLanguage && !config.llmClassifyEnabled) return false;

  const skipMirror = state && shouldSkipLlmMirror(state, text);
  if (skipMirror) return false;

  const rulesHit =
    config.policy?.routingStrategy === 'rules_first' &&
    tryRulesRoute(state || {}, text);
  // FAQ / human / clarify from rules fit sync; admin may still need facts + mirror.
  if (rulesHit && rulesHit.route !== 'admin') {
    return false;
  }

  if (config.salesIqPendingMode === 'auto') {
    const budget = syncWebhookBudgetMs(config);
    const estimate = estimateSyncTurnMs({ config, state, text });
    return estimate > budget;
  }

  return config.salesIqPendingMode === 'always';
}

function pendingWaitReply(lang) {
  if (lang === 'hi') return 'एक पल — हम आपकी मदद कर रहे हैं…';
  if (lang === 'hinglish') return 'Ek pal — aapki madad kar rahe hain…';
  return 'One moment — getting that for you…';
}

module.exports = { shouldUseAsyncWebhook, pendingWaitReply };
