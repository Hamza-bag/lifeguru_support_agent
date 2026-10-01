const parseBool = (value, fallback) => {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
};

/** rules_first = keywords/FAQ before Gemini (recommended for prod spikes). */
const routingStrategy =
  process.env.SUPPORT_ROUTING_STRATEGY === 'llm_first' ? 'llm_first' : 'rules_first';

module.exports = {
  routingStrategy,
  faqEnabled: parseBool(process.env.SUPPORT_FAQ_ENABLED, true),
  maxClarifyAttempts: Number(process.env.SUPPORT_MAX_CLARIFY) || 3,
  /** Unclear replies while helping — the third one connects to a person. */
  maxAskMoreAttempts: Number(process.env.SUPPORT_MAX_ASK_MORE) || 3,
  /**
   * Optional simulated WhatsApp phone for local-chat only.
   * Off by default — production and ngrok use visitor.phone only.
   */
  allowDefaultChatPhone: parseBool(process.env.SUPPORT_DEV_DEFAULT_PHONE, false),
  defaultChatPhone: (process.env.DEFAULT_CHAT_PHONE || '').trim(),
};
