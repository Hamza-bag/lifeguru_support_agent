const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');
const { WELCOME_QUERY } = require('../src/pipeline/turn');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function request(port, { method, path, body, headers }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode, raw, json: raw ? JSON.parse(raw) : null });
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('salesiq webhook', () => {
  it('HEAD returns 200 for Zoho URL validation', async () => {
    const { app } = createApp();
    const { server, port } = await listen(app);
    try {
      const res = await request(port, { method: 'HEAD', path: '/salesiq/webhook' });
      assert.equal(res.status, 200);
    } finally {
      server.close();
    }
  });

  it('trigger asks language; English then stays in English', async () => {
    const { app } = createApp();
    const { server, port } = await listen(app);
    const visitor = { id: 'v-poc-1', phone: '9999999999' };
    try {
      const trigger = await request(port, {
        method: 'POST',
        path: '/salesiq/webhook',
        body: {
          handler: 'trigger',
          operation: 'chat',
          visitor,
          request: { conversation_id: 'c-1' },
          message: {},
        },
      });
      assert.equal(trigger.status, 200);
      assert.equal(trigger.json.replies[0], WELCOME_QUERY);

      const query = await request(port, {
        method: 'POST',
        path: '/salesiq/webhook',
        body: {
          handler: 'message',
          operation: 'message',
          visitor: { ...visitor, phone: '9876543210' },
          request: { conversation_id: 'c-1' },
          message: { text: 'when is my puja' },
        },
      });
      assert.equal(query.status, 200);
      assert.match(query.json.replies.join('\n'), /booking|Satyanarayan|1\./i);
    } finally {
      server.close();
    }
  });

  it('shadow unwraps workflow entity payloads and never returns action', async () => {
    const { app } = createApp();
    const { server, port } = await listen(app);
    try {
      const res = await request(port, {
        method: 'POST',
        path: '/salesiq/shadow',
        body: {
          event: 'conversation.visitor.replied',
          entity: {
            id: '8000000005001',
            message: { text: 'when is my puja', sender: { name: 'Anita' } },
            visitor: { phone: '9876543210', name: 'Anita', channel: 'whatsapp' },
            owner: { name: 'CS Agent' },
          },
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.ok, true);
      assert.equal(res.json.action, undefined);
    } finally {
      server.close();
    }
  });

  it('failure handler returns agent-busy reply (not forward retry loop)', async () => {
    const { app } = createApp();
    const { server, port } = await listen(app);
    try {
      const res = await request(port, {
        method: 'POST',
        path: '/salesiq/webhook',
        body: {
          handler: 'failure',
          failed_response: { action: 'forward' },
          visitor: { active_conversation_id: 'c-fail-1' },
          request: { id: 'failure-req-1' },
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.action, 'reply');
      assert.ok(res.json.replies?.[0]?.length > 20);
    } finally {
      server.close();
    }
  });

  it('webhook accepts entity-wrapped visitor message', async () => {
    const { app } = createApp();
    const { server, port } = await listen(app);
    try {
      const res = await request(port, {
        method: 'POST',
        path: '/salesiq/webhook',
        body: {
          handler: 'message',
          entity: {
            id: 'c-entity-1',
            message: { text: 'when is my puja' },
            visitor: { phone: '9876543210' },
          },
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.action, 'reply');
      assert.match(res.json.replies.join('\n'), /booking|1\.|puja/i);
    } finally {
      server.close();
    }
  });

  it('shadow endpoint logs and does not return a bot reply', async () => {
    const { app } = createApp();
    const { server, port } = await listen(app);
    try {
      const res = await request(port, {
        method: 'POST',
        path: '/salesiq/shadow',
        body: {
          id: '8000000005001',
          message: { text: 'when is my puja', sender: { name: 'Anita' } },
          visitor: { phone: '9876543210', name: 'Anita', channel: 'whatsapp' },
          owner: { name: 'Bot' },
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.ok, true);
      assert.equal(res.json.action, undefined);
      assert.equal(res.json.replies, undefined);
    } finally {
      server.close();
    }
  });
});
