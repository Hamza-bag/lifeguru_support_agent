const policy = require('../config/policy');
const { normalizePhoneDigits } = require('../orders/phone');

/** A saved chat belongs to one WhatsApp number. A different number starts a new chat. */
function sessionAllowsVisitor(state, incomingPhone) {
  if (!state?.chatPhone || !incomingPhone) return true;
  const saved = normalizePhoneDigits(state.chatPhone);
  const incoming = normalizePhoneDigits(incomingPhone);
  if (!saved || !incoming) return true;
  return saved === incoming;
}

function resolveChatPhone(input, state) {
  const fromInput = normalizePhoneDigits(input.chatPhone || '');
  if (fromInput) {
    return { phone: fromInput, source: 'visitor' };
  }
  // Session phone is only the WhatsApp visitor number saved earlier — never a number typed in chat.
  if (state.chatPhone && state.chatPhoneSource === 'visitor') {
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

module.exports = { resolveChatPhone, sessionAllowsVisitor };
