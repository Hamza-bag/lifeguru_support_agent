const config = require('../config');
const { tryRulesRoute } = require('./rulesRoute');
const {
  wordCount,
  isClearPostBookingStatusQuery,
  isPureSocialGreeting,
  isPureThanks,
  wantsHuman,
  requiresDirectHumanHandoffText,
  isSankalpOrGotraChangeRequest,
  intentFromTopicChoice,
  followUpOnOpenBooking,
} = require('./intent');
const { shouldSkipLlmClassify } = require('./routingGate');

const GAP_MS = Number(process.env.SUPPORT_BURST_GAP_MS) || 12000;
const MAX_PARTS = Number(process.env.SUPPORT_BURST_MAX_PARTS) || 5;
const MAX_WAIT_MS = Number(process.env.SUPPORT_BURST_MAX_WAIT_MS) || 8000;

function isBurstFragmentOnly(text) {
  const raw = String(text || '').trim();
  if (!raw) return false;
  if (/^[\s?.!,…]+$/.test(raw)) return false;
  return wordCount(raw) <= 2;
}

function shouldUseBurstBuffer(state, text, input) {
  if (!config.burstMergeRouting) return false;
  if (input?.isNewChat) return false;
  const raw = String(text || '').trim();
  if (!raw) return false;
  const stage = state?.stage || 'await_query';
  if (!['await_query', 'pick_topic'].includes(stage)) return false;
  if (!isBurstFragmentOnly(raw)) return false;
  if (state?.orderId && followUpOnOpenBooking(raw)) return false;
  if (shouldSkipLlmClassify(state, raw)) return false;
  if (requiresDirectHumanHandoffText(raw)) return false;
  if (isSankalpOrGotraChangeRequest(raw)) return false;
  if (isPureSocialGreeting(raw) || isPureThanks(raw)) return false;
  if (intentFromTopicChoice(raw)) return false;
  return true;
}

function rulesConfidentForCombined(state, combined, buf, lang) {
  const hit = tryRulesRoute({ ...state, language: lang }, combined);
  if (!hit) return false;
  if (hit.route === 'clarify') return false;
  if (hit.route === 'admin' && buf.parts.length > 1 && !bookingBurstLooksComplete(combined, buf)) {
    return false;
  }
  return true;
}

/** Avoid firing Admin on partial "meri" + "puja" before "kab hai" arrives. */
function bookingBurstLooksComplete(combined, buf) {
  if (!isClearPostBookingStatusQuery(combined)) return false;
  if (buf.parts.length <= 1) return true;
  if (wordCount(combined) >= 5) return true;
  if (
    /\b(kab|when|kyare|keware|awse|aavse|status|time|aayeg|aayega|milega|milegi|nahi|video|prasad)\b/i.test(
      combined,
    )
  ) {
    return true;
  }
  return false;
}

function isBurstReady(state, combined, buf, lang) {
  if (!combined.trim()) return false;
  if (/^[\s?.!,…]+$/.test(combined.trim()) && buf.parts.length >= 2) return true;
  if (requiresDirectHumanHandoffText(combined)) return true;
  if (isSankalpOrGotraChangeRequest(combined)) return true;
  if (wantsHuman(combined)) return true;
  if (isPureSocialGreeting(combined) || isPureThanks(combined)) return true;
  if (bookingBurstLooksComplete(combined, buf)) return true;
  if (rulesConfidentForCombined(state, combined, buf, lang)) return true;
  if (wordCount(combined) >= 8) return true;
  if (buf.parts.length >= MAX_PARTS) return true;
  if (Date.now() - buf.startedAt >= MAX_WAIT_MS) return true;
  return false;
}

/**
 * Collect rapid split messages (e.g. "meri" / "puja kab" / "hai") before one route + one reply.
 * While holding: empty SalesIQ reply (no Admin / classify / mirror).
 */
function applyBurstBuffer(state, newPart, lang) {
  const now = Date.now();
  const part = String(newPart || '').trim();
  let buf = state.userBurstBuffer;
  if (!buf || now - buf.lastAt > GAP_MS) {
    buf = { parts: [], startedAt: now, lastAt: now };
  } else {
    buf = { ...buf, parts: [...buf.parts] };
  }

  buf.parts.push(part);
  buf.lastAt = now;
  const combined = buf.parts.join(' ').replace(/\s+/g, ' ').trim();

  if (isBurstReady(state, combined, buf, lang)) {
    return {
      state: { ...state, userBurstBuffer: null },
      combined,
      hold: false,
    };
  }

  return {
    state: { ...state, userBurstBuffer: buf },
    combined,
    hold: true,
  };
}

module.exports = {
  shouldUseBurstBuffer,
  applyBurstBuffer,
  GAP_MS,
  MAX_PARTS,
  MAX_WAIT_MS,
};
