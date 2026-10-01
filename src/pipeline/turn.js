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
const { t } = require('../conversation/copy');
const { buildFactsReply } = require('./factsReplies');
const { resolveChatPhone } = require('./phoneContext');
const { handleQueryFirstTurn } = require('./stages');

function prependFirstGreeting(result, { isNewChat, text }) {
  if (!isNewChat || !text) return;
  const replies = result.response?.replies;
  if (!Array.isArray(replies) || !replies.length) return;
  const lang = result.state.language || 'en';
  const welcome = t(lang, 'welcomeQuery');
  const first = String(replies[0] || '');
  if (!first.startsWith(welcome.slice(0, 12))) {
    result.response = { ...result.response, replies: [welcome, ...replies] };
  }
  result.state = { ...result.state, greeted: true };
}

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
    const numberPick = /^\d{1,2}$/.test(text);
    const keepSessionLanguage =
      numberPick && state.replyRegister && state.replyRegister !== 'en';
    state = {
      ...state,
      language: keepSessionLanguage ? state.language : detected.locale,
      replyRegister: keepSessionLanguage ? state.replyRegister : detected.register,
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
  prependFirstGreeting(result, { isNewChat: input.isNewChat, text: routeText });

  if (routeText && !input.isNewChat) {
    result.state = appendTurn(result.state, 'user', routeText);
  }
  const botLine = (result.response?.replies || []).filter(Boolean).join('\n\n');
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
