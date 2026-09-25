const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const {
  GUARDRAILS_PATH,
  readGuardrails,
  guardrailsBlockForPrompt,
  rulesBlockForPrompt,
} = require('../src/content/loadContent');

describe('content guardrails', () => {
  it('guardrails.md exists and is non-empty', () => {
    assert.ok(fs.existsSync(GUARDRAILS_PATH));
    const body = readGuardrails();
    assert.ok(body.length > 200);
    assert.match(body, /polite|Polite/i);
    assert.match(body, /No abuse|Never do/i);
  });

  it('rulesBlockForPrompt includes guardrails before team rules', () => {
    const block = rulesBlockForPrompt();
    assert.match(block, /SAFETY & TONE GUARDRAILS/);
    assert.match(block, /TEAM RULES/);
    const guardIdx = block.indexOf('SAFETY');
    const rulesIdx = block.indexOf('TEAM RULES');
    assert.ok(guardIdx >= 0 && rulesIdx > guardIdx);
    assert.ok(guardrailsBlockForPrompt().includes('hard limits'));
  });
});
