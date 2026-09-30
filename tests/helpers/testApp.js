const { createApp } = require('../../src/app');
const { createDemoFactsClient } = require('./demoFacts');

/** Webhook/integration tests — no database. */
function createTestApp(overrides = {}) {
  return createApp({
    factsClient: createDemoFactsClient(),
    ...overrides,
  });
}

module.exports = { createTestApp };
