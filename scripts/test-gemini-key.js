#!/usr/bin/env node
/**
 * Smoke-test GEMINI_API_KEY + SUPPORT_LLM_CLASSIFY path (no booking lookup).
 */
require('dotenv').config();
const config = require('../src/config');
const { classifyUserMessage } = require('../src/llm/classify');

async function pingModel() {
  if (!config.geminiApiKey) {
    console.error('Missing GEMINI_API_KEY in .env');
    process.exit(1);
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: ok' }] }],
      generationConfig: { maxOutputTokens: 16, temperature: 0 },
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error('Gemini API failed:', res.status, body.slice(0, 400));
    process.exit(1);
  }
  console.log('Gemini API: OK (model', config.geminiModel + ')');
}

async function sampleClassify() {
  const sample = 'bhai mera puja wala video ab tak nahi aaya';
  const r = await classifyUserMessage({
    apiKey: config.geminiApiKey,
    model: config.geminiModel,
    userText: sample,
  });
  console.log('Classify sample:', JSON.stringify(r, null, 2));
  if (r.llmError) {
    console.error('Classify failed — in chat this would forward to human.');
    process.exit(1);
  }
  if (r.route !== 'admin' || r.intent !== 'video') {
    console.warn('Unexpected route/intent for sample (may still be OK):', r.route, r.intent);
  } else {
    console.log('Classify routing looks correct for video question.');
  }
}

async function main() {
  console.log('SUPPORT_LLM_CLASSIFY=', config.llmClassifyEnabled);
  await pingModel();
  await sampleClassify();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
