const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parsePolishedReplies } = require('../src/llm/polish');

describe('llm polish parse', () => {
  it('reads replies from a JSON blob', () => {
    const fallback = ['draft'];
    const out = parsePolishedReplies(
      '```json\n{"replies":["Namaste, your puja is on 12 Sep."]}\n```',
      fallback,
    );
    assert.deepEqual(out, ['Namaste, your puja is on 12 Sep.']);
  });

  it('falls back when JSON is missing', () => {
    const fallback = ['draft'];
    assert.deepEqual(parsePolishedReplies('sorry', fallback), fallback);
  });
});
