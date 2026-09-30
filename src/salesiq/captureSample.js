const fs = require('fs');
const path = require('path');

let captured = false;

function redactPayload(payload) {
  const clone = JSON.parse(JSON.stringify(payload || {}));
  const scrub = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      if (lower.includes('email') && typeof obj[key] === 'string') {
        obj[key] = '[redacted]';
      }
    }
  };
  scrub(clone.visitor);
  scrub(clone.entity?.visitor);
  return clone;
}

function maybeCaptureWebhookSample(payload, { enabled, dir }) {
  if (!enabled || captured) return;
  captured = true;
  const logsDir = dir || path.join(process.cwd(), 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const file = path.join(logsDir, 'salesiq-webhook-sample.json');
  const record = {
    capturedAt: new Date().toISOString(),
    note: 'First SalesIQ webhook body (PII partially redacted). Use to verify visitor.phone + conversation_id.',
    payload: redactPayload(payload),
  };
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  console.log(`[salesiq] saved webhook sample → ${file}`);
}

module.exports = { maybeCaptureWebhookSample };
