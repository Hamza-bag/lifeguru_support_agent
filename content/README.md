# Support bot content (CS + engineering)

Customer-facing answers and Gemini rules live in this folder. Fixed welcome and handoff lines stay in `src/conversation/copy.js`.

Content is cached when Node starts. Restart the support agent after editing these files.

```
content/
  README.md           ← you are here
  rules/              ← LLM policy (Markdown → Gemini prompts)
    guardrails.md
    gemini-router.md
  kb/                 ← Customer-facing KB (JSON)
    faq.json
    …other published cards
```

**Start here:** [README](../README.md). CS review file: [LifeGuru-Support-KB-CS-Review.docx](../../docs/LifeGuru-Support-KB-CS-Review.docx).

## Quick reference

| Need to… | Edit |
|----------|------|
| Change when we forward to human / phone rules | `rules/gemini-router.md` |
| Tone, politeness, abuse limits | `rules/guardrails.md` |
| Autopay, how to book, generic timelines | `kb/faq.json` |
| Welcome / handoff wording | `src/conversation/copy.js` |

## Rules

1. FAQ cards: **`en`**, **`hi`**, and **`hinglish`** for customer text.
2. No order-specific facts in KB JSON.
3. Valid JSON only in `kb/*.json`.
