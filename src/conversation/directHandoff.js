const { requiresDirectHumanHandoffText } = require('./intent');
const { messageHasNonTextMedia } = require('../salesiq/payload');

/** Screenshot, call request, payment/autopay, or SalesIQ media — human only, no FAQ/Admin/Gemini route. */
function requiresDirectHumanHandoff(text, payload) {
  if (payload && messageHasNonTextMedia(payload)) return true;
  return requiresDirectHumanHandoffText(text);
}

module.exports = { requiresDirectHumanHandoff };
