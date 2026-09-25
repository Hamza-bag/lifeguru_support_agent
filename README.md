# LifeGuru support agent (WhatsApp / SalesIQ)

Webhook bot for **Mandir Puja & Chadhava** support. Zoho SalesIQ sends messages; this service routes, loads facts from Admin, optional Gemini classify + language mirror, returns reply or forward to human.

## Read first

- **[Current architecture](../docs/support-agent-architecture.md)** — simple flow, examples, edge cases, folder map
- **[Content guide](./content/README.md)** — FAQ and AI rules
- **[Safe SalesIQ test](../docs/support-agent-step5-ngrok-salesiq-safe.md)** — ngrok / sandbox runbook

## Run locally

```bash
cd lifeguru_support_agent
cp .env.example .env
npm install
npm test
npm start          # :3080
npm run chat       # stdin demo (no Zoho)
```

Admin facts: set `FACTS_MODE=http`, `FACTS_API_URL`, `FACTS_API_SECRET` — see [support-agent-local-testing.md](../docs/support-agent-local-testing.md).

Logs: `logs/chats.jsonl` · Dev tail: `GET /dev/chats`

## Zoho / ngrok

- **Bot replies:** `POST /salesiq/webhook` — [support-agent-step5-ngrok-salesiq-safe.md](../docs/support-agent-step5-ngrok-salesiq-safe.md)
- **Listen-only on prod:** `POST /salesiq/shadow` (Workflows webhook, do not replace live Zobot URL)

```bash
npm run preflight:step5
```

The live WhatsApp bot must not be switched until the sandbox checklist in the architecture doc passes.
