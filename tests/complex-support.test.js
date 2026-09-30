const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyIntent,
  isComplexSupportMessage,
  needsEmpatheticHumanHandoff,
} = require('../src/conversation/intent');
const { tryRulesRoute } = require('../src/conversation/rulesRoute');
const { normalizeClassifyResult } = require('../src/llm/classify');
const { handleTurn } = require('../src/pipeline/turn');
const { createStubFactsClient } = require('./helpers/stubFactsClient');

const DISTRESS =
  'Mera karobaar me koi sale nahi ho pa raha hai Main 51 charaunga toh mera karobaar ko khol de sakenge plz ' +
  'Mera ma continuous bimar hai Paisa k liye ek dost ko bhi partner banaya mere karobaar pe uska bhi Paisa faas gaya ' +
  'Filhaal 51 de payenge 20k tak sale minimum karba dijiye taake dost ka pura outstanding chuka saake Jo puja se possible dekhiye na';

describe('complex emotional support', () => {
  it('does not keyword-match puja on distress wall-of-text', () => {
    assert.equal(isComplexSupportMessage(DISTRESS), true);
    assert.equal(classifyIntent(DISTRESS), null);
    assert.equal(needsEmpatheticHumanHandoff(DISTRESS), true);
  });

  it('rules_first forwards human with empathy, not admin', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, DISTRESS);
    assert.equal(r.route, 'human');
    assert.equal(r.empathetic, true);
    assert.equal(r.reason, 'rules_complex_human');
  });

  it('LLM fallback to human when Gemini unavailable on complex text', () => {
    const r = normalizeClassifyResult(null, DISTRESS);
    assert.equal(r.route, 'human');
    assert.equal(r.empathetic, true);
  });

  it('engine forwards instead of listing bookings on chat phone', async () => {
    const facts = createStubFactsClient();
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    const result = await handleTurn(
      { state, text: DISTRESS, chatPhone: '9876543210' },
      facts,
    );
    assert.equal(result.response.action, 'forward');
    assert.match(result.response.replies.join(' '), /टीम|team|sorry|दुख|listen/i);
    assert.doesNotMatch(result.response.replies.join(' '), /बुकिंग दिख|these bookings/i);
  });

  it('still routes short puja status queries to admin intent', () => {
    assert.equal(classifyIntent('meri puja kab hai'), 'puja');
    const r = tryRulesRoute({ stage: 'await_query' }, 'meri puja kab hai');
    assert.equal(r.route, 'admin');
    assert.equal(r.intent, 'puja');
  });
});
