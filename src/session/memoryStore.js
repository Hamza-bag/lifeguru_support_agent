const TTL_MS = 24 * 60 * 60 * 1000;
const SWEEP_EVERY_WRITES = 50;
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * In-process session store (single Node instance). Same contract as redisStore.
 * Expired rows are dropped on read, and swept in the background so unused chats do not stay in memory.
 * @returns {{ get: (key: string) => object|null, set: (key: string, state: object) => void, clear: (key: string) => void }}
 */
function createMemoryStore(options = {}) {
  const ttlMs = options.ttlMs ?? TTL_MS;
  const sessions = new Map();
  let writes = 0;

  function sweep(now = Date.now()) {
    for (const [key, row] of sessions) {
      if (row.expiresAt < now) sessions.delete(key);
    }
  }

  const timer = setInterval(sweep, options.sweepMs ?? SWEEP_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();

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
    writes += 1;
    if (writes % SWEEP_EVERY_WRITES === 0) sweep();
  }

  function clear(key) {
    sessions.delete(key);
  }

  return { get, set, clear };
}

module.exports = { createMemoryStore, TTL_MS };
