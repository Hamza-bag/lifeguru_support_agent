# LifeGuru support agent (WhatsApp / SalesIQ)

Webhook service for **Mandir Puja & Chadhava** support. Zoho SalesIQ sends messages; this app routes the turn, loads order facts via **Sequelize (read-only session)** on the dev admin DB in Phase 1, matches approved FAQ (+ optional LLM faq id), optionally uses Gemini to classify and mirror language, then returns **reply**, **forward**, or **end** to SalesIQ.

**Trust model:** DB allow-list = per-customer facts · KB JSON = shared policy · Gemini = route/rephrase/faq-id only · human = safe fallback.

See [docs/support-agent-db-readonly.md](../docs/support-agent-db-readonly.md).

---

## Prerequisites

- **Node.js 18+**
- **npm**
- For real orders locally: **Postgres** credentials (copy `SUPPORT_DB_*` from **lifeguru_admin_backend** dev `.env` — you run migrations/seeds yourself)
- Optional: **Gemini API key** for classify + language mirror
- Optional: **ngrok** for Zoho Step 5 webhook tests

---

## Run locally

```bash
cd lifeguru_support_agent
cp .env.example .env
# Copy SUPPORT_DB_HOST, SUPPORT_DB_NAME, SUPPORT_DB_USER, SUPPORT_DB_PASS from admin .env
npm install
npm test
npm start
```

| Command | Purpose |
|---------|---------|
| `npm start` | Server on **http://localhost:3080** (override with `PORT`) |
| `npm run dev` | Same with `--watch` |
| `npm run chat` | Interactive CLI (needs `SUPPORT_DB_*` for order lookup) |
| `npm run smoke:db -- 9826312985` | One phone lookup + facts |
| `curl -s http://localhost:3080/health` | Should return `"ok": true` |

**Logs:** `logs/chats.jsonl` (created at runtime, gitignored). `GET /dev/chats` is off unless `SUPPORT_DEV_CHATS=true` (local debug only).

Optional: `GEMINI_API_KEY=...`, `SUPPORT_LLM_CLASSIFY=true`, `SUPPORT_LLM_MIRROR_LANGUAGE=true`, `SUPPORT_LLM_FAQ_SELECT=true`

### SalesIQ webhook without WhatsApp

Terminal A: `npm start` · Terminal B: `ngrok http 3080`

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
| `SUPPORT_DB_*` | Phase 1: same as admin dev DB (read-only session in agent) |
| `SUPPORT_LLM_FAQ_SELECT` | `true` — one Gemini call picks the knowledge-base card id |
| `GEMINI_API_KEY` | Optional; classify/mirror off if empty |
| `SALESIQ_VERIFY_SIGNATURE` | `false` locally, `true` in prod |
| `SESSION_STORE` | `memory` locally, `redis` for multi-instance prod |

---

## How a message is answered

1. SalesIQ sends the WhatsApp text and `visitor.phone`.
2. A few clear cases are decided in code (greeting, thanks, this booking’s puja/video/prasad, how to book, which puja, calm AutoPay, refund, anger).
3. Anything else is one Gemini call that picks a route and, when it is a policy question, a knowledge-base id.
4. Booking facts (date, video link, prasad) come from the read-only database for that phone only.
5. The reply is the stored English, Hindi, or Hinglish text. Other languages are rewritten from the English draft.
6. If the question is unclear, or the card says to connect, the chat is transferred to the team.

## Content (CS-editable)

- Answers: `content/kb/*.json` (English, Hindi, Hinglish)
- Review file for CS: `docs/LifeGuru-Support-KB-CS-Review.docx`
- LLM rules: `content/rules/*.md`

Restart the agent after editing content files.

---

## Further reading

- `docs/support-agent-db-readonly.md` — database access
- `docs/support-agent-zoho-oauth.md` — SalesIQ token for pending replies
- `docs/support-agent-step5-ngrok-salesiq-safe.md` — test the webhook without changing live WhatsApp

Do **not** switch live Mandir Puja WhatsApp to this webhook until staging sign-off and rollback plan are done.
