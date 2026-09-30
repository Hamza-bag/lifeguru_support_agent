const { mirrorReplyLanguage } = require('./polish');
const { shouldSkipLlmMirror } = require('../conversation/routingGate');

/**
 * Template drafts → optional Gemini rewrite (mirror user language, or locale polish).
 */
async function finalizeBotReplies({
  config,
  userText,
  state,
  response,
  rulesBlock = '',
  mirrorTimeoutMs: mirrorTimeoutOverride,
}) {
  const lang = state?.language;
  const drafts = response?.replies;
  if (!drafts?.length || !config.geminiApiKey) {
    return { response, usedLlm: false, llmMode: null };
  }

  const trimmedUser = String(userText || '').trim();
  const skipMirrorForDeterministicTurn =
    trimmedUser && state && shouldSkipLlmMirror(state, trimmedUser);

  if (config.llmMirrorLanguage && trimmedUser && !skipMirrorForDeterministicTurn) {
    const timeoutMs =
      typeof mirrorTimeoutOverride === 'number'
        ? mirrorTimeoutOverride
        : config.llmMirrorTimeoutMs;
    if (timeoutMs <= 0) {
      return {
        response,
        usedLlm: false,
        llmMode: 'mirror',
        llmSkipReason: 'webhook_budget_exhausted',
      };
    }
    const mirrored = await mirrorReplyLanguage({
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
      lang,
      replyRegister: state?.replyRegister,
      userText,
      drafts,
      action: response.action,
      timeoutMs,
      rulesBlock,
    });
    return {
      response: { ...response, replies: mirrored.replies },
      usedLlm: mirrored.usedLlm,
      llmMode: 'mirror',
      llmSkipReason: mirrored.usedLlm ? null : mirrored.skipReason || 'mirror_failed',
      mirrorTimeoutMs: timeoutMs,
    };
  }

  if (config.llmMirrorLanguage && trimmedUser && skipMirrorForDeterministicTurn) {
    return { response, usedLlm: false, llmMode: null, llmSkipReason: 'mirror_skipped_deterministic' };
  }

  return { response, usedLlm: false, llmMode: null };
}

module.exports = { finalizeBotReplies };
