/** Fixed orders for unit/integration tests (phone 9876543210). */
const DEMO_PHONE = '9876543210';
const DEMO_CUSTOMER_ID = '9001';

const DEMO_ORDERS = [
  {
    id: '1001',
    title: 'Satyanarayan Puja',
    bookedOn: '2026-10-01',
    status: 'paid',
  },
  {
    id: '1002',
    title: 'Chadhava Offering',
    bookedOn: '2026-09-15',
    status: 'paid',
  },
];

const DEMO_FACTS = {
  orderId: '1001',
  productName: 'Satyanarayan Puja',
  scheduledAt: '2026-10-31T07:48:00.000Z',
  orderStatus: 'paid',
  videoReady: false,
  videoPublishedAt: null,
  videoLink: null,
  isPrasad: false,
  prasadStatus: null,
  trackingLink: null,
  recommendedMantra: null,
  dosDontsSummary: null,
};

function isDemoPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.endsWith(DEMO_PHONE) || digits === DEMO_PHONE;
}

function createDemoFactsClient() {
  return {
    async lookupByPhone(phone) {
      if (!isDemoPhone(phone)) return { matched: false };
      return {
        matched: true,
        customerId: DEMO_CUSTOMER_ID,
        name: 'Demo User',
        orders: DEMO_ORDERS,
      };
    },
    async lookupByOrderAndPhone(orderId, phone) {
      if (!isDemoPhone(phone)) return { matched: false };
      const order = DEMO_ORDERS.find((o) => o.id === String(orderId));
      if (!order) return { matched: false };
      return {
        matched: true,
        customerId: DEMO_CUSTOMER_ID,
        name: 'Demo User',
        orders: [order],
      };
    },
    async getOrderFacts(orderId, customerId) {
      if (String(customerId) !== DEMO_CUSTOMER_ID) return null;
      if (String(orderId) === '1001') return { ...DEMO_FACTS };
      if (String(orderId) === '1002') {
        return {
          ...DEMO_FACTS,
          orderId: '1002',
          productName: 'Chadhava Offering',
          scheduledAt: '2026-09-20T10:00:00.000Z',
        };
      }
      return null;
    },
  };
}

module.exports = { createDemoFactsClient, DEMO_PHONE, DEMO_ORDERS, DEMO_FACTS };
