const { forwardForHuman } = require('../pipeline/responses');
const { withClassifyMeta } = require('../pipeline/router');

function failOpenHandoff(state, lang, queryText, reason) {
  const classifyMeta = {
    usedLlmClassify: false,
    route: 'human',
    intent: 'human',
    reason: `fail_open:${reason}`,
    llmError: true,
  };
  return {
    state: { ...state, handoffEscalation: reason },
    response: withClassifyMeta(forwardForHuman(lang, queryText, classifyMeta), classifyMeta),
  };
}

module.exports = { failOpenHandoff };
