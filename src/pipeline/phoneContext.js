const policy = require('../config/policy');
const { normalizePhoneDigits } = require('../orders/phone');

function resolveChatPhone(input, state) {
  const fromInput = normalizePhoneDigits(input.chatPhone || '');
  if (fromInput) {
    return { phone: fromInput, source: 'visitor' };
  }
  if (state.chatPhone) {
    return { phone: state.chatPhone, source: 'session' };
  }
  if (policy.allowDefaultChatPhone && policy.defaultChatPhone) {
    return {
      phone: normalizePhoneDigits(policy.defaultChatPhone),
      source: 'default_chat_phone',
    };
  }
  return { phone: null, source: 'none' };
}

module.exports = { resolveChatPhone };
