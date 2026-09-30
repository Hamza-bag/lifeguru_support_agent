const policy = require('../config/policy');
const {
  wantsHuman,
  wantsNoMore,
  wantsYesMore,
  classifyIntent,
  isOrderIntent,
  detectReplyLanguage,
} = require('../conversation/intent');
const { emptyState } = require('./state');
const {
  reply,
  forward,
  forwardForHuman,
  endChat,
  welcomePrompt,
  greetingReply,
  thanksReply,
  askPhoneForHumanReply,
  pickTopicPrompt,
  askMoreSuggestions,
  whatElseSuggestions,
} = require('./responses');
const { applyRouting, withClassifyMeta, replyFromFaq } = require('./router');
const { resolveChatPhone } = require('./phoneContext');
const { parseWebSupportPrefill } = require('../lib/webSupportPrefill');
const {
  handleAwaitBookingNumber,
  lookupAndShowOrders,
  handleSelectOrder,
} = require('./orderFlow');
const { answerForOrder } = require('./factsReplies');
const { t } = require('../conversation/copy');
const { requiresDirectHumanHandoff } = require('../conversation/directHandoff');

function replyFromSocialRoute(state, routed, lang) {
  if (routed.route === 'welcome') {
    return {
      state: { ...state, stage: 'await_query' },
      response: withClassifyMeta(greetingReply(lang), routed.classifyMeta),
    };
  }
  if (routed.route === 'thanks') {
    return {
      state: { ...state, stage: 'await_query' },
      response: withClassifyMeta(thanksReply(lang), routed.classifyMeta),
    };
  }
  return null;
}

async function handleOrderQuery(state, queryText, factsClient, input) {
  const routed = await applyRouting(state, queryText);
  state = routed.state;
  const lang = state.language;

  const social = replyFromSocialRoute(state, routed, lang);
  if (social) return social;

  if (routed.route === 'human') {
    return {
      state,
      response: withClassifyMeta(forwardForHuman(lang, queryText, routed.classifyMeta), routed.classifyMeta),
    };
  }
  if (routed.route === 'faq') {
    const faq = await replyFromFaq(state, queryText, routed.classifyMeta?.faqId);
    faq.response = withClassifyMeta(faq.response, routed.classifyMeta);
    return faq;
  }
  if (routed.route === 'clarify') {
    const picked = pickTopicPrompt({ ...state, pendingText: queryText, pendingIntent: null });
    picked.response = withClassifyMeta(picked.response, routed.classifyMeta);
    return picked;
  }

  let { phone, source: phoneSource } = resolveChatPhone(input, state);
  const prefill = parseWebSupportPrefill(queryText);
  if (
    phone &&
    prefill.registeredMobile &&
    prefill.registeredMobile !== phone
  ) {
    return {
      state: {
        ...state,
        chatPhone: phone,
        chatPhoneSource: 'visitor',
        claimedBookingPhone: prefill.registeredMobile,
        stage: 'await_query',
      },
      response: withClassifyMeta(forwardForHuman(lang, queryText, {
        route: 'human',
        reason: 'booking_phone_differs_from_visitor',
      }), { route: 'human', reason: 'booking_phone_differs_from_visitor' }),
    };
  }
  if (!phone) {
    return {
      state: {
        ...state,
        stage: 'await_booking_number',
        pendingText: queryText,
        pendingIntent: routed.intent,
      },
      response: withClassifyMeta(askPhoneForHumanReply(lang), routed.classifyMeta),
    };
  }
  const listed = await lookupAndShowOrders(
    { ...state, pendingIntent: routed.intent, clarifyAttempts: 0, pendingText: queryText },
    factsClient,
    queryText,
    phone,
  );
  listed.phoneSource = phoneSource;
  listed.response = withClassifyMeta(listed.response, routed.classifyMeta);
  if (listed.phoneSource) {
    listed.response.phoneSource = listed.phoneSource;
    delete listed.phoneSource;
  }
  return listed;
}

async function handlePickTopic(state, text, factsClient, input) {
  const routed = await applyRouting({ ...state, pendingIntent: null }, text);
  state = routed.state;
  const lang = state.language;

  const social = replyFromSocialRoute(state, routed, lang);
  if (social) return social;

  if (routed.route === 'human') {
    return {
      state,
      response: withClassifyMeta(forwardForHuman(lang, text, routed.classifyMeta), routed.classifyMeta),
    };
  }
  if (routed.route === 'faq') {
    const faq = await replyFromFaq(state, text, routed.classifyMeta?.faqId);
    faq.response = withClassifyMeta(faq.response, routed.classifyMeta);
    return faq;
  }
  if (routed.route === 'clarify') {
    const attempts = (state.clarifyAttempts || 0) + 1;
    if (attempts > policy.maxClarifyAttempts) {
      return { state, response: withClassifyMeta(forward(lang), routed.classifyMeta) };
    }
    const picked = pickTopicPrompt({ ...state, clarifyAttempts: attempts });
    picked.response = withClassifyMeta(picked.response, routed.classifyMeta);
    return picked;
  }
  return handleOrderQuery(
    { ...state, stage: 'await_query', pendingIntent: routed.intent, clarifyAttempts: 0 },
    text,
    factsClient,
    input,
  );
}

async function handleAskMore(state, text, factsClient, input) {
  const lang = state.language;
  if (wantsNoMore(text)) {
    return { state: emptyState(), response: endChat(lang) };
  }
  if (wantsHuman(text)) {
    return { state, response: forward(lang) };
  }
  const pick = Number.parseInt(String(text || '').trim(), 10);
  if (Number.isInteger(pick) && pick >= 1 && pick <= (state.orders || []).length) {
    return handleSelectOrder(state, text, factsClient);
  }
  const routed = await applyRouting(state, text);
  const social = replyFromSocialRoute(routed.state, routed, routed.state.language);
  if (social) return social;
  if (routed.route === 'human') {
    return {
      state: routed.state,
      response: withClassifyMeta(forward(routed.state.language), routed.classifyMeta),
    };
  }
  if (routed.route === 'faq') {
    const faq = await replyFromFaq(routed.state, text, routed.classifyMeta?.faqId);
    faq.response = withClassifyMeta(faq.response, routed.classifyMeta);
    return faq;
  }
  if (isOrderIntent(routed.intent)) {
    const answered = await answerForOrder(
      { ...routed.state, pendingIntent: routed.intent },
      factsClient,
      text,
    );
    answered.response = withClassifyMeta(answered.response, routed.classifyMeta);
    return answered;
  }
  const intent = classifyIntent(text);
  if (isOrderIntent(intent)) {
    return answerForOrder(state, factsClient, text);
  }
  if (wantsYesMore(text)) {
    return {
      state: { ...state, askMoreAttempts: 0 },
      response: reply(t(lang, 'whatElse'), {
        suggestions: whatElseSuggestions(lang),
      }),
    };
  }
  const attempts = (state.askMoreAttempts || 0) + 1;
  if (attempts >= policy.maxAskMoreAttempts) {
    return {
      state: { ...state, askMoreAttempts: 0 },
      response: withClassifyMeta(forwardForHuman(lang, text, { route: 'human', reason: 'ask_more_unresolved' }), {
        route: 'human',
        reason: 'ask_more_unresolved',
      }),
    };
  }
  return {
    state: { ...state, askMoreAttempts: attempts },
    response: reply(t(lang, 'askMoreAgain'), {
      suggestions: askMoreSuggestions(lang),
    }),
  };
}

async function handleAnswer(state, text, factsClient) {
  const pick = Number.parseInt(String(text || '').trim(), 10);
  if (Number.isInteger(pick) && pick >= 1 && pick <= (state.orders || []).length) {
    return handleSelectOrder(state, text, factsClient);
  }
  return answerForOrder(state, factsClient, text);
}

function forwardDirectHuman(state, text, turnInput) {
  const lang =
    state.language ||
    (text ? detectReplyLanguage(text).locale : 'en');
  return { state: { ...state, language: lang }, response: forward(lang) };
}

async function handleQueryFirstTurn(state, text, factsClient, turnInput) {
  if (!text) {
    if (requiresDirectHumanHandoff('', turnInput?.salesIqPayload)) {
      return forwardDirectHuman(state, text, turnInput);
    }
    return { state, response: welcomePrompt() };
  }
  if (!state.language) {
    state = { ...state, language: detectReplyLanguage(text).locale };
  }
  if (requiresDirectHumanHandoff(text, turnInput?.salesIqPayload) || wantsHuman(text)) {
    return forwardDirectHuman(state, text, turnInput);
  }
  return runConversationStages(state, text, factsClient, turnInput);
}

async function runConversationStages(state, text, factsClient, turnInput) {
  try {
    if (requiresDirectHumanHandoff(text, turnInput?.salesIqPayload)) {
      return forwardDirectHuman(state, text, turnInput);
    }
    if (state.stage === 'await_query') {
      return handleOrderQuery({ ...state, stage: 'await_query' }, text, factsClient, turnInput);
    }
    if (state.stage === 'pick_topic') {
      return handlePickTopic(state, text, factsClient, turnInput);
    }
    if (state.stage === 'await_booking_number') {
      return handleAwaitBookingNumber(state, text);
    }
    if (state.stage === 'select_order') {
      return handleSelectOrder(state, text, factsClient);
    }
    if (state.stage === 'answer' || state.stage === 'ask_more') {
      if (state.stage === 'ask_more') {
        return handleAskMore(state, text, factsClient, turnInput);
      }
      return handleAnswer(state, text, factsClient);
    }
    state = { ...state, stage: 'await_query' };
    return handleOrderQuery(state, text, factsClient, turnInput);
  } catch (err) {
    console.error('support agent turn failed', err);
    return { state, response: { action: 'forward', replies: [t(state.language, 'error')] } };
  }
}

module.exports = {
  handleOrderQuery,
  handlePickTopic,
  handleAskMore,
  handleAnswer,
  handleQueryFirstTurn,
  runConversationStages,
};
