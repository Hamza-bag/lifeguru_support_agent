/**
 * Zoho SalesIQ pending callback — final reply after async work.
 * @see https://www.zoho.com/salesiq/help/developer-section/pending-response-v2.html
 */

function createCallbackClient(config) {
  const base = (config.salesIqApiBase || '').replace(/\/$/, '');
  const screen = config.salesIqScreenName || '';
  const token = config.salesIqOauthToken || '';

  function isConfigured() {
    return Boolean(base && screen && token);
  }

  async function sendResponse(requestId, response) {
    if (!isConfigured() || !requestId) return { ok: false, reason: 'not_configured' };
    const url = `${base}/${encodeURIComponent(screen)}/callbacks/${encodeURIComponent(requestId)}/response`;
    const body = {
      action: response.action || 'reply',
      replies: response.replies || [],
    };
    if (response.suggestions?.length) {
      body.suggestions = response.suggestions;
    }
    return postJson(url, body);
  }

  async function postJson(url, body) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Zoho-oauthtoken ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const raw = await res.text();
        return { ok: false, status: res.status, reason: raw.slice(0, 200) };
      }
      return { ok: true, status: res.status };
    } catch (err) {
      return { ok: false, reason: String(err.message || err) };
    }
  }

  return { isConfigured, sendResponse };
}

module.exports = { createCallbackClient };
