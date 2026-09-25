const { t } = require('../conversation/copy');
const { classifyIntent } = require('../conversation/intent');
const { extractPhoneCandidate } = require('../orders/phone');
const { formatOrderLine } = require('../conversation/format');
const { kbLines } = require('../faq/matchFaq');
const { reply, forwardAfterPhoneCollected } = require('./responses');
const { answerForOrder } = require('./factsReplies');

async function handleAwaitBookingNumber(state, text) {
  const lang = state.language;
  const phone = extractPhoneCandidate(text);
  if (!phone) {
    return {
      state,
      response: reply(
        kbLines(lang, ['no_whatsapp_phone', 'ask_booking_phone_for_team'], [
          'askBookingNumber',
          'askBookingNumber',
        ], t),
      ),
    };
  }
  return {
    state: { ...state, chatPhone: phone, stage: 'await_query' },
    response: forwardAfterPhoneCollected(lang),
  };
}

async function showOrders(state, factsClient, followUpText) {
  const lang = state.language;
  const orders = state.orders || [];
  if (orders.length === 1) {
    const next = { ...state, orderId: String(orders[0].id), stage: 'answer' };
    const intro = t(lang, 'onlyOrder', {
      title: orders[0].title,
      bookedOn: orders[0].bookedOn || '',
    });
    const answered = await answerForOrder(next, factsClient, followUpText || state.pendingText);
    answered.response = {
      ...answered.response,
      replies: [intro, ...answered.response.replies],
    };
    return answered;
  }
  const list = orders.map((order, i) => formatOrderLine(order, i + 1)).join('\n');
  const replies = [];
  if (state.customerName) {
    replies.push(t(lang, 'confirmName', { name: state.customerName }));
  }
  replies.push(t(lang, 'listOrders', { list }), t(lang, 'pickPrompt'));
  return {
    state: { ...state, stage: 'select_order' },
    response: reply(replies),
  };
}

async function lookupAndShowOrders(state, factsClient, queryText, phone) {
  const lang = state.language;
  const found = await factsClient.lookupByPhone(phone);
  if (!found?.matched || !(found.orders || []).length) {
    return {
      state: { ...state, stage: 'await_booking_number', chatPhone: phone, pendingText: queryText },
      response: reply(
        kbLines(
          lang,
          ['no_booking_on_whatsapp', 'ask_booking_phone_for_team'],
          ['noBookingOnChat', 'askBookingNumber'],
          t,
        ),
      ),
    };
  }
  const next = {
    ...state,
    chatPhone: phone,
    customerName: found.name || null,
    customerId: found.customerId,
    orders: found.orders || [],
    pendingText: queryText,
    pendingIntent: classifyIntent(queryText) || null,
  };
  return showOrders(next, factsClient, queryText);
}

async function handleSelectOrder(state, text, factsClient) {
  const lang = state.language;
  const trimmed = String(text || '').trim();
  const index = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(index) || index < 1 || index > state.orders.length) {
    return { state, response: reply(t(lang, 'invalidPick')) };
  }
  const order = state.orders[index - 1];
  const next = { ...state, orderId: String(order.id), pendingText: null };
  return answerForOrder(next, factsClient, state.pendingText || text);
}

module.exports = {
  handleAwaitBookingNumber,
  showOrders,
  lookupAndShowOrders,
  handleSelectOrder,
};
