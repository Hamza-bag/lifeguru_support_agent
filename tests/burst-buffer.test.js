const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { handleTurn } = require('../src/pipeline/turn');
const { createStubFactsClient } = require('./helpers/stubFactsClient');

const CHAT = '9876543210';
const facts = createStubFactsClient();

describe('burst buffer (split messages)', () => {
  it('holds fragments then routes once on combined puja question', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);

    const t1 = await handleTurn({ state, text: 'meri', chatPhone: CHAT }, facts);
    assert.equal(t1.response.replies.length, 0);
    const t2 = await handleTurn({ state: t1.state, text: 'puja', chatPhone: CHAT }, facts);
    assert.equal(t2.response.replies.length, 0);

    const done = await handleTurn({ state: t2.state, text: 'kab hai', chatPhone: CHAT }, facts);
    assert.match(done.response.replies.join(' '), /scheduled|Satyanarayan|निर्धारित/i);
    assert.equal(done.state.userBurstBuffer, null);
  });

  it('waits for a third part when two fragments are still unclear', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);

    const t1 = await handleTurn({ state, text: 'meri', chatPhone: CHAT }, facts);
    assert.equal(t1.response.replies.length, 0);

    const t2 = await handleTurn({ state: t1.state, text: 'puja', chatPhone: CHAT }, facts);
    assert.equal(t2.response.replies.length, 0);

    const t3 = await handleTurn({ state: t2.state, text: 'kab hai', chatPhone: CHAT }, facts);
    assert.match(t3.response.replies.join(' '), /scheduled|Satyanarayan|निर्धारित/i);
    assert.equal(t3.state.userBurstBuffer, null);
  });

  it('does not hold complete sentences (sankalp name change → handoff)', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    await handleTurn({ state, text: 'Hi', chatPhone: CHAT }, facts);
    const r = await handleTurn(
      {
        state: { ...state, stage: 'await_query', language: 'hi' },
        text: 'Snakalp mei naam change kqrna hai',
        chatPhone: CHAT,
      },
      facts,
    );
    assert.ok(r.response.replies.length > 0);
    assert.equal(r.response.action, 'forward');
  });

  it('does not burst-merge punctuation-only follow-ups alone', async () => {
    let { state } = await handleTurn({ text: '', isNewChat: true }, facts);
    const r = await handleTurn(
      { state: { ...state, stage: 'await_query' }, text: '?', chatPhone: CHAT },
      facts,
    );
    assert.ok(r.response.replies.length > 0);
  });
});
