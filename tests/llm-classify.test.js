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

  it('does not guess a booking lookup from Spanish when the model returns nothing', () => {
    const r = normalizeClassifyResult(null, 'cuando en mi puja');
    assert.equal(r.route, 'clarify');
    assert.equal(r.intent, null);
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

  it('keeps a catalog faq id only on the faq route', () => {
    const r = normalizeClassifyResult(
      { language: 'en', route: 'faq', intent: null, faqId: 'how_to_book', reason: 'book' },
      'how do I book a puja',
    );
    assert.equal(r.route, 'faq');
    assert.equal(r.faqId, 'how_to_book');
  });

  it('drops an invented or off-route faq id', () => {
    const invented = normalizeClassifyResult(
      { language: 'en', route: 'faq', intent: null, faqId: 'not_a_real_card', reason: 'x' },
      'something',
    );
    assert.equal(invented.faqId, null);
    const admin = normalizeClassifyResult(
      { language: 'en', route: 'admin', intent: 'video', faqId: 'how_to_book', reason: 'x' },
      'video',
    );
    assert.equal(admin.faqId, null);
  });

  it('sends an invoice request to a person even when the model picked the GST card', () => {
    const r = normalizeClassifyResult(
      { language: 'en', route: 'faq', intent: null, faqId: 'gst_on_puja', reason: 'tax' },
      'please send my invoice',
    );
    assert.equal(r.route, 'human');
    assert.equal(r.faqId, null);
  });

  it('sends abuse to a person even when the model picked a booking answer', () => {
    const r = normalizeClassifyResult(
      { language: 'en', route: 'admin', intent: 'video', reason: 'video' },
      'this video is useless, I am furious',
    );
    assert.equal(r.route, 'human');
    assert.equal(r.empathetic, true);
  });

  it('routes human for refund-like LLM route', () => {
    const r = normalizeClassifyResult(
      { language: 'en', route: 'human', intent: null, reason: 'refund' },
      'refund my money',
    );
    assert.equal(r.route, 'booking_handoff');
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
