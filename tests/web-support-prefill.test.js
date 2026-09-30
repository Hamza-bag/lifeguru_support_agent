const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseWebSupportPrefill,
  routingTextAfterPrefill,
} = require('../src/lib/webSupportPrefill');

describe('web support prefill', () => {
  it('parses order id and registered mobile from web template', () => {
    const text = `Hi, I need help with my order.

Order ID: 12345

Registered Mobile Number: +91 98765 43210`;
    const p = parseWebSupportPrefill(text);
    assert.equal(p.orderId, '12345');
    assert.equal(p.registeredMobile, '9876543210');
    assert.equal(p.isWebSupportTemplate, true);
  });

  it('routingTextAfterPrefill uses trailing user question', () => {
    const text = `Hi, I need help with my order.
Order ID: 99
Registered Mobile Number: 919876543210
meri puja kab hai`;
    assert.equal(routingTextAfterPrefill(text), 'meri puja kab hai');
  });
});
