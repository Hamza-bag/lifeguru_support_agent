const { normalizePhoneDigits } = require('./phone');
const { normalizeFactsPayload } = require('./trimFacts');

const MOCK_CUSTOMERS = {
  9876543210: {
    customerId: 'mock-1',
    name: 'Anita',
    orders: [
      {
        id: '1001',
        title: 'Satyanarayan Puja',
        bookedOn: '2026-09-12',
        status: 'scheduled',
      },
      {
        id: '1002',
        title: 'Navratri Chadhava',
        bookedOn: '2026-09-28',
        status: 'paid',
      },
    ],
  },
};

const MOCK_FACTS = {
  1001: {
    productName: 'Satyanarayan Puja',
    scheduledAt: '2026-09-12T08:30:00+05:30',
    orderStatus: 'scheduled',
    videoReady: false,
    videoPublishedAt: null,
    isPrasad: true,
    prasadStatus: 'pending',
    trackingLink: null,
  },
  1002: {
    productName: 'Navratri Chadhava',
    scheduledAt: '2026-09-28T07:00:00+05:30',
    orderStatus: 'paid',
    videoReady: true,
    videoPublishedAt: '2026-09-16T11:00:00+05:30',
    isPrasad: true,
    prasadStatus: 'dispatched',
    trackingLink: 'https://track.example/lg-1002',
  },
};

async function lookupByPhoneMock(phone) {
  const key = normalizePhoneDigits(phone);
  const customer = MOCK_CUSTOMERS[key];
  if (!customer) return { matched: false };
  return { matched: true, ...customer };
}

async function getOrderFactsMock(orderId) {
  const facts = MOCK_FACTS[String(orderId)];
  if (!facts) return null;
  return normalizeFactsPayload({ ...facts, orderId: String(orderId) });
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`facts API timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupByPhoneHttp(baseUrl, secret, phone, timeoutMs) {
  const url = `${baseUrl}/internal/support/customers?phone=${encodeURIComponent(phone)}`;
  const res = await fetchWithTimeout(
    url,
    { headers: { 'x-support-agent-secret': secret } },
    timeoutMs,
  );
  if (res.status === 404) return { matched: false };
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`facts lookup failed ${res.status}: ${body}`);
  }
  return res.json();
}

async function getOrderFactsHttp(baseUrl, secret, orderId, customerId, timeoutMs) {
  const url = `${baseUrl}/internal/support/orders/${encodeURIComponent(orderId)}/facts?customerId=${encodeURIComponent(customerId)}`;
  const res = await fetchWithTimeout(
    url,
    { headers: { 'x-support-agent-secret': secret } },
    timeoutMs,
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`facts fetch failed ${res.status}: ${body}`);
  }
  const data = await res.json();
  if (data.fullVideoLink) {
    data.videoReady = true;
  }
  return normalizeFactsPayload(data);
}

function createFactsClient({ mode, apiUrl, apiSecret, timeoutMs = 1200 }) {
  if (mode === 'http') {
    if (!apiUrl || !apiSecret) {
      throw new Error('FACTS_API_URL and FACTS_API_SECRET are required when FACTS_MODE=http');
    }
    return {
      lookupByPhone: (phone) =>
        lookupByPhoneHttp(apiUrl, apiSecret, phone, timeoutMs),
      getOrderFacts: (orderId, customerId) =>
        getOrderFactsHttp(apiUrl, apiSecret, orderId, customerId, timeoutMs),
    };
  }
  return {
    lookupByPhone: lookupByPhoneMock,
    getOrderFacts: (orderId) => getOrderFactsMock(orderId),
  };
}

module.exports = {
  createFactsClient,
  fetchWithTimeout,
  lookupByPhoneMock,
  getOrderFactsMock,
  MOCK_CUSTOMERS,
};
