# Support bot content (CS + engineering)

Everything the **team can edit without touching TypeScript** lives under this folder. Code templates that are not migrated yet stay in `src/conversation/copy.js` (see architecture doc).

Content is cached when Node starts. Restart the support agent after editing these files.

```
content/
  README.md           ← you are here
  rules/              ← LLM policy (Markdown → Gemini prompts)
    guardrails.md
    gemini-router.md
  kb/                 ← Customer-facing KB (JSON)
    faq.json
    canned.json       ← scaffold; wiring Phase A
```

**Start here:** [docs/support-agent-architecture.md](../../docs/support-agent-architecture.md)

## Quick reference

| Need to… | Edit |
|----------|------|
| Change when we forward to human / phone rules | `rules/gemini-router.md` |
| Tone, politeness, abuse limits | `rules/guardrails.md` |
| Autopay, how to book, generic timelines | `kb/faq.json` |
| Welcome / handoff wording (future) | `kb/canned.json` + code wiring |

## Rules

1. FAQ / canned: **both** `en` and `hi` for customer text.
2. No order-specific facts in KB JSON.
3. Valid JSON only in `kb/*.json`.
