const { createDemoFactsClient } = require('./demoFacts');

/** In-memory facts for unit tests (no database). Default = demo phone 9876543210. */
function createStubFactsClient(overrides = {}) {
  const demo = createDemoFactsClient();
  return {
    lookupByPhone: overrides.lookupByPhone || ((phone) => demo.lookupByPhone(phone)),
    lookupByOrderAndPhone:
      overrides.lookupByOrderAndPhone ||
      ((orderId, phone) => demo.lookupByOrderAndPhone(orderId, phone)),
    getOrderFacts:
      overrides.getOrderFacts ||
      ((orderId, customerId) => demo.getOrderFacts(orderId, customerId)),
  };
}

module.exports = { createStubFactsClient, createDemoFactsClient };
