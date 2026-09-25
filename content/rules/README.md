# LLM rules (CS + product)

Markdown files here are injected into **every Gemini call** (classify + reply mirror/polish). Edit like policy docs — no code deploy needed for text-only changes if the server reads from a mounted volume.

| File | Injected as | Purpose |
|------|-------------|---------|
| **`guardrails.md`** | `SAFETY & TONE GUARDRAILS` | Polite tone, no abuse, angry users, no invented promises |
| **`gemini-router.md`** | `TEAM RULES` | Scope, routing (admin / FAQ / human / clarify), phone policy, language |

Assembly: `src/content/loadContent.js` → `rulesBlockForPrompt()`.

Prompt details: [src/llm/PROMPTS.md](../../src/llm/PROMPTS.md) and [docs/support-agent-architecture.md](../../../docs/support-agent-architecture.md).

**Do not** contradict Admin order facts or entries in `content/kb/faq.json`.
