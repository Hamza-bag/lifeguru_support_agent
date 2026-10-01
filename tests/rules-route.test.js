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

  it('treats last puja as the schedule of that booking', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'Last puja?');
    assert.equal(r.route, 'admin');
    assert.equal(r.orderLookup.key, 'latest');
    assert.equal(r.intent, 'puja');
  });

  it('leaves a non-Hindi booking question for the model', () => {
    assert.equal(tryRulesRoute({ stage: 'await_query' }, 'mari puja keware awse'), null);
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

  it('leaves odd wording for the model', () => {
    for (const text of ['I want to get puja done', 'Can u call me??']) {
      assert.equal(tryRulesRoute({ stage: 'await_query' }, text), null, text);
    }
  });

  it('keeps the demo shortcuts that must not depend on the model', () => {
    assert.equal(
      tryRulesRoute({ stage: 'await_query' }, 'naam change karna hai sankalp mein').route,
      'sankalp_change',
    );
    assert.equal(
      tryRulesRoute({ stage: 'await_query' }, 'puja kitne time chlegi').faqId,
      'puja_duration_hours',
    );
    assert.equal(
      tryRulesRoute({ stage: 'await_query' }, 'please cancel my autopay').faqId,
      'sub_autopay_cancel_steps',
    );
    assert.equal(
      tryRulesRoute({ stage: 'await_query' }, 'shaadi ke liye konsi puja hai?').faqId,
      'which_puja_marriage',
    );
    assert.equal(
      tryRulesRoute({ stage: 'await_query' }, 'this video is useless, I am furious').route,
      'human',
    );
    assert.equal(tryRulesRoute({ stage: 'await_query' }, 'agent se baat karao'), null);
    assert.equal(tryRulesRoute({ stage: 'await_query' }, 'hey, help chahiye').route, 'clarify');
  });

  it('leaves policy questions for the LLM KB pick instead of keyword FAQ or admin', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'best puja with max money returns');
    assert.equal(r, null);
  });

  it('routes messages with links to human', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'see this https://example.com/payment');
    assert.equal(r.route, 'human');
    assert.equal(r.reason, 'rules_direct_human');
  });

  it('lists bookings before a refund, and answers AutoPay from the knowledge base', () => {
    const refund = tryRulesRoute({ stage: 'await_query' }, 'I want refund for puja');
    assert.equal(refund.route, 'booking_handoff');
    assert.equal(
      tryRulesRoute({ stage: 'await_query' }, 'Autopay cancel karna hai paise cut gaye').faqId,
      'sub_autopay_cancel_steps',
    );
  });

  it('does not name a puja as live, and checks only the customer booking', () => {
    const catalogue = tryRulesRoute({ stage: 'await_query' }, 'which puja is live?');
    assert.equal(catalogue.route, 'faq');
    assert.equal(catalogue.faqId, 'live_puja_not_available');
    const mine = tryRulesRoute({ stage: 'await_query' }, 'meri puja live hai kya');
    assert.equal(mine.route, 'admin');
    assert.equal(mine.intent, 'live');
  });

  it('does not treat the word puja alone as an existing booking', () => {
    assert.equal(tryRulesRoute({ stage: 'await_query' }, 'tell me about puja'), null);
  });
});
