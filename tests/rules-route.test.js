const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { tryRulesRoute } = require('../src/conversation/rulesRoute');

describe('rules-first routing', () => {
  it('routes puja/video keywords to admin without LLM', () => {
    const r = tryRulesRoute({ stage: 'await_query', language: 'en' }, 'when is my puja');
    assert.equal(r.route, 'admin');
    assert.equal(r.intent, 'puja');
    assert.equal(r.reason, 'rules_intent');
  });

  it('routes Roman Gujarati mari puja keware awse to admin', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'mari puja keware awse');
    assert.equal(r.route, 'admin');
    assert.equal(r.intent, 'puja');
    assert.equal(r.usedLlm, false);
  });

  it('routes hello to welcome without LLM', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'hello');
    assert.equal(r.route, 'welcome');
    assert.equal(r.reason, 'rules_welcome');
  });

  it('routes short thanks to thanks without LLM', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'thank you');
    assert.equal(r.route, 'thanks');
    assert.equal(r.reason, 'rules_thanks');
  });

  it('routes help to clarify chips', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'help');
    assert.equal(r.route, 'clarify');
    assert.equal(r.reason, 'rules_help');
  });

  it('returns null for ambiguous text needing LLM', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'naam change karna hai sankalp mein');
    assert.equal(r, null);
  });

  it('routes new booking intent to faq not admin', () => {
    const r = tryRulesRoute({ stage: 'await_query', language: 'en' }, 'I want to get puja done');
    assert.equal(r.route, 'faq');
    assert.equal(r.reason, 'rules_new_booking');
  });

  it('routes Gujarati mane puja karawu che to faq not admin lookup', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'mane puja karawu che');
    assert.equal(r.route, 'faq');
    assert.equal(r.reason, 'rules_new_booking');
  });

  it('routes money-return puja question to policy faq not admin', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'best puja with max money returns');
    assert.equal(r.route, 'faq');
    assert.equal(r.reason, 'rules_faq');
  });

  it('routes messages with links to human', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'see this https://example.com/payment');
    assert.equal(r.route, 'human');
    assert.equal(r.reason, 'rules_direct_human');
  });

  it('routes autopay and deduction questions to human not FAQ', () => {
    const autopay = tryRulesRoute({ stage: 'await_query' }, '501 autopay kyu kata');
    assert.equal(autopay.route, 'human');
    assert.equal(autopay.reason, 'rules_direct_human');
    const call = tryRulesRoute({ stage: 'await_query' }, 'Can u call me??');
    assert.equal(call.route, 'human');
  });

  it('does not treat the word puja alone as an existing booking', () => {
    assert.equal(tryRulesRoute({ stage: 'await_query' }, 'tell me about puja'), null);
  });
});
