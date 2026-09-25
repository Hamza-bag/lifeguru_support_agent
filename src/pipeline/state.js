function emptyState() {
  return {
    language: null,
    stage: 'await_query',
    pendingText: null,
    pendingIntent: null,
    customerName: null,
    customerId: null,
    orders: [],
    orderId: null,
    chatPhone: null,
    askMoreAttempts: 0,
    clarifyAttempts: 0,
    turns: [],
  };
}

const WELCOME_QUERY =
  'Hi — how can we help with your LifeGuru booking? Type your question (puja time, video, prasad, etc.).\n' +
  'नमस्ते — लाइफगुरु बुकिंग में कैसे मदद करें? अपना सवाल लिखें (पूजा समय, वीडियो, प्रसाद, आदि)।';

module.exports = {
  emptyState,
  WELCOME_QUERY,
};
