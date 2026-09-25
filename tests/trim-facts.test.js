const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { trimProductName, normalizeFactsPayload } = require('../src/orders/trimFacts');
const { fetchWithTimeout } = require('../src/orders/factsClient');

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

describe('facts API timeout', () => {
  it('aborts a slow Admin request', async () => {
    const originalFetch = global.fetch;
    global.fetch = (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    try {
      await assert.rejects(
        fetchWithTimeout('https://example.invalid', {}, 5),
        /facts API timeout after 5ms/,
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
