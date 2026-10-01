/**
 * Zoho SalesIQ pending callback — finish async turns after action pending.
 * Callback reply lines use `{ text }`; forward uses plain strings when sent as forward.
 */

const { toSalesIqBody } = require('./payload');
const { createOAuthTokenProvider } = require('./oauthToken');

function isInvalidAuthCallback(reason) {
  const s = String(reason || '');
  return /1002|1008|invalid authorization|invalid oauthtoken/i.test(s);
}

function replyLineText(line) {
  if (line && typeof line === 'object' && line.text != null) return String(line.text);
  return String(line ?? '');
}

function mapCallbackReplies(replies, action) {
  const lines = (replies || []).map(replyLineText).filter((t) => t.length > 0);
  if (action === 'forward') return lines;
  return lines.map((text) => ({ text }));
}

function parseZohoApiBody(raw) {
  if (!raw || !String(raw).trim()) return { ok: true, parsed: null };
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error) {
      return { ok: false, parsed, reason: JSON.stringify(parsed) };
    }
    return { ok: true, parsed };
  } catch {
    return { ok: true, parsed: null };
  }
}

function buildCallbackBody(response, config = {}, options = {}) {
  const body = toSalesIqBody(response);
  let action = body.action || 'reply';
  const rawReplies =
    body.replies?.length > 0
      ? body.replies
      : action === 'forward'
        ? ['Connecting you to a LifeGuru team member.']
        : [];

  if (
    config.salesIqPendingCompleteAsReply !== false &&
    action === 'forward' &&
    !options.forceForward
  ) {
    action = 'reply';
  }

  const out = { action, replies: mapCallbackReplies(rawReplies, action) };
  if (body.suggestions?.length) out.suggestions = body.suggestions;
  return out;
}

function createCallbackClient(config, tokenProviderOverride) {
  const base = (config.salesIqApiBase || '').replace(/\/$/, '');
  const screen = config.salesIqScreenName || '';
  const tokenProvider =
    tokenProviderOverride || createOAuthTokenProvider(config);

  function isConfigured() {
    return Boolean(base && screen && tokenProvider.isConfigured());
  }

  async function sendResponse(requestId, response, options = {}) {
    if (!isConfigured() || !requestId) return { ok: false, reason: 'not_configured' };
    const url = `${base}/${encodeURIComponent(screen)}/callbacks/${encodeURIComponent(requestId)}/response`;
    const body = buildCallbackBody(response, config, options);
    let sent = await postJson(url, body);
    if (!sent.ok && isInvalidAuthCallback(sent.reason) && tokenProvider.canRefresh) {
      await tokenProvider.forceRefresh();
      sent = await postJson(url, body);
    }
    return sent;
  }

  async function postJson(url, body) {
    try {
      const token = await tokenProvider.getAccessToken();
      if (!token) return { ok: false, reason: 'not_configured' };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Zoho-oauthtoken ${token}`,
        },
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      const zoho = parseZohoApiBody(raw);
      if (!zoho.ok) {
        return {
          ok: false,
          status: res.status,
          reason: zoho.reason?.slice(0, 500) || raw.slice(0, 500),
          body,
        };
      }
      if (!res.ok) {
        return { ok: false, status: res.status, reason: raw.slice(0, 500), body };
      }
      return { ok: true, status: res.status, data: zoho.parsed, body };
    } catch (err) {
      return { ok: false, reason: String(err.message || err), body };
    }
  }

  return { isConfigured, sendResponse };
}

module.exports = { createCallbackClient, buildCallbackBody, parseZohoApiBody, isInvalidAuthCallback };
