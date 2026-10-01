const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { estimateSyncTurnMs, syncWebhookBudgetMs } = require('../src/lib/webhookBudget');
const { shouldUseAsyncWebhook } = require('../src/salesiq/asyncWebhook');

describe('webhook budget estimate', () => {
  const baseConfig = {
    webhookBudgetMs: 5000,
    webhookReserveMs: 250,
    llmClassifyEnabled: true,
    llmClassifyTimeoutMs: 3000,
    llmMirrorLanguage: true,
    llmMirrorTimeoutMs: 6000,
    db: { queryTimeoutMs: 3000 },
    policy: { routingStrategy: 'rules_first' },
  };

  it('admin-style query estimate exceeds 5s budget', () => {
    const est = estimateSyncTurnMs({
      config: baseConfig,
      state: { stage: 'await_query' },
      text: 'mari puja keware awse',
    });
    assert.ok(est > syncWebhookBudgetMs(baseConfig));
  });

  it('human handoff estimate stays under budget (sync)', () => {
    const est = estimateSyncTurnMs({
      config: baseConfig,
      state: { stage: 'await_query' },
      text: 'naam change karna hai sankalp mein',
    });
    assert.ok(est <= syncWebhookBudgetMs(baseConfig));
  });
});

describe('auto pending mode', () => {
  const callbackOk = { isConfigured: () => true };
  const cfg = {
    salesIqPendingEnabled: true,
    salesIqPendingMode: 'auto',
    llmMirrorLanguage: true,
    llmClassifyEnabled: true,
    llmClassifyTimeoutMs: 3000,
    llmMirrorTimeoutMs: 6000,
    webhookBudgetMs: 5000,
    webhookReserveMs: 250,
    db: { queryTimeoutMs: 3000 },
    policy: { routingStrategy: 'rules_first' },
  };

  it('uses pending for admin-heavy turns', () => {
    assert.equal(
      shouldUseAsyncWebhook({
        config: cfg,
        callbackClient: callbackOk,
        payload: { handler: 'message', request: { id: 'r1' } },
        text: 'mari puja keware awse',
        state: { stage: 'await_query' },
        isNewChat: false,
      }),
      true,
    );
  });

  it('stays sync for human classify under budget', () => {
    assert.equal(
      shouldUseAsyncWebhook({
        config: cfg,
        callbackClient: callbackOk,
        payload: { handler: 'message', request: { id: 'r2' } },
        text: 'naam change karna hai sankalp mein',
        state: { stage: 'await_query' },
        isNewChat: false,
      }),
      false,
    );
  });
});
