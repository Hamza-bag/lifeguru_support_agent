const fs = require('fs');
const path = require('path');

const USAGE_FILE = path.join(__dirname, '..', '..', 'logs', 'llm-usage.json');
const FLUSH_MS = 2000;

let cache = null;
let dirty = false;
let flushTimer = null;

function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function loadUsage() {
  try {
    return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function ensureCache() {
  if (!cache) cache = loadUsage();
  return cache;
}

function saveUsage(data) {
  const dir = path.dirname(USAGE_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
}

function flushUsageSync() {
  if (!dirty || !cache) return;
  saveUsage(cache);
  dirty = false;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const snapshot = cache;
    if (!dirty || !snapshot) return;
    dirty = false;
    fs.promises
      .mkdir(path.dirname(USAGE_FILE), { recursive: true })
      .then(() => fs.promises.writeFile(USAGE_FILE, JSON.stringify(snapshot, null, 2)))
      .catch((err) => {
        dirty = true;
        console.error('[llm] usage flush failed', err.message || err);
      });
  }, FLUSH_MS);
  if (typeof flushTimer.unref === 'function') flushTimer.unref();
}

function getLimits() {
  return {
    maxCallsMonth: Number(process.env.SUPPORT_LLM_MAX_CALLS_MONTH) || 0,
    maxTokensMonth: Number(process.env.SUPPORT_LLM_MAX_TOKENS_MONTH) || 0,
  };
}

function getMonthUsage() {
  const all = ensureCache();
  const key = monthKey();
  return all[key] || { calls: 0, tokens: 0 };
}

function isOverLimit() {
  const { maxCallsMonth, maxTokensMonth } = getLimits();
  const u = getMonthUsage();
  if (maxCallsMonth > 0 && u.calls >= maxCallsMonth) return true;
  if (maxTokensMonth > 0 && u.tokens >= maxTokensMonth) return true;
  return false;
}

function recordUsage({ calls = 1, tokens = 0 } = {}) {
  const all = ensureCache();
  const key = monthKey();
  const row = all[key] || { calls: 0, tokens: 0 };
  row.calls += calls;
  row.tokens += tokens;
  all[key] = row;
  dirty = true;
  scheduleFlush();
  return row;
}

if (!process.listenerCount('beforeExit')) {
  process.on('beforeExit', flushUsageSync);
}

module.exports = {
  isOverLimit,
  recordUsage,
  getMonthUsage,
  getLimits,
  flushUsageSync,
  USAGE_FILE,
};
