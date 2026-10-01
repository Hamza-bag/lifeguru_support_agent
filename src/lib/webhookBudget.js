/**
 * SalesIQ webhook ~5s total. Mirror/classify timeouts are ceilings; use remaining budget at runtime.
 */
const { tryRulesRoute } = require('../conversation/rulesRoute');
const { shouldSkipLlmClassify, shouldSkipLlmMirror } = require('../conversation/routingGate');
const {
  isOrderIntent,
  isClearPostBookingStatusQuery,
  detectReplyLanguage,
} = require('../conversation/intent');

/** Typical classify + mirror latency (ms) — below ceilings; used for pending auto mode. */
const CLASSIFY_EXPECTED_MS = 2800;
const MIRROR_EXPECTED_MS = 1200;
const HANDLER_BASELINE_MS = 350;

function likelyNeedsAdminFacts(state, text) {
  const stage = state?.stage || 'await_query';
  if (stage === 'select_order' || stage === 'await_booking_number') return true;
  const raw = String(text || '').trim();
  if (!raw) return false;
  // English, Hindi, and Hinglish can be ruled in code. Any other language is
  // decided by the model, which may still need a booking lookup.
  if (detectReplyLanguage(raw).register === 'other') return true;
  return isOrderIntent(raw) || isClearPostBookingStatusQuery(raw);
}

/**
 * Rough upper bound before handler runs — if over budget, use SalesIQ pending + callback.
 */
function estimateSyncTurnMs({ config, state, text }) {
  let ms = HANDLER_BASELINE_MS;
  const st = state || {};

  const rulesHit =
    config.policy?.routingStrategy === 'rules_first' && tryRulesRoute(st, text);
  if (rulesHit) {
    if (rulesHit.route === 'admin') {
      ms += config.db?.queryTimeoutMs || 3000;
      if (config.llmMirrorLanguage && !shouldSkipLlmMirror(st, text)) {
        ms += Math.min(config.llmMirrorTimeoutMs || 6000, 3800);
      }
    } else if (config.llmMirrorLanguage && !shouldSkipLlmMirror(st, text)) {
      ms += MIRROR_EXPECTED_MS;
    }
    return ms;
  }

  if (config.llmClassifyEnabled && !shouldSkipLlmClassify(st, text)) {
    ms += Math.min(config.llmClassifyTimeoutMs || 4500, CLASSIFY_EXPECTED_MS);
  }

  if (likelyNeedsAdminFacts(st, text)) {
    ms += config.db?.queryTimeoutMs || 3000;
  }

  if (config.llmMirrorLanguage && !shouldSkipLlmMirror(st, text)) {
    ms += Math.min(config.llmMirrorTimeoutMs || 6000, MIRROR_EXPECTED_MS);
  }

  return ms;
}

function syncWebhookBudgetMs(config) {
  return (config.webhookBudgetMs || 5000) - (config.webhookReserveMs || 250);
}

function mirrorTimeoutMs({ config, webhookStartedAt, minMs = 800 }) {
  const ceiling = config.llmMirrorTimeoutMs || 4500;
  const budget = config.webhookBudgetMs || 4800;
  const reserve = config.webhookReserveMs || 250;
  if (!webhookStartedAt) return ceiling;
  const elapsed = Date.now() - webhookStartedAt;
  const remaining = budget - elapsed - reserve;
  if (remaining < minMs) return 0;
  return Math.min(ceiling, remaining);
}

module.exports = {
  mirrorTimeoutMs,
  estimateSyncTurnMs,
  syncWebhookBudgetMs,
};
