# LifeGuru support agent (WhatsApp / SalesIQ)

Webhook service for **Mandir Puja & Chadhava** support. Zoho SalesIQ sends messages; this app routes the turn, loads order facts from Admin (when configured), matches approved FAQ, optionally uses Gemini to classify ambiguity and mirror language, then returns **reply**, **forward**, or **end** to SalesIQ.

**Trust model:** Admin = per-customer facts · FAQ = shared policy · Gemini = route/rephrase only · human = safe fallback.

---

## Prerequisites

- **Node.js 18+**
- **npm**
- For real orders locally: **lifeguru_admin_backend** running against your dev DB (you run migrations/seeds yourself)
- Optional: **Gemini API key** for classify + language mirror
- Optional: **ngrok** for Zoho Step 5 webhook tests

---

## Run locally (quick start — mock facts, no Admin)

Works without Admin or Gemini (tests use the same mocks).

```bash
cd lifeguru_support_agent
cp .env.example .env
npm install
npm test
npm start
```

| Command | Purpose |
|---------|---------|
| `npm start` | Server on **http://localhost:3080** (override with `PORT`) |
| `npm run dev` | Same with `--watch` |
| `npm run chat` | Interactive CLI (no Zoho); try phone **9876543210** in mock mode |
| `curl -s http://localhost:3080/health` | Should return `"ok": true` |

**Mock demo:** In `.env`, leave `FACTS_MODE=mock` (default). Chat flow uses built-in sample orders for `9876543210` if you set `DEFAULT_CHAT_PHONE=9876543210` for CLI only.

**Logs:** `logs/chats.jsonl` (created at runtime, gitignored) · tail via `GET http://localhost:3080/dev/chats`

---

## Run locally with Admin (real order facts)

### 1. Admin backend

Add to **admin** `.env` (same value you will use in the agent):

```bash
SUPPORT_AGENT_SECRET=choose-a-long-random-string-not-in-git
```

Start admin on your usual port (example **3200** — use whatever your team uses):

```bash
cd lifeguru_admin_backend
npm start
```

**Smoke the internal API** (replace port, secret, and a test phone):

```bash
curl -s -H "x-support-agent-secret: YOUR_SECRET" \
  "http://localhost:3200/internal/support/customers?phone=919826312985"
```

| HTTP | Meaning |
|------|---------|
| **200** + `matched: true` | Phone has orders (dev DB) |
| **404** + `matched: false` | Route OK, no orders for that phone |
| **401** | Wrong or missing secret header |
| **503** | `SUPPORT_AGENT_SECRET` not set in admin `.env` |

Endpoints (read-only, secret required):

- `GET /internal/support/customers?phone=`
- `GET /internal/support/orders/:id/facts?customerId=`

### 2. Support agent

In **lifeguru_support_agent/.env**:

```bash
FACTS_MODE=http
FACTS_API_URL=http://localhost:3200
FACTS_API_SECRET=same-as-SUPPORT_AGENT_SECRET
SUPPORT_DEV_DEFAULT_PHONE=false
```

Optional: `GEMINI_API_KEY=...`, `SUPPORT_LLM_CLASSIFY=true`, `SUPPORT_LLM_MIRROR_LANGUAGE=true`

```bash
cd lifeguru_support_agent
npm run smoke:admin 919826312985
npm run chat
# or
npm start
```

Use a phone that has orders in **your dev Admin DB**.

### 3. Optional — SalesIQ webhook without WhatsApp

Terminal A: admin · Terminal B: `npm start` · Terminal C: `ngrok http 3080`

Point a **dev** SalesIQ Webhook bot at `https://YOUR-NGROK/salesiq/webhook` (Website ON, WhatsApp OFF on live prod). See Step 5 runbook in the LifeGuru monorepo `docs/support-agent-step5-ngrok-salesiq-safe.md` if you have it.

```bash
npm run preflight:step5
```

**Local webhook curl** (no ngrok):

```bash
curl -s -X POST http://localhost:3080/salesiq/webhook \
  -H 'Content-Type: application/json' \
  -d '{"handler":"message","visitor":{"id":"v1","phone":"919826312985"},"request":{"conversation_id":"local-test-1"},"message":{"text":"bhai video nahi aaya"}}'
```

---

## Environment (common)

Copy from `.env.example`. Never commit `.env`.

| Variable | Typical local value |
|----------|---------------------|
| `PORT` | `3080` |
| `FACTS_MODE` | `mock` or `http` |
| `FACTS_API_URL` | Admin base URL, no trailing slash |
| `FACTS_API_SECRET` | Same as admin `SUPPORT_AGENT_SECRET` |
| `GEMINI_API_KEY` | Optional; classify/mirror off if empty |
| `SALESIQ_VERIFY_SIGNATURE` | `false` locally, `true` in prod |
| `SESSION_STORE` | `memory` locally, `redis` for multi-instance prod |

---

## Content (CS-editable)

- FAQ: `content/kb/faq.json`
- LLM rules: `content/rules/*.md`

Restart the agent after editing content files.

---

## Further reading

If you work from the **LifeGuru monorepo**, see also:

- `docs/support-agent-architecture.md` — behavior and routing
- `docs/support-agent-local-testing.md` — extended local scenarios
- `docs/support-agent-step5-ngrok-salesiq-safe.md` — Zoho sandbox without touching live WhatsApp

Do **not** switch live Mandir Puja WhatsApp to this webhook until staging sign-off and rollback plan are done.
