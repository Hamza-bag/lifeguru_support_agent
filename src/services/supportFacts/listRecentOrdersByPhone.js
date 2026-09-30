const { Op } = require('sequelize');
const { normalizePhoneDigits } = require('../../orders/phone');
const { getModels } = require('../../models');
const {
  ORDER_LIST_LIMIT,
  findUsersByPhoneDigits,
  mapOrdersToList,
} = require('./orderListHelpers');

async function listRecentOrdersByPhone(phone) {
  const digits = normalizePhoneDigits(phone);
  if (!digits || digits.length < 10) {
    return { matched: false };
  }

  const users = await findUsersByPhoneDigits(digits);
  if (!users.length) {
    return { matched: false };
  }

  const userById = new Map(users.map((u) => [u.id, u]));
  const userIds = users.map((u) => u.id);

  const { Order } = getModels();
  const orders = await Order.findAll({
    where: { user_id: { [Op.in]: userIds }, is_delete: false },
    attributes: ['id', 'user_id', 'status', 'created_at'],
    order: [['id', 'DESC']],
    limit: ORDER_LIST_LIMIT,
  });

  if (!orders.length) {
    return { matched: false };
  }

  const list = await mapOrdersToList(orders, userById);
  const lead = list[0];
  return {
    matched: true,
    customerId: String(lead._userId),
    name: lead._userName,
    orders: list.map(({ id, customerId, title, bookedOn, status }) => ({
      id,
      customerId,
      title,
      bookedOn,
      status,
    })),
  };
}

module.exports = { listRecentOrdersByPhone };
