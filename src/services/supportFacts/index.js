const { listRecentOrdersByPhone } = require('./listRecentOrdersByPhone');
const { getOrderByIdAndPhone } = require('./getOrderByIdAndPhone');
const { getOrderFactsForCustomer } = require('./getOrderFactsForCustomer');
const { findOrdersForLookup } = require('./findOrdersForLookup');

module.exports = {
  listRecentOrdersByPhone,
  getOrderByIdAndPhone,
  getOrderFactsForCustomer,
  findOrdersForLookup,
};
