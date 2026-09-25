const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * In-process session store (single Node instance). Same contract as redisStore.
 * @returns {{ get: (key: string) => object|null, set: (key: string, state: object) => void, clear: (key: string) => void }}
 */
function createMemoryStore(options = {}) {
  const ttlMs = options.ttlMs ?? TTL_MS;
  const sessions = new Map();

  function get(key) {
    const row = sessions.get(key);
    if (!row) return null;
    if (row.expiresAt < Date.now()) {
      sessions.delete(key);
      return null;
    }
    return { ...row.state };
  }

  function set(key, state) {
    sessions.set(key, { state: { ...state }, expiresAt: Date.now() + ttlMs });
  }

  function clear(key) {
    sessions.delete(key);
  }

  return { get, set, clear };
}

module.exports = { createMemoryStore, TTL_MS };
