const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { trimProductName, normalizeFactsPayload } = require('../src/orders/trimFacts');
describe('trimFacts', () => {
  it('shortens very long product names', () => {
    const long = 'A'.repeat(120);
    assert.equal(trimProductName(long).length, 80);
  });

  it('normalizes facts payload', () => {
    const out = normalizeFactsPayload({ productName: '  Satyanarayan Puja  ', orderId: '1' });
    assert.equal(out.productName, 'Satyanarayan Puja');
  });
});
