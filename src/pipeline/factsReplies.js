const config = require('../config');
const { t } = require('../conversation/copy');
const { classifyIntent } = require('../conversation/intent');
const { formatWhen, formatStatus } = require('../conversation/format');
const { reply, forward, askMoreSuggestions } = require('./responses');
const { failOpenHandoff } = require('../lib/failOpen');
const { applyKbPlaceholders } = require('../content/kbPlaceholders');

const VIDEO_SLA_ESCALATION_DAYS = 5;

function daysSincePujaDate(isoDate) {
  if (!isoDate) return null;
  const puja = new Date(isoDate);
  if (Number.isNaN(puja.getTime())) return null;
  const ms = Date.now() - puja.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function sanitizeVideoLink(raw) {
  const link = String(raw || '').trim();
  if (!link) return '';
  if (!/^https?:\/\//i.test(link)) return '';
  return link;
}

function buildVideoReply(lang, facts) {
  const product = facts.productName || 'booking';
  if (facts.videoReady) {
    const link = sanitizeVideoLink(facts.videoLink);
    if (link) {
      return applyKbPlaceholders(t(lang, 'factsVideoReadyWithLink', { product, link }));
    }
    return applyKbPlaceholders(t(lang, 'factsVideoReady', { product }));
  }
  let body = t(lang, 'factsVideoPending', { product });
  const days = daysSincePujaDate(facts.scheduledAt);
  if (days != null && days > VIDEO_SLA_ESCALATION_DAYS) {
    body +=
      lang === 'hi'
        ? '\n\nPuja date ke 5 din se zyada ho chuke hain — turant check ke liye “human agent” likhein.'
        : '\n\nIt has been more than 5 days since your puja date — say “human agent” and we will escalate with the team.';
  }
  return body;
}

function buildPrasadReply(lang, facts) {
  const product = facts.productName || 'booking';
  const status = (facts.prasadStatus || '').toLowerCase();
  if (!facts.isPrasad && !status) {
    const addons = (facts.addonNames || []).filter(Boolean);
    const prasadLines = (facts.prasadLineNames || []).filter(Boolean);
    if (prasadLines.length && addons.length) {
      return t(lang, 'factsPrasadLineAndAddonsNoHome', {
        product,
        prasadItems: prasadLines.join(', '),
        addons: addons.join(', '),
      });
    }
    if (prasadLines.length) {
      return t(lang, 'factsPrasadLineNotHomeDelivery', {
        product,
        prasadItems: prasadLines.join(', '),
      });
    }
    if (addons.length) {
      return t(lang, 'factsPrasadNotOnOrderAddons', {
        product,
        addons: addons.join(', '),
      });
    }
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

function buildGuideReply(lang, facts) {
  const parts = [];
  if (facts.recommendedMantra) {
    parts.push(
      lang === 'hi'
        ? `Namaste 🙏 Is booking ke liye recommended mantra: ${facts.recommendedMantra}`
        : `Namaste 🙏 Recommended mantra for your booking: ${facts.recommendedMantra}`,
    );
  }
  if (facts.dosDontsSummary) {
    parts.push(
      lang === 'hi'
        ? `Do's & Don'ts (aapki puja): ${facts.dosDontsSummary}`
        : `Do's & Don'ts for your puja: ${facts.dosDontsSummary}`,
    );
  }
  if (parts.length) {
    parts.push(
      lang === 'hi'
        ? 'Poori guide app mein order details par bhi hai: https://lifeguru.app/profile — WhatsApp par bhi PDF {{PUJA_UPDATES_SENDER}} se bheja ja sakta hai.'
        : 'Full guide is on your order in the app: https://lifeguru.app/profile — we may also have sent a Do\'s & Don\'ts PDF on WhatsApp from {{PUJA_UPDATES_SENDER}}.',
    );
    return applyKbPlaceholders(parts.join('\n\n'));
  }
  return applyKbPlaceholders(t(lang, 'factsPujaGuideFallback'));
}

function buildLiveReply(lang, facts) {
  const product = facts.productName || 'booking';
  if (facts.hasLivePuja === true) {
    return t(lang, 'factsLiveIncluded', { product });
  }
  return t(lang, 'factsLiveNotIncluded', { product });
}

function buildFactsReply(lang, facts, intent) {
  const product = facts.productName || 'booking';
  const status = formatStatus(facts.orderStatus, lang);
  const when = formatWhen(facts.scheduledAt, lang);
  const puja = when
    ? t(lang, 'factsPuja', { product, when, status })
    : t(lang, 'factsPujaUnknown', { product, status });
  const video = buildVideoReply(lang, facts);
  const prasad = buildPrasadReply(lang, facts);

  if (intent === 'guide') return buildGuideReply(lang, facts);
  if (intent === 'live') return buildLiveReply(lang, facts);
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
  let facts;
  try {
    facts = await factsClient.getOrderFacts(state.orderId, state.customerId);
  } catch (err) {
    console.error('[support] admin getOrderFacts failed', err.message || err);
    if (config.supportFailOpenForward) {
      return failOpenHandoff(state, lang, intentText, 'admin_order_facts_failed');
    }
    return { state, response: forward(lang) };
  }
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
  buildVideoReply,
  buildPrasadReply,
  buildLiveReply,
  buildFactsReply,
  answerForOrder,
};
