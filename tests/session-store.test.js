const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createSessionStore } = require('../src/session/createStore');
const { createMemoryStore } = require('../src/session/memoryStore');
const { sessionAllowsVisitor } = require('../src/pipeline/phoneContext');

describe('session store', () => {
  it('memory store get/set async', async () => {
    const store = createSessionStore({ kind: 'memory' });
    assert.equal(await store.get('c1'), null);
    await store.set('c1', { stage: 'await_query', language: 'en' });
    const row = await store.get('c1');
    assert.equal(row.stage, 'await_query');
    await store.clear('c1');
    assert.equal(await store.get('c1'), null);
  });

  it('isolates concurrent conversation keys', async () => {
    const store = createSessionStore({ kind: 'memory' });
    await store.set('chat-a', { stage: 'ask_more', orderId: '1001' });
    await store.set('chat-b', { stage: 'await_query', language: 'hi' });
    assert.equal((await store.get('chat-a')).orderId, '1001');
    assert.equal((await store.get('chat-b')).language, 'hi');
    assert.equal((await store.get('chat-a')).language, undefined);
  });

  it('drops expired memory sessions on sweep', () => {
    const store = createMemoryStore({ ttlMs: -1, sweepMs: 60_000 });
    store.set('old', { stage: 'answer', orderId: '1001' });
    assert.equal(store.get('old'), null);
  });
});

describe('visitor phone session', () => {
  it('rejects a saved chat when the WhatsApp number changes', () => {
    assert.equal(
      sessionAllowsVisitor({ chatPhone: '9876543210' }, '919876543210'),
      true,
    );
    assert.equal(
      sessionAllowsVisitor({ chatPhone: '9876543210' }, '9123456780'),
      false,
    );
    assert.equal(sessionAllowsVisitor({ chatPhone: '9876543210' }, ''), true);
  });
});
