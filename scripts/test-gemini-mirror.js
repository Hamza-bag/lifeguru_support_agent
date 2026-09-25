#!/usr/bin/env node
/** Smoke-test language mirror (same path as webhook). */
require('dotenv').config();
const config = require('../src/config');
const { mirrorReplyLanguage } = require('../src/llm/polish');
const { rulesBlockForPrompt } = require('../src/content/loadContent');

async function main() {
  console.log('llmMirrorLanguage=', config.llmMirrorLanguage);
  console.log('model=', config.geminiModel);
  console.log('mirrorTimeoutMs=', config.llmMirrorTimeoutMs);
  if (!config.geminiApiKey) {
    console.error('Missing GEMINI_API_KEY');
    process.exit(1);
  }
  const userText = 'meri puja kab complete hogi bata do pls';
  const drafts = [
    'Your Satyanarayan puja is scheduled for 31 Oct 2026, 1:18 pm. Current status: paid.',
    'Is there anything else I can help with?',
  ];
  const r = await mirrorReplyLanguage({
    apiKey: config.geminiApiKey,
    model: config.geminiModel,
    lang: 'en',
    userText,
    drafts,
    action: 'reply',
    timeoutMs: config.llmMirrorTimeoutMs,
    rulesBlock: rulesBlockForPrompt(),
  });
  console.log('usedLlm=', r.usedLlm);
  if (r.skipReason) console.log('skipReason=', r.skipReason);
  console.log('replies=', JSON.stringify(r.replies, null, 2));
  if (!r.usedLlm) {
    console.error('Mirror failed — webhook will show English/Hindi templates only.');
    process.exit(1);
  }
  console.log('Mirror OK');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
