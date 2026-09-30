const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildHandoffNote,
  buildConversationSummary,
  MAX_NOTE,
} = require('../src/conversation/handoffSummary');
const { salesIqConversationId } = require('../src/salesiq/payload');

describe('handoff summary', () => {
  it('buildHandoffNote highlights last query and short summary, not full transcript', () => {
    const note = buildHandoffNote({
      state: {
        language: 'hi',
        chatPhone: '919876543210',
        orderId: 'ORD-1',
        customerName: 'Hamza',
        pendingIntent: 'refund',
        turns: [
          { role: 'user', text: 'Hi' },
          { role: 'bot', text: 'Welcome…' },
          { role: 'user', text: 'meri puja kab hai' },
          { role: 'user', text: 'Refund chahiye' },
        ],
      },
      userText: 'Refund chahiye',
      response: {
        action: 'forward',
        classifyMeta: { route: 'human', reason: 'refund' },
      },
      escalationReason: 'admin_lookup_failed',
    });
    assert.match(note, /Last query: Refund chahiye/);
    assert.match(note, /Summary:/);
    assert.match(note, /Hamza/);
    assert.match(note, /ORD-1/);
    assert.match(note, /Earlier:.*meri puja/i);
    assert.doesNotMatch(note, /^Bot:/m);
    assert.doesNotMatch(note, /Recent:/);
  });

  it('buildConversationSummary compresses prior user lines', () => {
    const summary = buildConversationSummary(
      {
        customerName: 'Test User',
        orders: [{ id: '1' }, { id: '2' }],
        turns: [
          { role: 'user', text: 'Hi' },
          { role: 'user', text: 'video nahi aaya' },
        ],
      },
      'human agent',
    );
    assert.match(summary, /2 booking/);
    assert.match(summary, /Earlier:.*video/i);
  });

  it('salesIqConversationId skips bot preview ids', () => {
    assert.equal(
      salesIqConversationId({
        request: { conversation_id: 'botpreview_abc' },
      }),
      null,
    );
    assert.equal(
      salesIqConversationId({
        request: { conversation_id: '235010000000010005' },
      }),
      '235010000000010005',
    );
  });

  it('truncates very long notes', () => {
    const note = buildHandoffNote({
      state: { turns: [] },
      userText: 'x'.repeat(MAX_NOTE + 100),
      response: { action: 'forward' },
    });
    assert.ok(note.length <= MAX_NOTE);
  });
});
