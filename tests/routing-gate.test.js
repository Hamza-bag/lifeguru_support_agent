const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { shouldSkipLlmClassify, shouldSkipLlmMirror } = require('../src/conversation/routingGate');
const {
  normalizeUserText,
  mergeRecentUserForRouting,
  BURST_GAP_MS,
} = require('../src/conversation/chatContext');

describe('routingGate', () => {
  it('skips LLM for order number pick', () => {
    const state = { stage: 'select_order', orders: [{ id: '1' }, { id: '2' }] };
    assert.equal(shouldSkipLlmClassify(state, '2'), true);
  });

  it('skips LLM for no on ask_more', () => {
    assert.equal(shouldSkipLlmClassify({ stage: 'ask_more' }, 'no'), true);
  });

  it('does not skip open question', () => {
    assert.equal(shouldSkipLlmClassify({ stage: 'await_query' }, 'video kab aayega'), false);
  });

  it('still mirrors refund / handoff lines', () => {
    assert.equal(shouldSkipLlmMirror({ stage: 'await_query' }, 'Refund chahiye'), false);
    assert.equal(shouldSkipLlmMirror({ stage: 'await_query' }, 'human agent'), false);
  });

  it('skips mirror when the template language already matches', () => {
    assert.equal(
      shouldSkipLlmMirror({ stage: 'await_query', replyRegister: 'en' }, 'when is my puja'),
      true,
    );
    assert.equal(
      shouldSkipLlmMirror({ stage: 'await_query', replyRegister: 'devanagari' }, 'पूजा कब है'),
      true,
    );
    assert.equal(
      shouldSkipLlmMirror(
        { stage: 'await_query', replyRegister: 'hinglish_or_roman_hi' },
        'video kab aayega',
      ),
      false,
    );
  });

  it('skips mirror for hello and order pick', () => {
    assert.equal(shouldSkipLlmMirror({ stage: 'await_query' }, 'Hi'), true);
    assert.equal(
      shouldSkipLlmMirror({ stage: 'select_order', orders: [{ id: '1' }] }, '1'),
      true,
    );
  });
});

describe('chatContext', () => {
  it('merges multiline user input', () => {
    assert.equal(
      normalizeUserText('video nahi aaya\norder 2 wala'),
      'video nahi aaya | order 2 wala',
    );
  });

  it('merges rapid follow-up user lines for routing', () => {
    const state = {
      turns: [{ role: 'user', text: 'meri puja kab hai', at: Date.now() - 1000 }],
    };
    assert.equal(
      mergeRecentUserForRouting(state, 'video bhi nahi aaya'),
      'meri puja kab hai | video bhi nahi aaya',
    );
    const stale = {
      turns: [{ role: 'user', text: 'hello', at: Date.now() - BURST_GAP_MS - 1000 }],
    };
    assert.equal(mergeRecentUserForRouting(stale, 'puja time'), 'puja time');
  });
});
