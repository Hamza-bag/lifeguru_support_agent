const {
  appendTurn,
  normalizeUserText,
  mergeRecentUserForRouting,
} = require('../conversation/chatContext');
const { detectReplyLanguage } = require('../conversation/intent');
const { shouldUseBurstBuffer, applyBurstBuffer } = require('../conversation/burstBuffer');
const config = require('../config');
const { emptyState, WELCOME_QUERY } = require('./state');
const { welcomePrompt } = require('./responses');
const { buildFactsReply } = require('./factsReplies');
const { resolveChatPhone } = require('./phoneContext');
const { handleQueryFirstTurn } = require('./stages');

async function handleTurn(input, factsClient) {
  let state = input.state ? { ...emptyState(), ...input.state } : emptyState();
  const rawText = String(input.text || '').trim();
  let text = normalizeUserText(rawText);
  // Legacy merge for turn history (classify context); burst buffer handles split webhooks.
  if (text && config.burstMergeRouting && input.state && !input.isNewChat && !input.state.userBurstBuffer) {
    text = mergeRecentUserForRouting(input.state, rawText);
  }
  const turnInput = { ...input, factsClient };

  if (input.isNewChat) {
    state = { ...emptyState(), stage: 'await_query' };
  }

  if (text) {
    const detected = detectReplyLanguage(text);
    state = {
      ...state,
      language: detected.locale,
      replyRegister: detected.register,
    };
  }

  let routeText = text;
  let clearedBurstBuffer = false;
  if (text && shouldUseBurstBuffer(state, text, input)) {
    const lang = state.language || detectReplyLanguage(text).locale;
    const burst = applyBurstBuffer(state, text, lang);
    state = burst.state;
    if (burst.hold) {
      return {
        state,
        response: { action: 'reply', replies: [] },
      };
    }
    routeText = burst.combined;
    clearedBurstBuffer = true;
    const burstLang = detectReplyLanguage(routeText);
    state = {
      ...state,
      language: burstLang.locale,
      replyRegister: burstLang.register,
      userBurstBuffer: null,
    };
  }

  const turnInputWithPayload = { ...turnInput, salesIqPayload: input.salesIqPayload };
  const result = await handleQueryFirstTurn(state, routeText, factsClient, turnInputWithPayload);

  if (routeText && !input.isNewChat) {
    result.state = appendTurn(result.state, 'user', routeText);
  }
  const botLine = result.response?.replies?.[0];
  if (botLine && result.response.action !== 'pending') {
    result.state = appendTurn(result.state, 'bot', botLine);
  }
  if (clearedBurstBuffer) {
    result.state = { ...result.state, userBurstBuffer: null };
  }

  return result;
}

module.exports = {
  WELCOME_QUERY,
  emptyState,
  handleTurn,
  resolveChatPhone,
  welcomePrompt,
  buildFactsReply,
};
