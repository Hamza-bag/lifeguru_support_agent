const { extractJsonObject } = require('./polish');
const { isOverLimit, recordUsage } = require('./usageLimit');
const { recordGeminiFailure, recordGeminiSuccess } = require('./geminiCircuit');

/** Default 4.5s — must stay below SalesIQ ~5s webhook budget (Admin lookup follows). */
async function geminiGenerateJson({ apiKey, model, prompt, timeoutMs = 4500 }) {
  if (isOverLimit()) {
    console.error('[llm] monthly usage limit reached');
    return { ok: false, status: 429, reason: 'usage_limit' };
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
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[llm] gemini json error', res.status, body.slice(0, 300));
      recordGeminiFailure(res.status);
      return { ok: false, status: res.status };
    }
    const data = await res.json();
    const usage = data?.usageMetadata || {};
    const tokens =
      Number(usage.totalTokenCount) ||
      Number(usage.promptTokenCount || 0) + Number(usage.candidatesTokenCount || 0);
    recordUsage({ calls: 1, tokens });
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = extractJsonObject(text);
    if (!parsed) {
      recordGeminiFailure(0);
      return { ok: false, status: 0, reason: 'bad_json' };
    }
    recordGeminiSuccess();
    return { ok: true, data: parsed, tokens };
  } catch (err) {
    console.error('[llm] gemini json failed', err.message || err);
    recordGeminiFailure(err.name === 'AbortError' ? 408 : 0);
    return { ok: false, status: 0, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { geminiGenerateJson };
