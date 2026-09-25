const { t } = require('../conversation/copy');
const { classifyIntent } = require('../conversation/intent');
const { formatWhen, formatStatus } = require('../conversation/format');
const { reply, forward, askMoreSuggestions } = require('./responses');

function buildPrasadReply(lang, facts) {
  const product = facts.productName || 'booking';
  const status = (facts.prasadStatus || '').toLowerCase();
  if (!facts.isPrasad && !status) {
    return t(lang, 'factsNoPrasad');
  }
  const tracking = facts.trackingLink
    ? lang === 'hi'
      ? ` ट्रैकिंग: ${facts.trackingLink}`
      : ` Tracking: ${facts.trackingLink}`
    : '';
  if (status === 'dispatched') {
    return t(lang, 'factsPrasadDispatched', { product, tracking });
  }
  if (status === 'delivered') {
    return t(lang, 'factsPrasadDelivered', { product });
  }
  if (status === 'cancelled') {
    return t(lang, 'factsPrasadCancelled', { product });
  }
  return t(lang, 'factsPrasadPending', { product });
}

function buildFactsReply(lang, facts, intent) {
  const product = facts.productName || 'booking';
  const status = formatStatus(facts.orderStatus, lang);
  const when = formatWhen(facts.scheduledAt, lang);
  const puja = when
    ? t(lang, 'factsPuja', { product, when, status })
    : t(lang, 'factsPujaUnknown', { product, status });
  const video = facts.videoReady
    ? t(lang, 'factsVideoReady', { product })
    : t(lang, 'factsVideoPending', { product });
  const prasad = buildPrasadReply(lang, facts);

  if (intent === 'puja') return puja;
  if (intent === 'video') return video;
  if (intent === 'prasad') return prasad;
  if (intent === 'both') {
    return [puja, video, prasad].filter(Boolean).join('\n');
  }
  return t(lang, 'bothFacts', { puja, video });
}

async function answerForOrder(state, factsClient, intentText) {
  const lang = state.language;
  const facts = await factsClient.getOrderFacts(state.orderId, state.customerId);
  if (!facts) {
    return { state, response: forward(lang) };
  }
  const intent = classifyIntent(intentText || '') || state.pendingIntent || 'both';
  const body = buildFactsReply(lang, facts, intent);
  return {
    state: { ...state, stage: 'ask_more', askMoreAttempts: 0, pendingText: null, pendingIntent: null },
    response: reply([body, t(lang, 'askMore')], {
      suggestions: askMoreSuggestions(lang),
    }),
  };
}

module.exports = {
  buildPrasadReply,
  buildFactsReply,
  answerForOrder,
};
