require('dotenv').config();

const parseBool = (value, fallback) => {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
};

const unescapePem = (value) =>
  String(value || '')
    .replace(/\\n/g, '\n')
    .trim();

module.exports = {
  port: Number(process.env.PORT) || 3080,
  verifySignature: parseBool(process.env.SALESIQ_VERIFY_SIGNATURE, false),
  salesIqPublicKey: unescapePem(process.env.SALESIQ_PUBLIC_KEY),
  factsMode: process.env.FACTS_MODE === 'http' ? 'http' : 'mock',
  factsApiUrl: (process.env.FACTS_API_URL || '').replace(/\/$/, ''),
  factsApiSecret: process.env.FACTS_API_SECRET || '',
  factsApiTimeoutMs: Number(process.env.FACTS_API_TIMEOUT_MS) || 1200,
  logPayloads: parseBool(
    process.env.LOG_PAYLOADS,
    process.env.NODE_ENV !== 'test',
  ),
  captureSalesIqSample: parseBool(process.env.SALESIQ_CAPTURE_SAMPLE, true),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_SUPPORT_MODEL || 'gemini-2.5-flash-lite',
  llmClassifyTimeoutMs: Number(process.env.SUPPORT_LLM_CLASSIFY_TIMEOUT_MS) || 4500,
  /** Rewrite template replies in the user's language/register (Hinglish, polite tone). */
  llmMirrorLanguage: parseBool(
    process.env.SUPPORT_LLM_MIRROR_LANGUAGE,
    process.env.NODE_ENV !== 'test' && Boolean(process.env.GEMINI_API_KEY),
  ),
  /** Max wait for mirror Gemini (ms); webhook caps to time left under SUPPORT_WEBHOOK_BUDGET_MS. */
  llmMirrorTimeoutMs: Number(process.env.SUPPORT_LLM_MIRROR_TIMEOUT_MS) || 6000,
  /** Total handler budget (SalesIQ ~5000ms). Mirror uses what remains after classify + Admin. */
  webhookBudgetMs: Number(process.env.SUPPORT_WEBHOOK_BUDGET_MS) || 5000,
  webhookReserveMs: Number(process.env.SUPPORT_WEBHOOK_RESERVE_MS) || 250,
  llmClassifyEnabled:
    process.env.NODE_ENV === 'test'
      ? false
      : parseBool(
          process.env.SUPPORT_LLM_CLASSIFY,
          Boolean(process.env.GEMINI_API_KEY),
        ),
  policy: require('./config/policy'),
  sessionStore: (process.env.SESSION_STORE || 'memory').toLowerCase(),
  burstMergeRouting: parseBool(process.env.SUPPORT_BURST_MERGE_ROUTING, true),
  /** Reply pending within 5s; finish via SalesIQ callback API (needs OAuth + screen name). */
  salesIqPendingEnabled: parseBool(process.env.SUPPORT_SALESIQ_PENDING, false),
  salesIqApiBase: (process.env.SALESIQ_API_BASE || '').replace(/\/$/, ''),
  salesIqScreenName: process.env.SALESIQ_SCREEN_NAME || '',
  salesIqOauthToken: process.env.SALESIQ_OAUTH_TOKEN || '',
  /** Mirror timeout when using async callback (not capped by 5s webhook). */
  asyncMirrorTimeoutMs: Number(process.env.SUPPORT_ASYNC_MIRROR_TIMEOUT_MS) || 12000,
};
