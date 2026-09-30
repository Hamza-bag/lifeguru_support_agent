const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { tryRulesRoute } = require('../src/conversation/rulesRoute');

describe('faq routing', () => {
  it('does not keyword-match short fragments such as jap inside japan', () => {
    const hit = tryRulesRoute({ language: 'en', stage: 'await_query' }, 'I am in japan can I book');
    assert.notEqual(hit?.reason, 'rules_faq');
    assert.notEqual(hit?.route, 'faq');
  });

  it('answers a calm autopay question from the knowledge base', () => {
    const hit = tryRulesRoute({ language: 'en', stage: 'await_query' }, '501 autopay kyu kata');
    assert.equal(hit?.route, 'faq');
    assert.equal(hit?.faqId, 'autopay_501');
  });

  it('sends an angry autopay message to a human', () => {
    const hit = tryRulesRoute({ language: 'en', stage: 'await_query' }, 'autopay is a scam, you cheated me');
    assert.equal(hit?.route, 'human');
  });
});
