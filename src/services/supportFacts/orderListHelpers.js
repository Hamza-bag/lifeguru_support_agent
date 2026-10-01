const { Op } = require('sequelize');
const { getModels } = require('../../models');
const { internationalPhonePair } = require('../../orders/phone');
const { formatBookedOn } = require('./formatBookedOn');
const { trimProductName } = require('../../orders/trimFacts');

const ORDER_LIST_LIMIT = 3;

/** Exact values so Postgres can use users_phone_is_delete_idx (LIKE '%x%' cannot). */
function phoneEqualityValues(digits) {
  return [digits, `91${digits}`, `+91${digits}`, `0${digits}`];
}

function phoneMatchValues(digits) {
  const values = phoneEqualityValues(digits);
  if (String(digits).length > 10) values.push(`+${digits}`);
  return values;
}

/** 10-digit Indian lookup is unchanged. Longer numbers also match country_code + local phone. */
function userPhoneWhere(digits) {
  const phoneIn = { phone: { [Op.in]: phoneMatchValues(digits) } };
  const pair = internationalPhonePair(digits);
  if (!pair) {
    return { ...phoneIn, is_delete: false };
  }
  return {
    is_delete: false,
    [Op.or]: [
      phoneIn,
      {
        country_code: { [Op.in]: [pair.countryCode, `+${pair.countryCode}`] },
        phone: pair.national,
      },
    ],
  };
}

async function titlesByOrderId(orderIds) {
  if (!orderIds.length) return new Map();
  const { OrderLineItem } = getModels();
  const lines = await OrderLineItem.findAll({
    where: {
      order_id: { [Op.in]: orderIds },
      product_type: 'Product',
      is_delete: false,
    },
    attributes: ['id', 'order_id', 'product_name'],
    order: [['id', 'ASC']],
  });
  const titles = new Map();
  for (const line of lines) {
    if (!titles.has(line.order_id)) {
      titles.set(line.order_id, line.product_name || `Order ${line.order_id}`);
    }
  }
  return titles;
}

async function mapOrdersToList(orders, userById) {
  const titles = await titlesByOrderId(orders.map((order) => order.id));
  return orders.map((order) => {
    const user = userById.get(order.user_id);
    return {
      id: String(order.id),
      customerId: String(order.user_id),
      title: trimProductName(titles.get(order.id) || `Order ${order.id}`),
      bookedOn: formatBookedOn(order.created_at),
      status: order.status || '',
      _userId: order.user_id,
      _userName: user?.user_name || null,
    };
  });
}

async function findUsersByPhoneDigits(digits) {
  const { User } = getModels();
  return User.findAll({
    where: userPhoneWhere(digits),
    attributes: ['id', 'user_name', 'phone', 'is_delete'],
  });
}

module.exports = {
  ORDER_LIST_LIMIT,
  mapOrdersToList,
  findUsersByPhoneDigits,
  phoneEqualityValues,
  userPhoneWhere,
};
