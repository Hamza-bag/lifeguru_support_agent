const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildClassifyPrompt } = require('../src/llm/classify');
const { classifyRulesBlockForPrompt, rulesBlockForPrompt } = require('../src/content/loadContent');

describe('classify prompt size', () => {
  it('classify block is shorter than full mirror block', () => {
    assert.ok(classifyRulesBlockForPrompt().length < rulesBlockForPrompt().length);
  });

  it('classify prompt includes router summary', () => {
    const prompt = buildClassifyPrompt('mari puja keware awse', '');
    assert.match(prompt, /admin|clarify/i);
    assert.match(prompt, /mari puja keware awse/);
  });
});
