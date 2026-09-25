const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeWebhookPayload,
  conversationKey,
  messageText,
  visitorPhone,
  isNewChat,
  buildFailureResponse,
} = require('../src/salesiq/payload');

describe('salesiq payload', () => {
  it('reads visitor phone from webhook and entity shapes', () => {
    assert.equal(
      visitorPhone({ visitor: { phone: '919876543210' } }),
      '919876543210',
    );
    assert.equal(
      visitorPhone({
        entity: { visitor: { mobile: '9876543210' } },
      }),
      '9876543210',
    );
    assert.equal(
      visitorPhone({ visitor_info: { phone: '9826312985' } }),
      '9826312985',
    );
  });

  it('conversation key prefers conversation_id', () => {
    assert.equal(
      conversationKey({
        request: { conversation_id: 'c-99' },
        visitor: { id: 'v-1' },
      }),
      'c-99',
    );
  });

  it('conversation key uses bot preview active_conversation_id', () => {
    assert.equal(
      conversationKey({
        visitor: { active_conversation_id: 'botpreview_123' },
      }),
      'botpreview_123',
    );
  });

  it('failure handler key ignores per-request id when active_conversation_id exists', () => {
    assert.equal(
      conversationKey({
        handler: 'failure',
        visitor: { active_conversation_id: 'botpreview_123' },
        request: { id: 'unique-failure-request-id' },
      }),
      'botpreview_123',
    );
  });

  it('buildFailureResponse returns reply for failed forward', () => {
    const res = buildFailureResponse(
      { handler: 'failure', failed_response: { action: 'forward' } },
      { language: 'hi' },
    );
    assert.equal(res.action, 'reply');
    assert.match(res.replies[0], /एजेंट|टीम/);
  });

  it('detects non-text media on message', () => {
    const { messageHasNonTextMedia } = require('../src/salesiq/payload');
    assert.equal(messageHasNonTextMedia({ message: { type: 'audio' } }), true);
    assert.equal(messageHasNonTextMedia({ message: { type: 'text', text: 'hi' } }), false);
    assert.equal(messageHasNonTextMedia({ message: { type: 'image', url: 'https://x' } }), true);
  });

  it('message text from nested message object', () => {
    assert.equal(messageText({ message: { text: 'hello' } }), 'hello');
  });

  it('detects new chat on trigger', () => {
    assert.equal(isNewChat({ handler: 'trigger' }), true);
    assert.equal(isNewChat({ handler: 'message' }), false);
  });

  it('normalizeWebhookPayload merges entity visitor and conversation id', () => {
    const normalized = normalizeWebhookPayload({
      handler: 'message',
      entity: {
        id: '8000000005001',
        message: { text: 'video?' },
        visitor: { phone: '919876543210' },
      },
    });
    assert.equal(visitorPhone(normalized), '919876543210');
    assert.equal(conversationKey(normalized), '8000000005001');
    assert.equal(messageText(normalized), 'video?');
  });

  it('message text from answers array (chips)', () => {
    assert.equal(
      messageText({ answers: [{ text: 'Video' }] }),
      'Video',
    );
  });
});
