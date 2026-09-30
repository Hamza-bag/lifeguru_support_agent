const { createOAuthTokenProvider } = require('./oauthToken');
const { parseZohoApiBody } = require('./callbackClient');

function createConversationNotesClient(config, tokenProviderOverride) {
  const base = (config.salesIqApiBase || '').replace(/\/$/, '');
  const screen = config.salesIqScreenName || '';
  const tokenProvider =
    tokenProviderOverride || createOAuthTokenProvider(config);

  function isConfigured() {
    return Boolean(base && screen && tokenProvider.isConfigured());
  }

  async function addNote(conversationId, notesText) {
    if (!isConfigured() || !conversationId || !String(notesText || '').trim()) {
      return { ok: false, reason: 'not_configured' };
    }
    const url = `${base}/${encodeURIComponent(screen)}/conversations/${encodeURIComponent(conversationId)}/notes`;
    try {
      const token = await tokenProvider.getAccessToken();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Zoho-oauthtoken ${token}`,
        },
        body: JSON.stringify({ notes: String(notesText).trim() }),
      });
      const raw = await res.text();
      const zoho = parseZohoApiBody(raw);
      if (!zoho.ok) {
        return { ok: false, status: res.status, reason: zoho.reason || raw.slice(0, 300) };
      }
      if (!res.ok) {
        return { ok: false, status: res.status, reason: raw.slice(0, 300) };
      }
      return { ok: true, status: res.status };
    } catch (err) {
      return { ok: false, reason: String(err.message || err) };
    }
  }

  return { isConfigured, addNote };
}

module.exports = { createConversationNotesClient };
