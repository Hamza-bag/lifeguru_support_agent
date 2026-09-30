const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');
const { createDemoFactsClient } = require('./helpers/demoFacts');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function postJson(port, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode, json: raw ? JSON.parse(raw) : null });
        });
      },
    );
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitFor(getValue, expected, { timeoutMs = 8000, intervalMs = 25 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = getValue();
    if (value === expected || (typeof expected === 'function' && expected(value))) {
      return value;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`waitFor timeout: got ${getValue()}, expected ${expected}`);
}

/** Pending path requires mirror or classify (see asyncWebhook.js). No API key = fast skip. */
const pendingTestConfig = {
  salesIqPendingEnabled: true,
  salesIqPendingMode: 'always',
  llmMirrorLanguage: true,
  llmClassifyEnabled: false,
  geminiApiKey: '',
  captureSalesIqSample: false,
  logPayloads: false,
  policy: { routingStrategy: 'rules_first' },
};

describe('SalesIQ pending webhook', () => {
  it('returns pending immediately then invokes callback with request id', async () => {
    const callbacks = [];
    const mockCallback = {
      isConfigured: () => true,
      sendResponse: async (requestId, response) => {
        callbacks.push({ requestId, response });
        return { ok: true, status: 200, body: { action: 'reply', replies: response.replies } };
      },
    };

    const { app } = createApp({
      factsClient: createDemoFactsClient(),
      callbackClient: mockCallback,
      config: pendingTestConfig,
    });

    const { server, port } = await listen(app);
    try {
      const requestId = 'pending-test-request-id-abc';
      const res = await postJson(port, '/salesiq/webhook', {
        handler: 'message',
        operation: 'message',
        request: { id: requestId, conversation_id: 'pending-conv-1' },
        visitor: {
          active_conversation_id: 'pending-conv-1',
          phone: '919876543210',
        },
        message: { text: 'meri puja kab hai' },
      });

      assert.equal(res.status, 200);
      assert.equal(res.json.action, 'pending');
      assert.ok(Array.isArray(res.json.replies));

      await waitFor(() => callbacks.length, 1);

      assert.equal(callbacks[0].requestId, requestId);
      assert.ok(['reply', 'forward'].includes(callbacks[0].response.action));
    } finally {
      await new Promise((r) => setTimeout(r, 100));
      server.close();
    }
  });

  it('retries callback with force forward when first callback fails', async () => {
    const callbacks = [];
    let callCount = 0;
    const mockCallback = {
      isConfigured: () => true,
      sendResponse: async (requestId, response, options) => {
        callCount += 1;
        callbacks.push({ requestId, response, options });
        if (callCount === 1) {
          return { ok: false, status: 500, reason: 'upstream error' };
        }
        return { ok: true, status: 200, body: { action: 'forward' } };
      },
    };

    const { app } = createApp({
      factsClient: createDemoFactsClient(),
      callbackClient: mockCallback,
      notesClient: { isConfigured: () => false, addNote: async () => ({ ok: true }) },
      config: {
        ...pendingTestConfig,
        supportFailOpenForward: true,
      },
    });

    const { server, port } = await listen(app);
    try {
      const requestId = 'pending-fail-open-id';
      await postJson(port, '/salesiq/webhook', {
        handler: 'message',
        operation: 'message',
        request: { id: requestId, conversation_id: 'pending-conv-fail' },
        visitor: { active_conversation_id: 'pending-conv-fail', phone: '919876543210' },
        message: { text: 'meri puja kab hai' },
      });

      await waitFor(() => callbacks.length, 2);

      assert.equal(callbacks[1].options?.forceForward, true);
      assert.equal(callbacks[1].response.action, 'forward');
    } finally {
      await new Promise((r) => setTimeout(r, 100));
      server.close();
    }
  });
});
