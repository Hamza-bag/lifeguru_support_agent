const facts = require('../services/supportFacts');

function createFactsClient() {
  return {
    lookupByPhone: (phone, lookup) => {
      if (!lookup?.key || lookup.key === 'recent') {
        return facts.listRecentOrdersByPhone(phone);
      }
      return facts.findOrdersForLookup(phone, lookup);
    },
    lookupByOrderAndPhone: (orderId, phone) =>
      facts.getOrderByIdAndPhone(orderId, phone),
    getOrderFacts: (orderId, customerId) =>
      facts.getOrderFactsForCustomer(orderId, customerId),
  };
}

module.exports = { createFactsClient };
