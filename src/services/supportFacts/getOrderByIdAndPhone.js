const { Op } = require('sequelize');
const { normalizePhoneDigits } = require('../../orders/phone');
const { getModels } = require('../../models');
const { findUsersByPhoneDigits, mapOrdersToList } = require('./orderListHelpers');
async function getOrderByIdAndPhone(orderId, phone) {
  const oid = parseInt(orderId, 10);
  const digits = normalizePhoneDigits(phone);
  if (!oid || !digits || digits.length < 10) {
    return { matched: false };
  }

  const users = await findUsersByPhoneDigits(digits);
  if (!users.length) {
    return { matched: false };
  }
  const userIds = new Set(users.map((u) => u.id));
  const userById = new Map(users.map((u) => [u.id, u]));

  const { Order } = getModels();
  const order = await Order.findOne({
    where: { id: oid, is_delete: false, user_id: { [Op.in]: [...userIds] } },
    attributes: ['id', 'user_id', 'status', 'created_at'],
  });

  if (!order || !userIds.has(order.user_id)) {
    return { matched: false };
  }

  const user = userById.get(order.user_id);
  const [listed] = await mapOrdersToList([order], userById);

  return {
    matched: true,
    customerId: String(order.user_id),
    name: user?.user_name || null,
    orders: [
      {
        id: listed.id,
        customerId: listed.customerId,
        title: listed.title,
        bookedOn: listed.bookedOn,
        status: listed.status,
      },
    ],
  };
}

module.exports = { getOrderByIdAndPhone };
