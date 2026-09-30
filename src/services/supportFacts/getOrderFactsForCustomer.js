const { Op } = require('sequelize');
const { getModels } = require('../../models');
const { normalizeFactsPayload } = require('../../orders/trimFacts');
const {
  extractMantraText,
  extractRecommendedPracticesText,
} = require('./pujaGuideExtract');
const { parseIsPrasadFlag } = require('./parseIsPrasadFlag');

async function loadPujaGuideSnippets(productId) {
  if (!productId) return { recommendedMantra: null, dosDontsSummary: null };

  const { PujasHistory, PujaGroup } = getModels();
  const history = await PujasHistory.findOne({
    where: { product_id: productId, is_delete: false },
    attributes: ['id', 'puja_group_id'],
    include: [
      {
        model: PujaGroup,
        required: false,
        attributes: ['puja_guidelines', 'dos'],
      },
    ],
    order: [['id', 'ASC']],
  });
  const group = history?.PujaGroup;
  if (!group) {
    return { recommendedMantra: null, dosDontsSummary: null };
  }

  let recommendedMantra = null;
  let dosDontsSummary = null;
  const mantra = extractMantraText(group.puja_guidelines);
  const practices = extractRecommendedPracticesText({
    dos: group.dos,
    pujaGuidelines: group.puja_guidelines,
  });
  if (mantra) recommendedMantra = mantra.slice(0, 400);
  if (practices) dosDontsSummary = practices.slice(0, 600);
  return { recommendedMantra, dosDontsSummary };
}

async function latestTracking(lineIds) {
  if (!lineIds.length) return null;
  const { OrderDeliveryTracking } = getModels();
  return OrderDeliveryTracking.findOne({
    where: { order_line_item_id: { [Op.in]: lineIds } },
    attributes: ['delivery_status', 'tracking_link', 'updated_at'],
    order: [['updated_at', 'DESC NULLS LAST']],
  });
}

async function getOrderFactsForCustomer(orderId, customerId) {
  const oid = parseInt(orderId, 10);
  const cid = parseInt(customerId, 10);
  if (!oid || !cid) return null;

  const { Order, OrderLineItem, OrderUserDetails } = getModels();
  const order = await Order.findOne({
    where: { id: oid, user_id: cid, is_delete: false },
    attributes: ['id', 'status', 'full_video_link'],
    include: [
      {
        model: OrderUserDetails,
        as: 'orderUserDetails',
        required: false,
        where: { is_delete: false },
        attributes: ['is_prasad'],
      },
      {
        model: OrderLineItem,
        as: 'orderLineItems',
        required: false,
        where: { is_delete: false },
        attributes: ['id', 'product_name', 'product_type', 'actual_pooja_time', 'product_id'],
      },
    ],
    order: [[{ model: OrderLineItem, as: 'orderLineItems' }, 'id', 'ASC']],
  });
  if (!order) return null;

  const lines = order.orderLineItems || [];
  const product = lines.find((line) => line.product_type === 'Product');
  const addonNames = [];
  const prasadLineNames = [];
  for (const line of lines) {
    const name = String(line.product_name || '').trim();
    if (!name) continue;
    if (line.product_type === 'Addon') addonNames.push(name);
    else if (line.product_type === 'Prasad') prasadLineNames.push(name);
  }

  const hasLivePuja = lines.some((line) => line.product_type === 'LivePuja');
  const isPrasad = parseIsPrasadFlag(order.orderUserDetails?.[0]?.is_prasad);
  const videoLink = (order.full_video_link || '').trim();
  const videoReady = Boolean(videoLink);

  const [guide, tracking] = await Promise.all([
    loadPujaGuideSnippets(product?.product_id),
    isPrasad ? latestTracking(lines.map((line) => line.id)) : Promise.resolve(null),
  ]);

  let prasadStatus = null;
  let trackingLink = null;
  if (isPrasad) {
    prasadStatus = tracking?.delivery_status || 'pending';
    trackingLink = tracking?.tracking_link || null;
  }

  const scheduledAt = product?.actual_pooja_time || null;
  return normalizeFactsPayload({
    orderId: String(order.id),
    productName: product?.product_name || 'booking',
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    orderStatus: order.status || '',
    videoReady,
    videoPublishedAt: null,
    videoLink: videoReady ? videoLink : null,
    isPrasad,
    prasadStatus,
    trackingLink,
    recommendedMantra: guide.recommendedMantra,
    dosDontsSummary: guide.dosDontsSummary,
    addonNames,
    prasadLineNames,
    hasLivePuja,
  });
}

module.exports = { getOrderFactsForCustomer };
