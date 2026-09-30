const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  defaultAccountsUrl,
  createOAuthTokenProvider,
} = require('../src/salesiq/oauthToken');

describe('SalesIQ OAuth token provider', () => {
  it('picks accounts host from API base region', () => {
    assert.equal(defaultAccountsUrl('https://salesiq.zoho.in/api/v2'), 'https://accounts.zoho.in');
    assert.equal(defaultAccountsUrl('https://salesiq.zoho.com/api/v2'), 'https://accounts.zoho.com');
  });

  it('is configured with refresh credentials or static access token', () => {
    const withRefresh = createOAuthTokenProvider({
      salesIqOauthToken: '',
      salesIqRefreshToken: 'rt',
      salesIqClientId: 'id',
      salesIqClientSecret: 'sec',
      salesIqApiBase: 'https://salesiq.zoho.in/api/v2',
    });
    assert.equal(withRefresh.canRefresh, true);
    assert.equal(withRefresh.isConfigured(), true);

    const staticOnly = createOAuthTokenProvider({
      salesIqOauthToken: 'at',
      salesIqRefreshToken: '',
      salesIqClientId: '',
      salesIqClientSecret: '',
    });
    assert.equal(staticOnly.canRefresh, false);
    assert.equal(staticOnly.isConfigured(), true);
  });
});
