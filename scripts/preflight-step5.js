#!/usr/bin/env node
/**
 * Step 5 preflight — env + optional DB smoke + local /health.
 * Usage: npm run preflight:step5
 */
require('dotenv').config();
const http = require('http');
const config = require('../src/config');
const { createFactsClient } = require('../src/orders/factsClient');
const { closeSequelize } = require('../src/db/sequelize');

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

  run('SUPPORT_DB_HOST set', Boolean(config.db.host), config.db.host || 'missing');
  run('SUPPORT_DB_NAME set', Boolean(config.db.database), config.db.database || 'missing');
  run('SUPPORT_DB_USER set', Boolean(config.db.user));
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

  if (config.db.host && config.db.database && config.db.user) {
    const phone =
      config.policy.defaultChatPhone ||
      (process.env.SUPPORT_SMOKE_PHONE || '').trim() ||
      '';
    if (phone) {
      try {
        const client = createFactsClient();
        const lookup = await client.lookupByPhone(phone);
        run(
          'DB lookup',
          true,
          lookup.matched
            ? `orders=${lookup.orders.length} customerId=${lookup.customerId}`
            : 'no orders (connection OK)',
        );
      } catch (err) {
        run('DB lookup', false, err.message || String(err));
      } finally {
        await closeSequelize();
      }
    } else {
      run('DB lookup', true, 'skipped — set SUPPORT_SMOKE_PHONE or DEFAULT_CHAT_PHONE');
    }
  }

  const port = config.port;
  const health = await getJson(`http://127.0.0.1:${port}/health`);
  run(
    'Agent /health',
    health.ok,
    health.ok ? '' : `in another terminal: npm start (port ${port})`,
  );

  console.log(`\n${pass}/${total} checks passed.`);

  if (pass < total) {
    console.log('\nNext:');
    if (!health.ok) {
      console.log('  Terminal: cd lifeguru_support_agent && npm start');
    }
    if (!config.db.host) {
      console.log('  Copy SUPPORT_DB_* (or DB_*) from lifeguru_admin_backend .env into agent .env');
    }
    console.log('  Terminal: ngrok http 3080');
    console.log('  Doc: docs/support-agent-step5-ngrok-salesiq-safe.md');
    process.exit(1);
  }

  console.log('\nReady for ngrok + SalesIQ webhook tests.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
