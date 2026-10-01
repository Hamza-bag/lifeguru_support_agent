const config = require('../config');
const { t } = require('../conversation/copy');
const { classifyIntent, wantsHuman } = require('../conversation/intent');
const { extractPhoneCandidate } = require('../orders/phone');
const { formatOrderLine } = require('../conversation/format');
const { kbLines } = require('../faq/matchFaq');
const { reply, forward, forwardAfterPhoneCollected } = require('./responses');
const { answerForOrder } = require('./factsReplies');
const { failOpenHandoff } = require('../lib/failOpen');
const { parseWebSupportPrefill, routingTextAfterPrefill } = require('../lib/webSupportPrefill');

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
    state: {
      ...state,
      claimedBookingPhone: phone,
      stage: 'await_query',
    },
    response: forwardAfterPhoneCollected(lang),
  };
}

async function showOrders(state, factsClient, followUpText) {
  const lang = state.language;
  const orders = state.orders || [];
  if (orders.length === 1) {
    const next = {
      ...state,
      orderId: String(orders[0].id),
      customerId: String(orders[0].customerId || state.customerId),
      stage: 'answer',
    };
    const intro = t(lang, 'onlyOrder', {
      title: orders[0].title,
      bookedOn: orders[0].bookedOn || '',
    });
    const answered = await answerForOrder(next, factsClient, followUpText || state.pendingText);
    answered.response = {
      ...answered.response,
      replies: [[intro, ...(answered.response.replies || [])].join('\n\n')],
    };
    return answered;
  }
  const list = orders.map((order, i) => formatOrderLine(order, i + 1)).join('\n\n');
  const replies = [];
  if (state.customerName) {
    replies.push(t(lang, 'confirmName', { name: state.customerName }));
  }
  replies.push(t(lang, 'listOrders', { list }));
  replies.push(t(lang, state.pendingHandoff === 'sankalp_change' ? 'pickForNameChange' : 'pickPrompt'));
  return {
    state: { ...state, stage: 'select_order' },
    response: reply(replies.join('\n\n'), {
      suggestions: orders.map((_, index) => String(index + 1)),
    }),
  };
}

async function lookupAndShowOrders(state, factsClient, queryText, phone) {
  const lang = state.language;
  const prefill = parseWebSupportPrefill(queryText);
  const intentText = routingTextAfterPrefill(queryText);

  if (prefill.orderId && phone && factsClient.lookupByOrderAndPhone) {
    try {
      const direct = await factsClient.lookupByOrderAndPhone(prefill.orderId, phone);
      if (direct?.matched && direct.orders?.length) {
        const next = {
          ...state,
          chatPhone: phone,
          chatPhoneSource: 'visitor',
          customerName: direct.name || null,
          customerId: direct.customerId,
          orders: direct.orders,
          orderId: String(direct.orders[0].id),
          stage: 'answer',
          pendingText: intentText,
          pendingIntent: classifyIntent(intentText) || null,
          webPrefillOrderId: prefill.orderId,
        };
        return answerForOrder(next, factsClient, intentText);
      }
    } catch (err) {
      console.error('[support] admin lookupByOrderAndPhone failed', err.message || err);
      if (config.supportFailOpenForward) {
        return failOpenHandoff(state, lang, queryText, 'admin_order_lookup_failed');
      }
    }
  }

  let found;
  try {
    found = await factsClient.lookupByPhone(phone, state.orderLookup);
  } catch (err) {
    console.error('[support] admin lookupByPhone failed', err.message || err);
    if (config.supportFailOpenForward) {
      return failOpenHandoff(state, lang, queryText, 'admin_lookup_failed');
    }
    throw err;
  }
  if (found?.lookupNotice === 'none') {
    let recent;
    try {
      recent = await factsClient.lookupByPhone(phone);
    } catch (err) {
      console.error('[support] admin lookupByPhone failed', err.message || err);
      if (config.supportFailOpenForward) {
        return failOpenHandoff(state, lang, queryText, 'admin_lookup_failed');
      }
      throw err;
    }
    if (!recent?.matched || !(recent.orders || []).length) {
      return {
        state: {
          ...state,
          stage: 'await_booking_number',
          chatPhone: phone,
          chatPhoneSource: 'visitor',
          pendingText: queryText,
        },
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
    const listed = await showOrders(
      {
        ...state,
        chatPhone: phone,
        chatPhoneSource: 'visitor',
        customerName: recent.name || found.name || null,
        customerId: recent.customerId || found.customerId,
        orders: recent.orders || [],
        pendingText: queryText,
        pendingIntent: classifyIntent(queryText) || state.pendingIntent || null,
      },
      factsClient,
      queryText,
    );
    listed.response = {
      ...listed.response,
      replies: [
        t(lang, 'lookupNone', { detail: found.lookupDetail || 'that date' }),
        ...listed.response.replies,
      ],
    };
    return listed;
  }
  if (!found?.matched || !(found.orders || []).length) {
    return {
      state: {
        ...state,
        stage: 'await_booking_number',
        chatPhone: phone,
        chatPhoneSource: 'visitor',
        pendingText: queryText,
      },
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
    chatPhoneSource: 'visitor',
    customerName: found.name || null,
    customerId: found.customerId,
    orders: found.orders || [],
    pendingText: queryText,
    pendingIntent: classifyIntent(queryText) || null,
  };
  return showOrders(next, factsClient, queryText);
}

function isPhoneOrSameNumberClaim(text) {
  if (extractPhoneCandidate(text)) return true;
  return /\b(same number|my number|whatsapp number|this number)\b/i.test(String(text || ''));
}

function orderIndexFromReply(text, orders) {
  const trimmed = String(text || '').trim();
  const number = Number.parseInt(trimmed, 10);
  if (Number.isInteger(number) && number >= 1 && number <= orders.length) return number - 1;
  const raw = trimmed.toLowerCase();
  const hits = [];
  orders.forEach((order, index) => {
    const words = String(order.title || '')
      .toLowerCase()
      .split(/[^a-z0-9\u0900-\u097F]+/)
      .filter((word) => word.length > 3);
    if (words.some((word) => raw.includes(word))) hits.push(index);
  });
  return hits.length === 1 ? hits[0] : -1;
}

function forwardNameChange(state, order) {
  const lang = state.language;
  return {
    state: {
      ...state,
      orderId: order ? String(order.id) : state.orderId,
      customerId: order ? String(order.customerId || state.customerId) : state.customerId,
      handoffEscalation: 'sankalp_change',
      pendingHandoff: null,
    },
    response: {
      action: 'forward',
      replies: [
        order
          ? t(lang, 'forwardNameChange', { title: order.title })
          : t(lang, 'forwardNameChangeNoBooking'),
      ],
    },
  };
}

async function beginNameChange(state, factsClient, queryText, phone) {
  const lang = state.language;
  let found;
  try {
    found = await factsClient.lookupByPhone(phone);
  } catch (err) {
    console.error('[support] name change lookup failed', err.message || err);
    if (config.supportFailOpenForward) {
      return failOpenHandoff(state, lang, queryText, 'sankalp_change_lookup_failed');
    }
    throw err;
  }
  const orders = found?.orders || [];
  if (!found?.matched || !orders.length) {
    return forwardNameChange(state, null);
  }
  if (orders.length === 1) {
    return forwardNameChange(
      { ...state, customerId: found.customerId, orders },
      orders[0],
    );
  }
  return showOrders(
    {
      ...state,
      customerName: found.name || null,
      customerId: found.customerId,
      orders,
      pendingText: queryText,
      pendingHandoff: 'sankalp_change',
    },
    factsClient,
    queryText,
  );
}

async function handleSelectOrder(state, text, factsClient) {
  const lang = state.language;
  const trimmed = String(text || '').trim();
  const index = state.pendingHandoff
    ? orderIndexFromReply(trimmed, state.orders || [])
    : Number.parseInt(trimmed, 10) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= (state.orders || []).length) {
    if (wantsHuman(trimmed)) {
      return { state, response: forward(lang) };
    }
    const orders = state.orders || [];
    if (!orders.length) {
      return { state, response: reply(t(lang, 'invalidPick')) };
    }
    const intent = classifyIntent(trimmed);
    const next = intent
      ? { ...state, pendingText: trimmed, pendingIntent: intent }
      : state;
    const listed = await showOrders(next, factsClient, next.pendingText);
    const notice = isPhoneOrSameNumberClaim(trimmed)
      ? t(lang, 'alreadyOnThisChat')
      : t(lang, 'invalidPick');
    listed.response = {
      ...listed.response,
      replies: [notice, ...(listed.response.replies || [])],
    };
    return listed;
  }
  const order = state.orders[index];
  if (state.pendingHandoff === 'sankalp_change') {
    return forwardNameChange(state, order);
  }
  const next = {
    ...state,
    orderId: String(order.id),
    customerId: String(order.customerId || state.customerId),
    pendingText: null,
  };
  return answerForOrder(next, factsClient, state.pendingText || text);
}

module.exports = {
  handleAwaitBookingNumber,
  showOrders,
  lookupAndShowOrders,
  beginNameChange,
  handleSelectOrder,
};
