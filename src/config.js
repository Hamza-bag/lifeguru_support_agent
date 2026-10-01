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
  /** Phase 1: dev admin DB creds (SUPPORT_DB_* or legacy DB_*). Phase 2: read replica + support_agent_ro. */
  db: {
    host: process.env.SUPPORT_DB_HOST || process.env.DB_HOST || '',
    port: Number(process.env.SUPPORT_DB_PORT || process.env.DB_PORT) || 5432,
    user: process.env.SUPPORT_DB_USER || process.env.DB_USER || '',
    password: process.env.SUPPORT_DB_PASS || process.env.DB_PASS || '',
    database: process.env.SUPPORT_DB_NAME || process.env.DB_NAME || '',
    poolMax: Number(process.env.SUPPORT_DB_POOL_MAX || process.env.DB_POOL_MAX) || 5,
    connectionTimeoutMs: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 8000,
    queryTimeoutMs:
      Number(process.env.SUPPORT_DB_QUERY_TIMEOUT_MS || process.env.DB_QUERY_TIMEOUT_MS) ||
      3000,
  },
  logPayloads: parseBool(
    process.env.LOG_PAYLOADS,
    process.env.NODE_ENV !== 'test',
  ),
  captureSalesIqSample: parseBool(process.env.SALESIQ_CAPTURE_SAMPLE, true),
  /** Capture-only SalesIQ listener. Off unless explicitly enabled (public URL). */
  supportDevShadow: parseBool(process.env.SUPPORT_DEV_SHADOW, false),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_SUPPORT_MODEL || 'gemini-3.5-flash-lite',
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
  /** auto = pending when estimateSyncTurnMs > budget; always = debug; off = never */
  salesIqPendingMode: (process.env.SUPPORT_SALESIQ_PENDING_MODE || 'auto').toLowerCase(),
  salesIqPendingCompleteAsReply: parseBool(
    process.env.SUPPORT_SALESIQ_PENDING_COMPLETE_AS_REPLY,
    true,
  ),
  supportFailOpenForward: parseBool(process.env.SUPPORT_FAIL_OPEN_FORWARD, true),
  salesIqHandoffNotes: parseBool(process.env.SUPPORT_SALESIQ_HANDOFF_NOTES, true),
  salesIqApiBase: (process.env.SALESIQ_API_BASE || '').replace(/\/$/, ''),
  salesIqScreenName: process.env.SALESIQ_SCREEN_NAME || '',
  salesIqOauthToken: process.env.SALESIQ_OAUTH_TOKEN || '',
  salesIqRefreshToken: process.env.SALESIQ_REFRESH_TOKEN || '',
  salesIqClientId: process.env.SALESIQ_CLIENT_ID || '',
  salesIqClientSecret: process.env.SALESIQ_CLIENT_SECRET || '',
  salesIqAccountsUrl: (process.env.SALESIQ_ACCOUNTS_URL || '').replace(/\/$/, ''),
  /** Mirror timeout when using async callback (not capped by 5s webhook). */
  asyncMirrorTimeoutMs: Number(process.env.SUPPORT_ASYNC_MIRROR_TIMEOUT_MS) || 12000,
  /** Interakt outbound — videos, PDFs, prasad updates (not support chat 8147560485). */
  pujaUpdatesSenderLabel:
    process.env.PUJA_UPDATES_SENDER_LABEL?.trim() ||
    '7619486274 (save as “LifeGuru Puja Updates”)',
  /** Support line (web/SalesIQ chat). */
  supportWhatsAppDisplay:
    process.env.SUPPORT_WHATSAPP_DISPLAY?.trim() || '+91 8147560485',
  /** When true, classify also returns a knowledge-base id in the same Gemini call. */
  llmFaqSelectEnabled:
    process.env.NODE_ENV === 'test'
      ? false
      : parseBool(
          process.env.SUPPORT_LLM_FAQ_SELECT,
          Boolean(process.env.GEMINI_API_KEY),
        ),
};
