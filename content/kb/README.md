# Knowledge base (CS-editable answers)

**Audience:** Customer support + product.  
**Not here:** Order dates, video URLs, or per-customer status — those come from **Admin API** at reply time.

## Files

| File | Purpose | Bot behavior today |
|------|---------|-------------------|
| **`faq.json`** | Policy / how-to matched by **keywords** or loaded by **id** | Used when `SUPPORT_FAQ_ENABLED=true` and route = FAQ. See `src/faq/matchFaq.js`. |
| **`canned.json`** | Fixed lines: welcome, handoff, ask phone, goodbye | **Scaffold** — strings still in `src/conversation/copy.js` until Phase A wiring. |

## `faq.json` entry shape

```json
{
  "id": "autopay_501",
  "keywords": ["501", "autopay", "mandate"],
  "tags": ["payment"],
  "en": "English answer…",
  "hi": "Hindi answer…"
}
```

- **`keywords: []`** — system-only entries (`no_whatsapp_phone`, `ask_booking_phone_for_team`). Bot loads by id from code, not user text.
- Always provide **`en`** and **`hi`**. Mirror LLM may rewrite into the user’s language when enabled.
- Do **not** put order IDs, refund amounts, or specific dates in FAQ.

## How to change copy

1. Edit JSON (valid JSON only — no trailing commas).
2. Restart the agent (`npm start`) or redeploy. Files are read from disk on each request for **rules**; FAQ is loaded when matching.
3. Spot-check: `npm run chat` or curl webhook (see [docs/support-agent-architecture.md](../../../docs/support-agent-architecture.md)).

## Review

CS owner + engineering on PRs that touch KB. Regression: `npm test` (includes `tests/faq.test.js`).
