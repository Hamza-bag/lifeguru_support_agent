const { shouldSkipLlmMirror } = require('../conversation/routingGate');
const { tryRulesRoute } = require('../conversation/rulesRoute');
const { salesIqRequestId } = require('./requestId');

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

  // Fast rules/FAQ/Admin routes need at most one mirror call and normally fit
  // synchronously. Reserve pending for ambiguous turns that need classify first.
  if (
    config.policy?.routingStrategy === 'rules_first' &&
    tryRulesRoute(state || {}, text)
  ) {
    return false;
  }

  return true;
}

function pendingWaitReply(lang) {
  if (lang === 'hi') {
    return 'एक पल — आपकी बुकिंग देख रहे हैं…';
  }
  return 'One moment — checking your booking…';
}

module.exports = { shouldUseAsyncWebhook, pendingWaitReply };
