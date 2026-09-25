const config = require('../config');
const { createMemoryStore } = require('./memoryStore');
function loadRedisStore() {
  return require('./redisStore').createRedisStore;
}

/**
 * Session store factory — async get/set/clear (memory or Redis).
 * Default: memory (single Node instance).
 */
function createSessionStore(overrides = {}) {
  const kind = (overrides.kind || config.sessionStore || 'memory').toLowerCase();
  if (kind === 'redis') {
    return loadRedisStore()(overrides.redis || {});
  }
  const memory = createMemoryStore(overrides.memory || {});
  return {
    async get(key) {
      return memory.get(key);
    },
    async set(key, state) {
      memory.set(key, state);
    },
    async clear(key) {
      memory.clear(key);
    },
  };
}

module.exports = { createSessionStore };
