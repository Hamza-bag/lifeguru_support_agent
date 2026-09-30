const { listRecentOrdersByPhone } = require('./listRecentOrdersByPhone');
const { getOrderByIdAndPhone } = require('./getOrderByIdAndPhone');
const { getOrderFactsForCustomer } = require('./getOrderFactsForCustomer');

module.exports = {
  listRecentOrdersByPhone,
  getOrderByIdAndPhone,
  getOrderFactsForCustomer,
};
