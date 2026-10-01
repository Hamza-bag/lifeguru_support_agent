const { t, templateLocale } = require('../conversation/copy');
const { kbLines } = require('../faq/matchFaq');
const { topicSuggestions } = require('../conversation/intent');
const { WELCOME_QUERY } = require('./state');

function reply(replies, extra = {}) {
  return {
    action: 'reply',
    replies: Array.isArray(replies) ? replies : [replies],
    ...extra,
  };
}

function forward(lang, options = {}) {
  const locale = templateLocale(lang);
  const empathetic = Boolean(options.empathetic);
  return {
    action: 'forward',
    replies: [t(locale, empathetic ? 'forwardEmpathetic' : 'forward')],
  };
}

function forwardUnclear(lang) {
  const locale = templateLocale(lang);
  return {
    action: 'forward',
    replies: [t(locale, 'forwardUnclear')],
  };
}

function forwardForHuman(lang, queryText, classifyMeta) {
  const empathetic = Boolean(classifyMeta?.empathetic);
  return forward(lang, { empathetic });
}

function endChat(lang) {
  const locale = templateLocale(lang);
  return {
    action: 'end',
    replies: [t(locale, 'goodbye')],
  };
}

function welcomePrompt() {
  return reply(WELCOME_QUERY);
}

function greetingReply(lang) {
  if (lang === 'hi' || lang === 'hinglish') {
    return reply(t(lang, 'welcomeQuery'));
  }
  return reply(WELCOME_QUERY);
}

function thanksReply(lang) {
  return reply(t(templateLocale(lang), 'thanksAck'));
}

function askMoreSuggestions(lang) {
  if (lang === 'hi') return ['हाँ', 'नहीं'];
  if (lang === 'hinglish') return ['Haan', 'Nahi'];
  return ['Yes', 'No'];
}

function whatElseSuggestions(lang) {
  if (lang === 'hi') return ['पूजा समय', 'वीडियो'];
  if (lang === 'hinglish') return ['Puja samay', 'Video'];
  return ['Puja time', 'Video'];
}

function askPhoneForHumanReply(lang) {
  const chip = lang === 'hi' ? 'एजेंट' : lang === 'hinglish' ? 'Team' : 'Human agent';
  return reply(
    kbLines(lang, ['no_whatsapp_phone'], ['askBookingNumber'], t),
    { suggestions: [chip] },
  );
}

function forwardAfterPhoneCollected(lang) {
  const lines = kbLines(lang, ['phone_received_forward'], ['forwardAfterBookingNumber'], t);
  lines.push(t(lang, 'forward'));
  return { action: 'forward', replies: lines };
}

function pickTopicPrompt(state, options = {}) {
  const lang = state.language || 'en';
  const card = t(lang, 'pickTopic');
  const lines = options.greet ? [t(lang, 'welcomeQuery'), card] : [card];
  return {
    state: { ...state, stage: 'pick_topic', language: lang },
    response: reply(lines, {
      suggestions: topicSuggestions(lang),
    }),
  };
}

module.exports = {
  reply,
  forward,
  forwardUnclear,
  forwardForHuman,
  endChat,
  welcomePrompt,
  greetingReply,
  thanksReply,
  askMoreSuggestions,
  whatElseSuggestions,
  askPhoneForHumanReply,
  forwardAfterPhoneCollected,
  pickTopicPrompt,
};
