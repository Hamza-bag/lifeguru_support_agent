const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  isGeminiCircuitOpen,
  recordGeminiFailure,
  resetGeminiCircuitForTests,
} = require('../src/llm/geminiCircuit');

describe('gemini circuit breaker', () => {
  beforeEach(() => {
    resetGeminiCircuitForTests();
    process.env.SUPPORT_LLM_CIRCUIT_FAILURES = '3';
    process.env.SUPPORT_LLM_CIRCUIT_COOLDOWN_MS = '1000';
  });

  it('opens after repeated 429s', () => {
    assert.equal(isGeminiCircuitOpen(), false);
    recordGeminiFailure(429);
    recordGeminiFailure(429);
    assert.equal(isGeminiCircuitOpen(), false);
    recordGeminiFailure(429);
    assert.equal(isGeminiCircuitOpen(), true);
  });
});
