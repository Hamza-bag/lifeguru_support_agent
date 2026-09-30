#!/usr/bin/env node
/**
 * Usage: copy SUPPORT_DB_* (or DB_*) from admin .env, then npm run smoke:db [phone]
 */
require('dotenv').config();
const { createFactsClient } = require('../src/orders/factsClient');
const { closeSequelize } = require('../src/db/sequelize');

async function main() {
  const phone = process.argv[2] || process.env.SMOKE_PHONE;
  if (!phone) {
    console.error('Usage: npm run smoke:db -- <10-digit phone>');
    process.exit(1);
  }
  const client = createFactsClient();
  console.log('DB lookup for phone:', phone);
  const lookup = await client.lookupByPhone(phone);
  console.log(JSON.stringify(lookup, null, 2));
  if (lookup.matched && lookup.orders?.[0]) {
    const facts = await client.getOrderFacts(lookup.orders[0].id, lookup.customerId);
    console.log('Order facts:', JSON.stringify(facts, null, 2));
  }
  await closeSequelize();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
