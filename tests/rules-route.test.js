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

  it('answers how long a puja runs from the knowledge base, not the booking clock time', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'puja kitne time chlegi');
    assert.equal(r.route, 'faq');
    assert.equal(r.faqId, 'puja_duration_hours');
  });

  it('treats last puja as the schedule of that booking', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'Last puja?');
    assert.equal(r.route, 'admin');
    assert.equal(r.orderLookup.key, 'latest');
    assert.equal(r.intent, 'puja');
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

  it('asks which booking for a name change, then hands that booking to the team', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'naam change karna hai sankalp mein');
    assert.equal(r.route, 'sankalp_change');
    assert.equal(r.reason, 'rules_sankalp_change');
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

  it('leaves policy questions for the LLM KB pick instead of keyword FAQ or admin', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'best puja with max money returns');
    assert.equal(r, null);
  });

  it('routes messages with links to human', () => {
    const r = tryRulesRoute({ stage: 'await_query' }, 'see this https://example.com/payment');
    assert.equal(r.route, 'human');
    assert.equal(r.reason, 'rules_direct_human');
  });

  it('shares autopay steps, and hands anger or a call to a human', () => {
    const why = tryRulesRoute({ stage: 'await_query' }, '501 autopay kyu kata');
    assert.equal(why.route, 'faq');
    assert.equal(why.faqId, 'autopay_501');
    const stop = tryRulesRoute({ stage: 'await_query' }, 'please cancel my autopay');
    assert.equal(stop.faqId, 'sub_autopay_cancel_steps');
    const angry = tryRulesRoute({ stage: 'await_query' }, 'this video is useless, I am furious');
    assert.equal(angry.route, 'human');
    const call = tryRulesRoute({ stage: 'await_query' }, 'Can u call me??');
    assert.equal(call.route, 'human');
  });

  it('does not name a puja as live, and checks only the customer booking', () => {
    const catalogue = tryRulesRoute({ stage: 'await_query' }, 'which puja is live?');
    assert.equal(catalogue.route, 'faq');
    assert.equal(catalogue.faqId, 'live_puja_not_available');
    const mine = tryRulesRoute({ stage: 'await_query' }, 'meri puja live hai kya');
    assert.equal(mine.route, 'admin');
    assert.equal(mine.intent, 'live');
  });

  it('names the catalogue seva for shaadi, karz, Hanuman, and Ganpati', () => {
    assert.equal(
      tryRulesRoute({ stage: 'await_query' }, 'shaadi ke liye konsi puja hai?').faqId,
      'which_puja_marriage',
    );
    assert.equal(
      tryRulesRoute({ stage: 'await_query' }, 'Mujhe karz mukti ke liye aur puja karani hai').faqId,
      'which_puja_debt',
    );
    assert.equal(
      tryRulesRoute({ stage: 'await_query' }, 'how about any hanuman puja for great success?').faqId,
      'which_puja_hanuman',
    );
    assert.equal(
      tryRulesRoute({ stage: 'await_query' }, 'any puja for ganpati bappa?').faqId,
      'which_puja_not_in_catalogue',
    );
  });

  it('does not treat the word puja alone as an existing booking', () => {
    assert.equal(tryRulesRoute({ stage: 'await_query' }, 'tell me about puja'), null);
  });
});
