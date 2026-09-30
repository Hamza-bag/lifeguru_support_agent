const {
  wantsHuman,
  wantsNoMore,
  wantsYesMore,
  isPureSocialGreeting,
  isPureThanks,
  requiresDirectHumanHandoffText,
} = require('./intent');

/**
 * When true, skip Gemini classify — use keyword rules only (saves tokens + latency).
 */
function shouldSkipLlmClassify(state, text) {
  const raw = String(text || '').trim();
  if (!raw) return true;

  const stage = state.stage || 'await_query';

  if (stage === 'select_order') {
    const n = Number.parseInt(raw, 10);
    if (Number.isInteger(n) && n >= 1 && n <= (state.orders || []).length) {
      return true;
    }
  }

  if (stage === 'ask_more') {
    if (wantsNoMore(raw) || wantsYesMore(raw) || wantsHuman(raw)) return true;
    const n = Number.parseInt(raw, 10);
    if (Number.isInteger(n) && n >= 1 && n <= (state.orders || []).length) {
      return true;
    }
  }

  if (wantsHuman(raw)) return true;

  if (isPureSocialGreeting(raw) || isPureThanks(raw)) return true;

  if (requiresDirectHumanHandoffText(raw)) return true;

  if (isTopicChipOnly(raw)) return true;

  return false;
}

function isTopicChipOnly(raw) {
  const r = String(raw || '').trim().toLowerCase();
  return /^(puja schedule|puja time|schedule|video|prasad|पूजा समय|पूजा|वीडियो|विडियो|प्रसाद)$/.test(r);
}

/**
 * Skip Gemini mirror when reply is fixed (chips, order pick, yes/no) or trigger-only.
 * Handoff / refund / Hinglish still mirror so forward lines match the user's language.
 */
function shouldSkipLlmMirror(state, text) {
  const raw = String(text || '').trim();
  if (!raw) return true;

  const stage = state.stage || 'await_query';

  if (stage === 'select_order') {
    const n = Number.parseInt(raw, 10);
    if (Number.isInteger(n) && n >= 1 && n <= (state.orders || []).length) {
      return true;
    }
  }

  if (stage === 'ask_more') {
    if (wantsNoMore(raw) || wantsYesMore(raw)) return true;
    const n = Number.parseInt(raw, 10);
    if (Number.isInteger(n) && n >= 1 && n <= (state.orders || []).length) {
      return true;
    }
  }

  if (isPureSocialGreeting(raw) || isPureThanks(raw)) return true;

  if (isTopicChipOnly(raw)) return true;

  if (stage === 'await_booking_number') {
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 10) return true;
  }

  // English and Hindi templates already match those registers. Mirror stays on for
  // Hinglish and other languages, where the template language is not the user's.
  if (state.replyRegister === 'en' || state.replyRegister === 'devanagari') return true;

  return false;
}

module.exports = { shouldSkipLlmClassify, shouldSkipLlmMirror };
