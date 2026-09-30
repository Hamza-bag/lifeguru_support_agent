const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCallbackBody,
  parseZohoApiBody,
} = require('../src/salesiq/callbackClient');

describe('SalesIQ callback body', () => {
  it('reply callback uses { text } maps (callback API)', () => {
    const body = buildCallbackBody({
      action: 'reply',
      replies: ['Hello from callback'],
    });
    assert.deepEqual(body, {
      action: 'reply',
      replies: [{ text: 'Hello from callback' }],
    });
  });

  it('completes forward as reply with text maps by default', () => {
    const body = buildCallbackBody({
      action: 'forward',
      replies: ['Connecting you to a LifeGuru team member.'],
    });
    assert.equal(body.action, 'reply');
    assert.deepEqual(body.replies, [{ text: 'Connecting you to a LifeGuru team member.' }]);
  });

  it('forward callback keeps plain string replies when configured', () => {
    const body = buildCallbackBody(
      {
        action: 'forward',
        replies: ['Connecting you to a LifeGuru team member.'],
      },
      { salesIqPendingCompleteAsReply: false },
    );
    assert.equal(body.action, 'forward');
    assert.deepEqual(body.replies, ['Connecting you to a LifeGuru team member.']);
  });

  it('forceForward keeps forward action when completeAsReply is default', () => {
    const body = buildCallbackBody(
      {
        action: 'forward',
        replies: ['Connecting you to a LifeGuru team member.'],
      },
      { salesIqPendingCompleteAsReply: true },
      { forceForward: true },
    );
    assert.equal(body.action, 'forward');
  });

  it('detects Zoho error payloads even when HTTP status is 200', () => {
    const parsed = parseZohoApiBody(
      '{"error":{"code":1051,"json_key":"replies[0]","message":"Invalid JSON"}}',
    );
    assert.equal(parsed.ok, false);
  });
});
