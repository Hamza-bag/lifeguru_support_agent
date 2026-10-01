const policy = require('../config/policy');
const {
  detectLanguage,
  classifyIntent,
  isOrderIntent,
  intentForBookingQuestion,
  isComplexSupportMessage,
  intentFromTopicChoice,
  isPureSocialGreeting,
  isPureThanks,
  requiresDirectHumanHandoffText,
  isCatalogueLiveQuestion,
  isRefundOrCancelRequest,
  isIrritatedOrAngry,
  isSankalpOrGotraChangeRequest,
  isPujaDurationQuery,
  insistsAgentPerform,
  autopayFaqId,
  isDamagedPrasad,
  isAddPrasadRequest,
  isNoBenefitComplaint,
  isPaymentFailedBooking,
  isBookingConfirmedAsk,
  isClearPostBookingStatusQuery,
} = require('./intent');
const { parseOrderLookup } = require('../orders/orderLookup');
const { whichPujaFaqId } = require('../faq/whichPuja');

/** Two answers for the same card, then a person on the next ask. */
function faqAnswerOrRepeat(state, lang, faqId, reason) {
  if (state.lastFaqId === faqId && (state.faqRepeatCount || 0) >= 2) {
    return {
      language: lang,
      route: 'human',
      intent: 'human',
      reason: 'rules_faq_repeat',
      usedLlm: false,
      llmError: false,
    };
  }
  return {
    language: lang,
    route: 'faq',
    intent: null,
    faqId,
    reason,
    usedLlm: false,
    llmError: false,
  };
}

/** After the cancel steps, a debit question gets the charge card instead of the same steps. */
function autopayChargeFollowUp(state, text) {
  if (state.lastFaqId !== 'sub_autopay_cancel_steps') return null;
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  const cut =
    /\b(paisa|paise|kata|kat|cut|charged|deducted|debit|501|301|701)\b/.test(lower) ||
    /पैसा|कट/.test(raw);
  return cut ? 'autopay_501' : null;
}

function isVagueHelpOnly(text) {
  const raw = String(text || '').trim().toLowerCase();
  if (raw.length < 3) return true;
  if (/^(help|madad|hlp)$/.test(raw)) return true;
  return /^(hey[, ]+|hi[, ]+)?(help|madad)( chahiye| please| pls)?$/.test(raw);
}

function resolveRulesIntent(state, queryText) {
  return (
    state.pendingIntent ||
    intentFromTopicChoice(queryText) ||
    classifyIntent(queryText)
  );
}

/**
 * Fast path for production spikes — no Gemini. Returns null if LLM should run.
 */
function tryRulesRoute(state, queryText) {
  const lang = state.language || detectLanguage(queryText);

  if (state.lastFaqId && insistsAgentPerform(queryText)) {
    return {
      language: lang,
      route: 'human',
      intent: 'human',
      reason: 'rules_insist_after_faq',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isIrritatedOrAngry(queryText)) {
    return {
      language: lang,
      route: 'human',
      intent: 'human',
      reason: 'rules_abuse',
      empathetic: true,
      usedLlm: false,
      llmError: false,
    };
  }

  if (isComplexSupportMessage(queryText)) {
    return null;
  }

  if (isNoBenefitComplaint(queryText)) {
    if ((state.noBenefitAsks || 0) >= 2) {
      return {
        language: lang,
        route: 'human',
        intent: 'human',
        reason: 'rules_no_benefit_repeat',
        usedLlm: false,
        llmError: false,
      };
    }
    return {
      language: lang,
      route: 'faq',
      intent: null,
      faqId: 'puja_no_benefit_no_guarantee',
      reason: 'rules_no_benefit',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isRefundOrCancelRequest(queryText)) {
    return {
      language: lang,
      route: 'booking_handoff',
      intent: 'human',
      reason: 'rules_booking_handoff',
      usedLlm: false,
      llmError: false,
    };
  }

  if (requiresDirectHumanHandoffText(queryText)) {
    return {
      language: lang,
      route: 'human',
      intent: 'human',
      reason: 'rules_direct_human',
      usedLlm: false,
      llmError: false,
    };
  }

  const intent = resolveRulesIntent(state, queryText);

  if (intent === 'human') {
    return {
      language: lang,
      route: 'human',
      intent: 'human',
      reason: 'rules_human',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isSankalpOrGotraChangeRequest(queryText)) {
    return {
      language: lang,
      route: 'sankalp_change',
      intent: 'human',
      reason: 'rules_sankalp_change',
      usedLlm: false,
      llmError: false,
    };
  }

  if (policy.faqEnabled) {
    const which = whichPujaFaqId(queryText);
    const faqId =
      which ||
      (!isClearPostBookingStatusQuery(queryText) && isPujaDurationQuery(queryText)
        ? 'puja_duration_hours'
        : null) ||
      (isDamagedPrasad(queryText) ? 'prasad_box_damaged' : null) ||
      (isAddPrasadRequest(queryText) ? 'prasad_add_after_booking' : null) ||
      (isPaymentFailedBooking(queryText) ? 'payment_done_not_confirmed' : null) ||
      autopayChargeFollowUp(state, queryText) ||
      autopayFaqId(queryText);
    if (faqId) {
      return faqAnswerOrRepeat(state, lang, faqId, `rules_${faqId}`);
    }
  }

  if (isBookingConfirmedAsk(queryText)) {
    return {
      language: lang,
      route: 'admin',
      intent: 'puja',
      reason: 'rules_booking_confirm',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isCatalogueLiveQuestion(queryText) && policy.faqEnabled) {
    return {
      language: lang,
      route: 'faq',
      intent: null,
      faqId: 'live_puja_not_available',
      reason: 'rules_live_catalogue',
      usedLlm: false,
      llmError: false,
    };
  }

  const lookup = parseOrderLookup(queryText);
  if (lookup?.deferToModel) return null;
  if (lookup?.key) {
    return {
      language: lang,
      route: 'admin',
      intent: intentForBookingQuestion(queryText, intent),
      orderLookup: lookup,
      reason: `rules_lookup_${lookup.key}`,
      usedLlm: false,
      llmError: false,
    };
  }

  if (isOrderIntent(intent)) {
    return {
      language: lang,
      route: 'admin',
      intent,
      reason: 'rules_intent',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isPureThanks(queryText)) {
    return {
      language: lang,
      route: 'thanks',
      intent: null,
      reason: 'rules_thanks',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isPureSocialGreeting(queryText)) {
    return {
      language: lang,
      route: 'welcome',
      intent: null,
      reason: 'rules_welcome',
      usedLlm: false,
      llmError: false,
    };
  }

  if (isVagueHelpOnly(queryText)) {
    return {
      language: lang,
      route: 'clarify',
      intent: null,
      reason: 'rules_help',
      usedLlm: false,
      llmError: false,
    };
  }

  return null;
}

module.exports = { tryRulesRoute, isVagueHelpOnly, resolveRulesIntent };
