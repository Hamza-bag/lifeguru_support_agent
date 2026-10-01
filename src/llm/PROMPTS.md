# LLM prompts (support agent)

Gemini is used in two places. Classify receives a short router summary; mirror
receives the full customer-facing guardrails.

## Rules blocks

- Classify: `content/rules/classify-summary.md`
- Mirror: `content/rules/guardrails.md` + `content/rules/gemini-router.md`

CS edits those files; no change to `classify.js` / `polish.js` required for policy updates.

---

## 1. Classify (router only)

| | |
|--|--|
| **File** | `src/llm/classify.js` |
| **Function** | `buildClassifyPrompt(userText, recentConversation)` |
| **Transport** | `src/llm/geminiJson.js` → `generateContent`, JSON in response |
| **When** | `config.llmClassifyEnabled`, routing gate allows, circuit closed |
| **Timeout** | `SUPPORT_LLM_CLASSIFY_TIMEOUT_MS` (default ~4500 ms) |

**Model output (strict):**

```json
{
  "language": "en" | "hi",
  "route": "admin" | "faq" | "human" | "clarify",
  "intent": "puja" | "video" | "prasad" | "both" | null,
  "faqId": "<catalog id>" | null,
  "orderLookup": "latest" | "first" | "on_date" | "between" | "puja_on" | null,
  "orderDate": "YYYY-MM-DD" | null,
  "orderDateFrom": "YYYY-MM-DD" | null,
  "orderDateTo": "YYYY-MM-DD" | null,
  "reason": "short internal note"
}
```

**Prompt body (after rules block):** Router-only instructions; scope in/out; route definitions; knowledge-base catalog when `SUPPORT_LLM_FAQ_SELECT` is on (the id is chosen in this same call); optional recent conversation; current user message JSON-stringified.

There is no separate knowledge-base Gemini call. Mirror runs only when the user's language is not already English or Hindi (Hinglish, Gujarati, and other registers). Plain English and Devanagari replies stay on the template.

**Not LLM:** Shortcuts via `routingGate.js`; rules-first via `rulesRoute.js`; fallbacks in `normalizeClassifyResult` + `intent.js`.

---

## 2. Mirror (customer-facing rewrite)

| | |
|--|--|
| **File** | `src/llm/polish.js` |
| **Function** | `buildPrompt(..., mode: 'mirror')` via `mirrorReplyLanguage()` |
| **Orchestrator** | `src/llm/finalizeReplies.js` (called from `app.js`, `scripts/local-chat.js`) |
| **When** | `SUPPORT_LLM_MIRROR_LANGUAGE=true` (default with API key in non-test) |
| **Timeout** | `SUPPORT_LLM_MIRROR_TIMEOUT_MS` (default 3500 ms) |

**Inputs:** `userText`, template **drafts** from engine (facts must be preserved), `action` (reply | forward | end).

**Model output:**

```json
{ "replies": ["...", "..."] }
```

**Prompt intent:** Rewrite into the user's register when templates are the wrong language (Hinglish, Eng–Gujarati, Eng–Marathi, other Indic scripts). Plain English and Hindi stay on the template. Civil tone per guardrails; do not invent facts.

---

## Env quick reference

| Variable | Prompt affected |
|----------|-----------------|
| `GEMINI_API_KEY` | All |
| `GEMINI_SUPPORT_MODEL` | All |
| `SUPPORT_LLM_CLASSIFY` | Classify |
| `SUPPORT_LLM_MIRROR_LANGUAGE` | Mirror |
| `SUPPORT_LLM_MAX_*` | Skips calls when over limit (`usageLimit.js`) |
| `SUPPORT_LLM_CIRCUIT_*` | Pauses classify after failures (`geminiCircuit.js`) |

---

## Debugging

- `logs/chats.jsonl` — `usedLlmPolish`, `llmReplyMode`, `classify` object  
- Startup log — classify/mirror flags. `/health` returns `{ "ok": true }` only.  
- `npm run chat` — local stdin loop with same finalize path as webhook  
