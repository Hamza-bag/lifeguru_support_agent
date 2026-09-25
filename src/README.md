# `src/` — module map

**Canonical architecture:** [docs/support-agent-architecture.md](../../docs/support-agent-architecture.md)

## Entry

| File | Role |
|------|------|
| `index.js` | Load `.env`, listen on `PORT` |
| `app.js` | Express: `/health`, `/salesiq/webhook`, `/salesiq/shadow`, `/dev/*`; calls `handleTurn` + `finalizeBotReplies` |

## Conversation core

| File | Role |
|------|------|
| `pipeline/turn.js` | **Main orchestrator** — `handleTurn` |
| `pipeline/stages.js`, `router.js`, `orderFlow.js` | Stage machine + routing + Admin |
| `conversation/intent.js` | Language detection, keyword intents, complex-support heuristics |
| `conversation/rulesRoute.js` | Rules-first routing (no Gemini) |
| `conversation/routingGate.js` | Skip classify on deterministic turns |
| `conversation/chatContext.js` | Merge multiline / burst text |
| `conversation/copy.js` | Static template strings (`t(lang, key)`) — migrate to `content/kb/canned.json` |
| `session/createStore.js` | Async session store (memory default, Redis optional) |

## Knowledge & content

| File | Role |
|------|------|
| `content/loadContent.js` | Read `content/rules/*`, `content/kb/*`; build Gemini rules prefix |
| `faq/matchFaq.js` | Score user text against `faq.json`; load system entries by id |

## Integrations

| File | Role |
|------|------|
| `orders/factsClient.js` | Mock or HTTP client to Admin internal support API |
| `orders/phone.js` | Normalize Indian mobile digits |
| `salesiq/payload.js` | Webhook normalization, SalesIQ response shape |
| `salesiq/signature.js` | Optional RSA verify |
| `salesiq/shadow.js` | Parse workflow shadow events |

## LLM

| File | Role |
|------|------|
| `llm/classify.js` | Router prompt + normalize JSON |
| `llm/polish.js` | Mirror + locale polish prompts |
| `llm/finalizeReplies.js` | Choose mirror vs polish after engine |
| `llm/geminiJson.js` | HTTP to Gemini |
| `llm/geminiCircuit.js`, `usageLimit.js` | Resilience |

## Pipeline map

See [pipeline/README.md](./pipeline/README.md). Further splits (HTTP routes only in `routes/`) — restructure roadmap.
