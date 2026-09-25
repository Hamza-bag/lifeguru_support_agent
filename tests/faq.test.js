const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { matchFaq } = require('../src/faq/matchFaq');

describe('faq match', () => {
  it('matches autopay 501', () => {
    const hit = matchFaq('501 autopay kyu kata', 'hi');
    assert.equal(hit?.id, 'autopay_501');
    assert.ok(hit.text.includes('501'));
  });

  it('returns null for unrelated', () => {
    assert.equal(matchFaq('when is my puja for order 1', 'en'), null);
  });
});
