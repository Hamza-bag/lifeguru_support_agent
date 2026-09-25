const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mirrorTimeoutMs } = require('../src/lib/webhookBudget');

describe('webhook budget', () => {
  it('caps mirror timeout to remaining budget', () => {
    const config = {
      llmMirrorTimeoutMs: 8000,
      webhookBudgetMs: 5000,
      webhookReserveMs: 250,
    };
    const started = Date.now() - 2000;
    const t = mirrorTimeoutMs({ config, webhookStartedAt: started });
    assert.equal(t, 5000 - 2000 - 250);
  });

  it('returns 0 when budget exhausted', () => {
    const config = { llmMirrorTimeoutMs: 6000, webhookBudgetMs: 5000, webhookReserveMs: 250 };
    const t = mirrorTimeoutMs({ config, webhookStartedAt: Date.now() - 4900 });
    assert.equal(t, 0);
  });
});
