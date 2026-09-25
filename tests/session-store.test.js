const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createSessionStore } = require('../src/session/createStore');

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
    assert.equal(await store.get('chat-a').language, undefined);
  });
});
