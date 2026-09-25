const { t } = require('../conversation/copy');
const { needsEmpatheticHumanHandoff } = require('../conversation/intent');
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
  const locale = lang === 'hi' ? 'hi' : 'en';
  const empathetic = Boolean(options.empathetic);
  return {
    action: 'forward',
    replies: [t(locale, empathetic ? 'forwardEmpathetic' : 'forward')],
  };
}

function forwardForHuman(lang, queryText, classifyMeta) {
  const empathetic =
    Boolean(classifyMeta?.empathetic) || needsEmpatheticHumanHandoff(queryText);
  return forward(lang, { empathetic });
}

function endChat(lang) {
  const locale = lang === 'hi' ? 'hi' : 'en';
  return {
    action: 'end',
    replies: [t(locale, 'goodbye')],
  };
}

function welcomePrompt() {
  return reply(WELCOME_QUERY);
}

function greetingReply(lang) {
  const locale = lang === 'hi' ? 'hi' : 'en';
  return reply(t(locale, 'welcomeQuery'));
}

function thanksReply(lang) {
  const locale = lang === 'hi' ? 'hi' : 'en';
  return reply(t(locale, 'thanksAck'));
}

function askMoreSuggestions(lang) {
  return lang === 'hi' ? ['हाँ', 'नहीं', 'एजेंट'] : ['Yes', 'No', 'Human agent'];
}

function whatElseSuggestions(lang) {
  return lang === 'hi' ? ['पूजा समय', 'वीडियो', 'एजेंट'] : ['Puja time', 'Video', 'Human agent'];
}

function askPhoneForHumanReply(lang) {
  return reply(
    kbLines(lang, ['no_whatsapp_phone'], ['askBookingNumber'], t),
    { suggestions: lang === 'hi' ? ['एजेंट'] : ['Human agent'] },
  );
}

function forwardAfterPhoneCollected(lang) {
  const lines = kbLines(lang, ['phone_received_forward'], ['forwardAfterBookingNumber'], t);
  lines.push(t(lang, 'forward'));
  return { action: 'forward', replies: lines };
}

function pickTopicPrompt(state) {
  const lang = state.language || 'en';
  return {
    state: { ...state, stage: 'pick_topic', language: lang },
    response: reply(t(lang, 'pickTopic'), {
      suggestions: topicSuggestions(lang),
    }),
  };
}

module.exports = {
  reply,
  forward,
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
