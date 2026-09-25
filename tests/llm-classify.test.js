const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeClassifyResult } = require('../src/llm/classify');
const { applyClassifyResult } = require('../src/pipeline/router');

describe('llm classify normalize', () => {
  it('falls back to rules when LLM returns nothing', () => {
    const r = normalizeClassifyResult(null, 'video kab milegi');
    assert.equal(r.route, 'admin');
    assert.equal(r.intent, 'video');
    assert.equal(r.usedLlm, false);
  });

  it('falls back to puja intent for Spanish mixed with puja keyword', () => {
    const r = normalizeClassifyResult(null, 'cuando en mi puja');
    assert.equal(r.route, 'admin');
    assert.equal(r.intent, 'puja');
  });

  it('maps admin video from LLM JSON', () => {
    const r = normalizeClassifyResult(
      { language: 'hi', route: 'admin', intent: 'video', reason: 'ok' },
      'mera video',
    );
    assert.equal(r.route, 'admin');
    assert.equal(r.intent, 'video');
    assert.equal(r.language, 'hi');
  });

  it('routes human for refund-like LLM route', () => {
    const r = normalizeClassifyResult(
      { language: 'en', route: 'human', intent: null, reason: 'refund' },
      'refund my money',
    );
    assert.equal(r.route, 'human');
  });
});

describe('classify routing language', () => {
  it('does not overwrite the language detected from the user message', () => {
    const result = applyClassifyResult(
      { stage: 'await_query', language: 'en' },
      'en',
      { language: 'hi', route: 'clarify', intent: null, reason: 'ambiguous' },
    );
    assert.equal(result.state.language, 'en');
  });
});

describe('llm classify on API failure', () => {
  it('returns human when Gemini is required but unavailable', async () => {
    const { classifyUserMessage } = require('../src/llm/classify');
    const orig = global.fetch;
    global.fetch = async () => ({ ok: false, status: 503, text: async () => 'unavailable' });
    try {
      const r = await classifyUserMessage({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash-lite',
        userText: 'video kab aayega',
      });
      assert.equal(r.route, 'admin');
      assert.equal(r.intent, 'video');
      assert.equal(r.llmError, true);
      assert.match(r.reason, /llm_unavailable/);
    } finally {
      global.fetch = orig;
    }
  });
});
