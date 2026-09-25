#!/usr/bin/env node
/**
 * Step 3 smoke: Admin internal support API reachable with shared secret.
 * Usage: set FACTS_* in .env, start admin backend, then npm run smoke:admin [phone]
 */
require('dotenv').config();
const config = require('../src/config');
const { createFactsClient } = require('../src/orders/factsClient');

const phone = process.argv[2] || config.policy.defaultChatPhone;

async function main() {
  if (config.factsMode !== 'http') {
    console.error('Set FACTS_MODE=http in .env (and FACTS_API_URL / FACTS_API_SECRET).');
    process.exit(1);
  }

  const client = createFactsClient({
    mode: config.factsMode,
    apiUrl: config.factsApiUrl,
    apiSecret: config.factsApiSecret,
  });

  console.log(`Lookup phone: ${phone}`);
  console.log(`Admin base: ${config.factsApiUrl}`);

  const lookup = await client.lookupByPhone(phone);
  if (!lookup.matched) {
    console.log('Result: matched=false (route OK — no orders for this phone in DB).');
    process.exit(0);
  }

  console.log(`Result: matched=true customerId=${lookup.customerId} orders=${lookup.orders.length}`);
  if (lookup.orders[0]) {
    const facts = await client.getOrderFacts(lookup.orders[0].id, lookup.customerId);
    console.log('Sample facts:', JSON.stringify(facts, null, 2));
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
