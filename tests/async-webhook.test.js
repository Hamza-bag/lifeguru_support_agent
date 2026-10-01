const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { shouldUseAsyncWebhook } = require('../src/salesiq/asyncWebhook');

describe('async webhook', () => {
  const callbackOk = { isConfigured: () => true };

  const pendingConfig = {
    salesIqPendingEnabled: true,
    salesIqPendingMode: 'always',
    llmMirrorLanguage: true,
    llmClassifyEnabled: true,
    policy: { routingStrategy: 'rules_first' },
  };

  it('uses pending for admin lookup + mirror (always mode)', () => {
    assert.equal(
      shouldUseAsyncWebhook({
        config: pendingConfig,
        callbackClient: callbackOk,
        payload: { handler: 'message', request: { id: 'req-1' } },
        text: 'mari puja keware awse',
        state: { stage: 'await_query' },
        isNewChat: false,
      }),
      true,
    );
  });

  it('auto mode uses pending for rules admin (facts + mirror over budget)', () => {
    assert.equal(
      shouldUseAsyncWebhook({
        config: {
          ...pendingConfig,
          salesIqPendingMode: 'auto',
          db: { queryTimeoutMs: 3000 },
          webhookBudgetMs: 5000,
          webhookReserveMs: 250,
        },
        callbackClient: callbackOk,
        payload: { handler: 'message', request: { id: 'req-fast' } },
        text: 'mari puja keware awse',
        state: { stage: 'await_query' },
        isNewChat: false,
      }),
      true,
    );
  });

  it('skips pending without request id', () => {
    assert.equal(
      shouldUseAsyncWebhook({
        config: pendingConfig,
        callbackClient: callbackOk,
        payload: { handler: 'message', request: {} },
        text: 'hello',
        state: { stage: 'await_query' },
        isNewChat: false,
      }),
      false,
    );
  });

  it('auto mode keeps human handoff synchronous when under budget', () => {
    assert.equal(
      shouldUseAsyncWebhook({
        config: {
          ...pendingConfig,
          salesIqPendingMode: 'auto',
          db: { queryTimeoutMs: 3000 },
          webhookBudgetMs: 5000,
          webhookReserveMs: 250,
        },
        callbackClient: callbackOk,
        payload: { handler: 'message', request: { id: 'req-auto' } },
        text: 'naam change karna hai sankalp mein',
        state: { stage: 'await_query' },
        isNewChat: false,
      }),
      false,
    );
  });

  it('keeps deterministic yes/no turns synchronous', () => {
    assert.equal(
      shouldUseAsyncWebhook({
        config: pendingConfig,
        callbackClient: callbackOk,
        payload: { handler: 'message', request: { id: 'req-2' } },
        text: 'no',
        state: { stage: 'ask_more' },
        isNewChat: false,
      }),
      false,
    );
  });
});
