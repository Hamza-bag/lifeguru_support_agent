#!/usr/bin/env node
/**
 * One-time grant-code exchange + manual refresh for SalesIQ callbacks OAuth.
 *
 *   node scripts/zoho-salesiq-oauth.js exchange --code '1000....'
 *   node scripts/zoho-salesiq-oauth.js refresh
 *
 * Reads SALESIQ_CLIENT_ID, SALESIQ_CLIENT_SECRET, SALESIQ_ACCOUNTS_URL from .env
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
  defaultAccountsUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
} = require('../src/salesiq/oauthToken');

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
}

function printTokens(result) {
  console.log('\nAdd or update in lifeguru_support_agent/.env:\n');
  console.log(`SALESIQ_OAUTH_TOKEN=${result.accessToken}`);
  if (result.refreshToken) {
    console.log(`SALESIQ_REFRESH_TOKEN=${result.refreshToken}`);
  } else {
    console.log(
      '# No refresh_token — regenerate grant code with offline access (see docs/support-agent-zoho-oauth.md)',
    );
  }
  console.log(`\n(access token valid ~${result.expiresInSec}s; agent auto-refreshes if refresh_token is set)\n`);
}

async function main() {
  const cmd = process.argv[2];
  const codeArg = process.argv.find((a) => a.startsWith('--code='))?.slice(7);
  const codeFlagIdx = process.argv.indexOf('--code');
  const code =
    codeArg || (codeFlagIdx >= 0 ? process.argv[codeFlagIdx + 1] : null);

  const clientId = env('SALESIQ_CLIENT_ID');
  const clientSecret = env('SALESIQ_CLIENT_SECRET');
  const accountsFlag = process.argv.find((a) => a.startsWith('--accounts='))?.slice(11);
  const accountsIdx = process.argv.indexOf('--accounts');
  const accountsOverride =
    accountsFlag || (accountsIdx >= 0 ? process.argv[accountsIdx + 1] : null);
  const accountsUrl =
    accountsOverride ||
    process.env.SALESIQ_ACCOUNTS_URL ||
    defaultAccountsUrl(process.env.SALESIQ_API_BASE);

  console.log(`Using token URL: ${accountsUrl}/oauth/v2/token`);

  if (cmd === 'exchange') {
    if (!code) {
      console.error('Usage: node scripts/zoho-salesiq-oauth.js exchange --code YOUR_GRANT_CODE');
      process.exit(1);
    }
    const result = await exchangeAuthorizationCode({
      accountsUrl,
      clientId,
      clientSecret,
      code,
    });
    printTokens(result);
    return;
  }

  if (cmd === 'refresh') {
    const refreshToken = env('SALESIQ_REFRESH_TOKEN');
    const result = await refreshAccessToken({
      accountsUrl,
      clientId,
      clientSecret,
      refreshToken,
    });
    printTokens(result);
    return;
  }

  console.log(`Usage:
  node scripts/zoho-salesiq-oauth.js exchange --code <grant_code> [--accounts https://accounts.zoho.in]
  node scripts/zoho-salesiq-oauth.js refresh [--accounts https://accounts.zoho.in]

Setup: docs/support-agent-zoho-oauth.md`);
  process.exit(1);
}

main().catch((err) => {
  console.error('OAuth error:', err.message || err);
  process.exit(1);
});
