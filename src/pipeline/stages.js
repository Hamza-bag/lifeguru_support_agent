const policy = require('../config/policy');
const {
  wantsHuman,
  needsPersonAfterAnswer,
  wantsNoMore,
  wantsYesMore,
  classifyIntent,
  followUpOnOpenBooking,
  isPujaDurationQuery,
  isOrderIntent,
  detectReplyLanguage,
} = require('../conversation/intent');
const { emptyState } = require('./state');
const {
  reply,
  forward,
  forwardUnclear,
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
  beginNameChange,
  handleSelectOrder,
} = require('./orderFlow');
const { parseOrderLookup } = require('../orders/orderLookup');
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

  if (routed.route === 'sankalp_change') {
    const { phone, source: phoneSource } = resolveChatPhone(input, state);
    if (!phone) {
      return {
        state: { ...state, stage: 'await_booking_number', pendingText: queryText },
        response: withClassifyMeta(askPhoneForHumanReply(lang), routed.classifyMeta),
      };
    }
    const started = await beginNameChange(
      { ...state, chatPhone: phone, chatPhoneSource: phoneSource || 'visitor' },
      factsClient,
      queryText,
      phone,
    );
    started.response = withClassifyMeta(started.response, routed.classifyMeta);
    return started;
  }

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
    if (routed.classifyMeta?.reason === 'rules_help') {
      const picked = pickTopicPrompt({ ...state, pendingText: queryText, pendingIntent: null });
      picked.response = withClassifyMeta(picked.response, routed.classifyMeta);
      return picked;
    }
    return {
      state,
      response: withClassifyMeta(forwardUnclear(lang), routed.classifyMeta),
    };
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
    if (attempts >= policy.maxAskMoreAttempts || routed.classifyMeta?.reason !== 'rules_help') {
      return { state, response: withClassifyMeta(forwardUnclear(lang), routed.classifyMeta) };
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

function isLateVideoFollowUp(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  return (
    /\b(more than|few days|nahi aaya|nahi mila|not received|still waiting|bahut din)\b/.test(lower) ||
    /नहीं आया|नहीं मिला|कई दिन/.test(raw)
  );
}

async function answerKnownBooking(state, factsClient, text, intent, input) {
  if (!state.orderId) {
    const { phone } = resolveChatPhone(input, state);
    if (phone) {
      return lookupAndShowOrders(
        { ...state, pendingIntent: intent, pendingText: text },
        factsClient,
        text,
        phone,
      );
    }
  }
  return answerForOrder({ ...state, pendingIntent: intent }, factsClient, text);
}

async function handleAskMore(state, text, factsClient, input) {
  const lang = state.language;
  if (wantsNoMore(text)) {
    return { state: emptyState(), response: endChat(lang) };
  }
  if (wantsHuman(text) || needsPersonAfterAnswer(text)) {
    return { state, response: forward(lang) };
  }
  if (isPujaDurationQuery(text)) {
    return replyFromFaq(state, text, 'puja_duration_hours');
  }
  if (state.orderId && isLateVideoFollowUp(text)) {
    return answerForOrder({ ...state, pendingIntent: 'video' }, factsClient, text);
  }
  const pick = Number.parseInt(String(text || '').trim(), 10);
  if (Number.isInteger(pick) && pick >= 1 && pick <= (state.orders || []).length) {
    return handleSelectOrder(state, text, factsClient);
  }
  const openIntent = followUpOnOpenBooking(text);
  const namedBooking = parseOrderLookup(text);
  if (state.orderId && openIntent && !namedBooking?.key) {
    return answerForOrder({ ...state, pendingIntent: openIntent }, factsClient, text);
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
  if (routed.orderLookup?.key && routed.orderLookup.key !== 'recent') {
    const { phone } = resolveChatPhone(input, routed.state);
    if (phone) {
      const listed = await lookupAndShowOrders(routed.state, factsClient, text, phone);
      listed.response = withClassifyMeta(listed.response, routed.classifyMeta);
      return listed;
    }
  }
  if (isOrderIntent(routed.intent)) {
    const answered = await answerKnownBooking(
      { ...routed.state, pendingIntent: routed.intent },
      factsClient,
      text,
      routed.intent,
      input,
    );
    answered.response = withClassifyMeta(answered.response, routed.classifyMeta);
    return answered;
  }
  const intent = classifyIntent(text);
  if (isOrderIntent(intent)) {
    return answerKnownBooking(state, factsClient, text, intent, input);
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
      response: withClassifyMeta(forwardUnclear(lang), {
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
