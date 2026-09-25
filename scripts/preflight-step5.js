#!/usr/bin/env node
/**
 * Step 5 preflight — env + optional Admin smoke + local /health.
 * Usage: npm run preflight:step5
 * Start admin + agent first for full checks.
 */
require('dotenv').config();
const http = require('http');
const config = require('../src/config');
const { createFactsClient } = require('../src/orders/factsClient');

function check(label, ok, detail = '') {
  const mark = ok ? 'OK' : 'FAIL';
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

function getJson(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, json: JSON.parse(Buffer.concat(chunks).toString()) });
        } catch {
          resolve({ ok: false, json: null });
        }
      });
    });
    req.on('error', () => resolve({ ok: false, json: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, json: null });
    });
  });
}

async function main() {
  console.log('Step 5 preflight (lifeguru_support_agent)\n');

  let pass = 0;
  let total = 0;
  const run = (label, ok, detail) => {
    total += 1;
    if (check(label, ok, detail)) pass += 1;
  };

  run('FACTS_MODE=http', config.factsMode === 'http', config.factsMode);
  run('FACTS_API_URL set', Boolean(config.factsApiUrl), config.factsApiUrl || 'missing');
  run('FACTS_API_SECRET set', Boolean(config.factsApiSecret));
  run(
    'Gemini classify ready',
    Boolean(config.geminiApiKey && config.llmClassifyEnabled),
    config.geminiApiKey ? config.geminiModel : 'no GEMINI_API_KEY',
  );
  run(
    'Signature verify OFF (first ngrok test)',
    !config.verifySignature,
    config.verifySignature ? 'set SALESIQ_VERIFY_SIGNATURE=false for Step 5' : '',
  );
  run(
    'Language mirror (user register)',
    Boolean(config.llmMirrorLanguage && config.geminiApiKey),
    config.llmMirrorLanguage
      ? `SUPPORT_LLM_MIRROR_LANGUAGE + ${config.geminiModel} (${config.llmMirrorTimeoutMs}ms)`
      : 'set SUPPORT_LLM_MIRROR_LANGUAGE=true for Hinglish/Gujarati replies',
  );

  if (config.factsMode === 'http' && config.factsApiUrl && config.factsApiSecret) {
    const phone =
      config.policy.defaultChatPhone ||
      (process.env.SUPPORT_SMOKE_PHONE || '').trim() ||
      '9876543210';
    const phoneSource = config.policy.defaultChatPhone
      ? 'DEFAULT_CHAT_PHONE'
      : process.env.SUPPORT_SMOKE_PHONE
        ? 'SUPPORT_SMOKE_PHONE'
        : 'built-in smoke (9876543210)';
    try {
      const client = createFactsClient({
        mode: config.factsMode,
        apiUrl: config.factsApiUrl,
        apiSecret: config.factsApiSecret,
      });
      const lookup = await client.lookupByPhone(phone);
      run(
        'Admin lookup',
        true,
        lookup.matched
          ? `${phoneSource} → matched customerId=${lookup.customerId} orders=${lookup.orders.length}`
          : `${phoneSource} → no orders (404 matched:false is OK — API auth works)`,
      );
    } catch (err) {
      run('Admin lookup', false, err.message || String(err));
    }
  }

  const port = config.port;
  const health = await getJson(`http://127.0.0.1:${port}/health`);
  run(
    'Agent /health',
    health.ok,
    health.ok ? '' : `in another terminal: npm start (port ${port})`,
  );

  const step5 = await getJson(`http://127.0.0.1:${port}/dev/step5`);
  run('Agent /dev/step5', step5.ok);

  console.log(`\n${pass}/${total} checks passed.`);

  if (pass < total) {
    console.log('\nNext:');
    if (!health.ok) {
      console.log('  Terminal A: cd lifeguru_admin_backend && npm start');
      console.log('  Terminal B: cd lifeguru_support_agent && npm start');
    }
    if (config.factsMode !== 'http') console.log('  Set FACTS_MODE=http and Admin URL/secret in .env');
    console.log('  Terminal C: ngrok http 3080');
    console.log('  Doc: docs/support-agent-step5-ngrok-salesiq-safe.md');
    process.exit(1);
  }

  console.log('\nReady for ngrok + SalesIQ (Mode A shadow or Mode B website webhook).');
  console.log('  ngrok URL → https://….ngrok-free.app/salesiq/shadow OR /salesiq/webhook');
  console.log('  Browser: https://YOUR-NGROK/health and /dev/step5');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
