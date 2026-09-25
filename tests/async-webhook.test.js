const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { shouldUseAsyncWebhook } = require('../src/salesiq/asyncWebhook');

describe('async webhook', () => {
  const callbackOk = { isConfigured: () => true };

  const pendingConfig = {
    salesIqPendingEnabled: true,
    llmMirrorLanguage: true,
    llmClassifyEnabled: true,
    policy: { routingStrategy: 'rules_first' },
  };

  it('uses pending for an ambiguous turn that needs classify + mirror', () => {
    assert.equal(
      shouldUseAsyncWebhook({
        config: pendingConfig,
        callbackClient: callbackOk,
        payload: { handler: 'message', request: { id: 'req-1' } },
        text: 'naam change karna hai sankalp mein',
        state: { stage: 'await_query' },
        isNewChat: false,
      }),
      true,
    );
  });

  it('keeps a fast rules-first booking-status turn synchronous', () => {
    assert.equal(
      shouldUseAsyncWebhook({
        config: pendingConfig,
        callbackClient: callbackOk,
        payload: { handler: 'message', request: { id: 'req-fast' } },
        text: 'mari puja keware awse',
        state: { stage: 'await_query' },
        isNewChat: false,
      }),
      false,
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
