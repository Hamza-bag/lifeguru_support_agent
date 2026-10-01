# Knowledge base (CS-editable answers)

**Audience:** Customer support + product.  
**CS review file:** [LifeGuru-Support-KB-CS-Review.docx](../../../docs/LifeGuru-Support-KB-CS-Review.docx)

**Not here:** Order dates, video URLs, or per-customer status — those come from the booking lookup at reply time.

## Files

| File | Purpose | Bot behavior |
|------|---------|--------------|
| **`faq.json`** | Cross-cutting policy / how-to | Loaded when not draft. Rules or Gemini pick the id |
| **`puja.json`** | Mandir puja (general) | Same |
| **`chadhava.json`** | Chadhava (general) | Same |
| **`puja-subscription.json`** | Puja subscription plans | Same |
| **`chadhava-subscription.json`** | Chadhava subscription | Same |
| **`etiquette.json`** | Dress, sitting, fasting, joining | Same |
| **`videos-delivery.json`** | Where to watch video, SLA, name/Sankalp issues | Same |
| **`prasad.json`** | Prasad timeline, add-on, use, damage, address (CS doc section 3.5) | Same |
| **`booking-account.json`** | Payment confirm, GST, family names, gotra Kashyap | Same |
| **`refunds-cancellations.json`** | No-effect, cancel/reschedule framing (refund execution = human) | Same |
| **`spiritual-queries.json`** | Marriage, health, court, debt — no guarantees | Same |
| **`which-puja.json`** | Which seva for shaadi, karz, Hanuman, Ganpati (links, no prices) | Rules pick the id; no keyword scan |
| **`out-of-scope.json`** | Astrology discontinued, no QR pay, live link only if the booking is live, booking counts stay private | Same |

Draft entries (`"status": "draft"`) are ignored. Welcome and handoff lines live in `src/conversation/copy.js`.

### How answers are matched

1. **Rules** for a few fixed cases (new booking, which-puja, spiritual “no guarantee”).
2. **One Gemini call** picks a catalog **`id`** when `SUPPORT_LLM_FAQ_SELECT=true`. Reply text is still the fixed JSON.
3. **Order lookup** for this customer’s booking. Live Puja is confirmed only from that order’s Live Puja line. **Human** for refunds, naam/gotra change, and an upset message on any topic. Calm autopay questions use the subscription cards (steps and links).

Placeholders in JSON: `{{PUJA_UPDATES_SENDER}}` = transactional WhatsApp (**not** support chat `8147560485`). Override via `PUJA_UPDATES_SENDER_LABEL` in `.env`. Website links live in `content/links/site.json`.

### What the bot actually uses

- All published entries merge into **one catalog**. The bot picks an **`id`**, then sends that entry’s **en**, **hi**, or **hinglish** text.
- **`keywords` are not used for routing.** Short words were matching the wrong card. Leave them empty on new cards.
- Order date, video link, and prasad tracking come from the booking, not from these files.

## Entry shape

```json
{
  "id": "unique_snake_case",
  "domain": "puja",
  "status": "draft",
  "owner": "Puja CS",
  "keywords": [],
  "example": "What the customer might type",
  "tags": ["optional"],
  "en": "English answer…",
  "hi": "Hindi in Devanagari…",
  "hinglish": "Roman Hinglish answer…"
}
```

- Set `"status": "published"` when the card should be used. Leave `keywords` empty. They are not used for routing.
- Always provide **`en`**, **`hi`** (Devanagari), and **`hinglish`**. Other languages are rewritten from English.
- **`example`** is a sample customer sentence for CS review. It is not used for routing.
- Do **not** put order IDs, refund amounts, or specific dates in KB.

## How to change copy

1. Edit JSON (valid JSON only — no trailing commas).
2. Restart the agent (`npm start`) or redeploy.
3. Spot-check: `npm test` / MVP scenarios in docs.

## Review

CS owner + engineering on PRs that touch KB. Regression: `tests/faq.test.js`.
