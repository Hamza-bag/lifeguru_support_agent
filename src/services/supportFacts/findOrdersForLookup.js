const { Op } = require('sequelize');
const { normalizePhoneDigits } = require('../../orders/phone');
const { getModels } = require('../../models');
const { findUsersByPhoneDigits, mapOrdersToList } = require('./orderListHelpers');

/** Cap a date search so one reply cannot list a customer's whole history. */
const LOOKUP_MATCH_LIMIT = 6;

const ORDER_ATTRS = ['id', 'user_id', 'status', 'created_at'];

function istDayStart(isoDate) {
  return new Date(`${isoDate}T00:00:00+05:30`);
}

function istDayEnd(isoDate) {
  return new Date(istDayStart(isoDate).getTime() + 24 * 60 * 60 * 1000);
}

function lookupDetail(lookup) {
  if (!lookup) return '';
  if (lookup.date) return lookup.date;
  if (lookup.from && lookup.to) return `${lookup.from} to ${lookup.to}`;
  return lookup.key || '';
}

async function present(orders, userById, extra = {}) {
  if (!orders.length) {
    const user = userById.values().next().value;
    return {
      matched: true,
      customerId: user ? String(user.id) : null,
      name: user?.user_name || null,
      orders: [],
      ...extra,
    };
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
    ...extra,
  };
}

async function findOwnedOrders(userIds, where, order, limit) {
  const { Order } = getModels();
  return Order.findAll({
    where: { user_id: { [Op.in]: userIds }, is_delete: false, ...where },
    attributes: ORDER_ATTRS,
    order,
    limit,
  });
}

async function findOrdersForLookup(phone, lookup) {
  const digits = normalizePhoneDigits(phone);
  const key = lookup?.key;
  if (!digits || digits.length < 10 || !key) return { matched: false };

  const users = await findUsersByPhoneDigits(digits);
  if (!users.length) return { matched: false };
  const userById = new Map(users.map((user) => [user.id, user]));
  const userIds = users.map((user) => user.id);
  const detail = lookupDetail(lookup);

  if (key === 'first') {
    const orders = await findOwnedOrders(userIds, {}, [['id', 'ASC']], 1);
    if (!orders.length) return { matched: false };
    return present(orders, userById);
  }

  if (key === 'latest') {
    const orders = await findOwnedOrders(userIds, {}, [['id', 'DESC']], 1);
    if (!orders.length) return { matched: false };
    return present(orders, userById);
  }

  if (key === 'on_date' || key === 'between') {
    const from = key === 'on_date' ? lookup.date : lookup.from;
    const to = key === 'on_date' ? lookup.date : lookup.to;
    if (!from || !to) return { matched: false };
    const orders = await findOwnedOrders(
      userIds,
      { created_at: { [Op.gte]: istDayStart(from), [Op.lt]: istDayEnd(to) } },
      [['id', 'DESC']],
      LOOKUP_MATCH_LIMIT,
    );
    if (!orders.length) {
      return present([], userById, { lookupNotice: 'none', lookupDetail: detail });
    }
    return present(orders, userById);
  }

  if (key === 'puja_on') {
    if (!lookup.date) return { matched: false };
    const owned = await findOwnedOrders(userIds, {}, [['id', 'DESC']], 100);
    if (!owned.length) return { matched: false };
    const { OrderLineItem } = getModels();
    const lines = await OrderLineItem.findAll({
      where: {
        order_id: { [Op.in]: owned.map((order) => order.id) },
        is_delete: false,
        actual_pooja_time: {
          [Op.gte]: istDayStart(lookup.date),
          [Op.lt]: istDayEnd(lookup.date),
        },
      },
      attributes: ['order_id'],
    });
    const hit = new Set(lines.map((line) => line.order_id));
    const orders = owned.filter((order) => hit.has(order.id)).slice(0, LOOKUP_MATCH_LIMIT);
    if (!orders.length) {
      return present([], userById, { lookupNotice: 'none', lookupDetail: detail });
    }
    return present(orders, userById);
  }

  return { matched: false };
}

module.exports = { findOrdersForLookup, LOOKUP_MATCH_LIMIT };
