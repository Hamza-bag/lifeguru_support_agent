# Session store

Key = SalesIQ `conversation_id` (see `salesiq/payload.js`).

**Concurrent chats:** Each distinct conversation key gets its own state object in the store. **10 users at once on one Node process = 10 isolated sessions** (no cross-talk). Not shared across server restarts or multiple pods unless `SESSION_STORE=redis`.

| Implementation | Env | Use |
|----------------|-----|-----|
| **memory** (default) | `SESSION_STORE=memory` | Local dev, single pod |
| **redis** | `SESSION_STORE=redis`, `REDIS_URL`, optional `SESSION_TTL_SECONDS` | 2+ pods, survive restart |

Factory: `createStore.js`.

Redis requires optional dependency: `npm install ioredis` (not in default `package.json` until prod enables Redis).

**Cost:** See [docs/support-agent-phase-a-cs-checklist.md](../../../docs/support-agent-phase-a-cs-checklist.md#redis-costs) and architecture doc.
