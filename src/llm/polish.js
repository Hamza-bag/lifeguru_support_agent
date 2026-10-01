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

function registerHint(register) {
  const map = {
    devanagari: 'User writes Hindi in Devanagari — use polite Hindi (Devanagari).',
    hinglish: 'User writes Roman Hinglish — reply in Roman Hinglish, not formal English.',
    hinglish_or_roman_hi: 'User writes Roman Hinglish — reply in Roman Hinglish, not formal English.',
    punjabi_roman: 'User writes Roman Punjabi / Punjabi-English mix — reply in that mix (e.g. batawo, schedule, chahiye).',
    eng_gujarati: 'User writes English–Gujarati in Roman — match that mix.',
    eng_marathi: 'User writes English–Marathi in Roman — match that mix.',
    indic_regional: 'User uses a regional Indic script — reply in the same script/register.',
    other: 'Reply in the same language as the user. Keep dates, links, names, and booking facts accurate.',
    en: 'User writes standard English — English is OK.',
  };
  return map[register] || map.en;
}

function protectUrls(drafts) {
  const urls = [];
  const safe = (drafts || []).map((draft) =>
    String(draft || '').replace(/https?:\/\/[^\s)]+/gi, (url) => {
      const token = `⟦U${urls.length}⟧`;
      urls.push(url);
      return token;
    }),
  );
  return { safe, urls };
}

function restoreUrls(replies, urls) {
  const used = new Set();
  const restored = (replies || []).map((reply) =>
    String(reply || '')
      .replace(/⟦U(\d+)⟧/g, (token, index) => {
        const url = urls[Number(index)];
        if (!url) return '';
        used.add(Number(index));
        return url;
      })
      .replace(/https?:\/\/[^\s)]+/gi, (url) => (urls.includes(url) ? url : '')),
  );
  const missing = urls.filter((_, index) => !used.has(index));
  if (missing.length && restored.length) {
    restored[restored.length - 1] = `${restored[restored.length - 1]}\n${missing.join('\n')}`.trim();
  }
  return restored;
}

function buildPrompt({ userText, drafts, action, rulesBlock = '', replyRegister, bookingContext = '' }) {
  const registerLine = replyRegister ? `\nLanguage: ${registerHint(replyRegister)}` : '';
  const bookingLine = bookingContext ? `\nBooking already chosen: ${bookingContext}` : '';
  return `${rulesBlock}You are LifeGuru's customer support agent on WhatsApp. You help this customer with their Mandir Puja or Chadhava booking. You are not a general chatbot.

Rewrite the DRAFT into the customer's language. The draft is the answer. Keep its facts.
${registerLine}${bookingLine}

Rules:
- Answer only what they just asked, about the booking in the draft.
- Keep every date, status, product name, link token (⟦U0⟧), and numbered booking line. Do not drop a list. Do not switch to a different booking.
- Do not add "human agent", "talk to the team", menus, or a new question they did not ask.
- If their message is English, reply in English. If it is Hinglish or another language, match that language.
- One reply bubble. Do not say you are an AI.
- If action is "forward" or "end", keep that meaning.

Customer said: ${JSON.stringify(userText || '')}
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
  replyRegister,
  bookingContext = '',
}) {
  if (!apiKey || !drafts?.length) {
    return { replies: drafts, usedLlm: false, skipReason: 'no_api_key_or_drafts' };
  }
  const { isOverLimit, recordUsage } = require('./usageLimit');
  if (isOverLimit()) {
    console.error('[llm] monthly usage limit reached (polish skipped)');
    return { replies: drafts, usedLlm: false, skipReason: 'usage_limit' };
  }
  const { safe: safeDrafts, urls } = protectUrls(drafts);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: buildPrompt({
                  userText,
                  drafts: safeDrafts,
                  action,
                  rulesBlock: String(rulesBlock || '').slice(0, 700),
                  replyRegister,
                  bookingContext,
                }),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
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
    const parsed = restoreUrls(parsePolishedReplies(text, safeDrafts), urls);
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
