/**
 * Zoho OAuth access tokens (~1h). Refresh with long-lived refresh_token + client credentials.
 * @see https://www.zoho.com/salesiq/help/developer-section/rest-api-prerequisite-v2.html
 */

function invalidClientHint(errorField, accountsUrlUsed) {
  const code =
    typeof errorField === 'string'
      ? errorField
      : errorField?.message || errorField?.code || '';
  if (!/invalid_client/i.test(String(code))) return '';
  const used = String(accountsUrlUsed || '');
  const other =
    used.includes('.zoho.in') ? 'https://accounts.zoho.com' : 'https://accounts.zoho.in';
  return (
    'check Client ID/Secret (no spaces), grant code from same API console DC, ' +
    `token URL must match where Self Client was created (you used ${used}; if wrong, retry with ${other}). ` +
    'Grant codes are one-time — generate a new code after a failed exchange.'
  );
}

function defaultAccountsUrl(apiBase = '') {
  if (String(apiBase).includes('.zoho.in')) return 'https://accounts.zoho.in';
  return 'https://accounts.zoho.com';
}

async function postTokenForm(accountsUrl, params) {
  const base = String(accountsUrl || defaultAccountsUrl()).replace(/\/$/, '');
  const res = await fetch(`${base}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const raw = await res.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  if (!res.ok || data?.error) {
    const err =
      typeof data?.error === 'string'
        ? data.error
        : data?.error?.message || raw.slice(0, 300) || `HTTP ${res.status}`;
    const hint = invalidClientHint(data?.error, accountsUrl);
    throw new Error(hint ? `${err} — ${hint}` : err);
  }
  return data;
}

async function exchangeAuthorizationCode({ accountsUrl, clientId, clientSecret, code }) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code: String(code || '').trim(),
  });
  const data = await postTokenForm(accountsUrl, params);
  return normalizeTokenResponse(data);
}

async function refreshAccessToken({ accountsUrl, clientId, clientSecret, refreshToken }) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: String(refreshToken || '').trim(),
  });
  const data = await postTokenForm(accountsUrl, params);
  return normalizeTokenResponse(data);
}

function normalizeTokenResponse(data) {
  const accessToken = data?.access_token;
  if (!accessToken) throw new Error('No access_token in Zoho response');
  const expiresInSec = Number(data.expires_in) || 3600;
  return {
    accessToken,
    refreshToken: data.refresh_token || null,
    expiresInSec,
    apiDomain: data.api_domain || null,
  };
}

/**
 * In-memory access token with optional auto-refresh before expiry and on auth errors.
 */
function createOAuthTokenProvider(config) {
  const accountsUrl =
    config.salesIqAccountsUrl || defaultAccountsUrl(config.salesIqApiBase);
  const clientId = config.salesIqClientId || '';
  const clientSecret = config.salesIqClientSecret || '';
  const refreshToken = config.salesIqRefreshToken || '';
  const canRefresh = Boolean(clientId && clientSecret && refreshToken);

  let accessToken = config.salesIqOauthToken || '';
  /** Assume env access token is fresh for ~55m if no expires_at known. */
  let expiresAt = accessToken ? Date.now() + 55 * 60 * 1000 : 0;
  let refreshPromise = null;

  async function runRefresh() {
    const result = await refreshAccessToken({
      accountsUrl,
      clientId,
      clientSecret,
      refreshToken,
    });
    accessToken = result.accessToken;
    expiresAt = Date.now() + result.expiresInSec * 1000 - 60_000;
    return accessToken;
  }

  async function forceRefresh() {
    if (!canRefresh) return false;
    if (!refreshPromise) {
      refreshPromise = runRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
    return true;
  }

  async function getAccessToken() {
    const stale = !accessToken || Date.now() >= expiresAt;
    if (canRefresh && stale) {
      await forceRefresh();
    }
    return accessToken;
  }

  function isConfigured() {
    return Boolean(canRefresh || accessToken);
  }

  return { getAccessToken, forceRefresh, canRefresh, isConfigured, accountsUrl };
}

module.exports = {
  defaultAccountsUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
  createOAuthTokenProvider,
};
