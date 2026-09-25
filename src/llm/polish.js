function extractJsonObject(text) {
  const raw = String(text || '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function parsePolishedReplies(text, fallback) {
  const parsed = extractJsonObject(text);
  const replies = parsed?.replies;
  if (!Array.isArray(replies) || !replies.length) return fallback;
  const cleaned = replies.map((item) => String(item || '').trim()).filter(Boolean);
  return cleaned.length ? cleaned : fallback;
}

function buildPrompt({ userText, drafts, action, rulesBlock = '' }) {
  return `${rulesBlock}You are a WhatsApp support agent for LifeGuru (Mandir Puja and Chadhava only).

Rewrite the DRAFT replies so they sound natural for THIS user — same language and mix they use. Short messages. Follow SAFETY & TONE GUARDRAILS above (polite, never abusive, no insults even if the user is rude).

Rules:
- MATCH the user's language from their message: US/Indian English, Hindi, Hinglish (Roman), English–Gujarati mix in Roman (e.g. "mari puja kyare avse"), English–Marathi in Roman, or native script (Gujarati, Bengali, Tamil, etc.). Reply in the **same mix and spelling style** (Roman vs native script). Do not switch to formal Hindi/Devanagari if they wrote Eng-Gujarati or Hinglish.
- Example: user "meri puja kab hai" → reply in polite Roman Hinglish (e.g. "Aapki puja 31 Oct ko schedule hai…"), NOT full English unless they wrote English.
- ONLY LifeGuru bookings/support.
- Drafts are the source of truth for facts (dates, status, product names, video/prasad). Do not add, guess, or change facts.
- Do not invent order IDs, prices, refunds, or ETAs.
- Do not say you are an AI.
- Keep the same number of reply bubbles as the draft when possible.
- If action is "forward" or "end", keep that meaning.

User just said: ${JSON.stringify(userText || '')}
Action: ${action}
Draft replies: ${JSON.stringify(drafts)}

Return JSON only: {"replies":["..."]}`;
}

async function polishReplies({
  apiKey,
  model,
  userText,
  drafts,
  action,
  timeoutMs = 2500,
  rulesBlock = '',
}) {
  if (!apiKey || !drafts?.length) {
    return { replies: drafts, usedLlm: false, skipReason: 'no_api_key_or_drafts' };
  }
  const { isOverLimit, recordUsage } = require('./usageLimit');
  if (isOverLimit()) {
    console.error('[llm] monthly usage limit reached (polish skipped)');
    return { replies: drafts, usedLlm: false, skipReason: 'usage_limit' };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: buildPrompt({ userText, drafts, action, rulesBlock }) },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[llm] gemini error', res.status, body.slice(0, 300));
      return { replies: drafts, usedLlm: false, skipReason: `gemini_${res.status}` };
    }
    const data = await res.json();
    const usage = data?.usageMetadata || {};
    const tokens =
      Number(usage.totalTokenCount) ||
      Number(usage.promptTokenCount || 0) + Number(usage.candidatesTokenCount || 0);
    recordUsage({ calls: 1, tokens });
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parsePolishedReplies(text, drafts);
    if (!text.trim()) {
      return { replies: drafts, usedLlm: false, skipReason: 'empty_gemini_response' };
    }
    return { replies: parsed, usedLlm: true };
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timeout' : 'request_failed';
    console.error('[llm] polish failed', err.message || err);
    return { replies: drafts, usedLlm: false, skipReason: reason };
  } finally {
    clearTimeout(timer);
  }
}

async function mirrorReplyLanguage(options) {
  return polishReplies(options);
}

module.exports = {
  polishReplies,
  mirrorReplyLanguage,
  parsePolishedReplies,
  buildPrompt,
  extractJsonObject,
};
