/**
 * Redis session store (multi-instance / restart-safe chats).
 *
 * Requires: npm install ioredis (optional — not in default package.json).
 * Env: REDIS_URL or REDIS_HOST + REDIS_PORT, SESSION_TTL_SECONDS (default 86400).
 */

const DEFAULT_TTL_SEC = 24 * 60 * 60;

function sessionKey(key) {
  return `support:session:${key}`;
}

function createRedisStore(options = {}) {
  let Redis;
  try {
    Redis = require('ioredis');
  } catch {
    throw new Error(
      'SESSION_STORE=redis but ioredis is not installed. Run: npm install ioredis — or use SESSION_STORE=memory',
    );
  }

  const ttlSec =
    options.ttlSec ??
    (Number(process.env.SESSION_TTL_SECONDS) || DEFAULT_TTL_SEC);
  const url = process.env.REDIS_URL;
  const client = url
    ? new Redis(url)
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      });

  return {
    async get(key) {
      const raw = await client.get(sessionKey(key));
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    async set(key, state) {
      await client.set(sessionKey(key), JSON.stringify(state), 'EX', ttlSec);
    },
    async clear(key) {
      await client.del(sessionKey(key));
    },
  };
}

module.exports = { createRedisStore, DEFAULT_TTL_SEC, sessionKey };
