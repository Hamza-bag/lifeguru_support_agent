const facts = require('../services/supportFacts');

function createFactsClient() {
  return {
    lookupByPhone: (phone) => facts.listRecentOrdersByPhone(phone),
    lookupByOrderAndPhone: (orderId, phone) =>
      facts.getOrderByIdAndPhone(orderId, phone),
    getOrderFacts: (orderId, customerId) =>
      facts.getOrderFactsForCustomer(orderId, customerId),
  };
}

module.exports = { createFactsClient };
