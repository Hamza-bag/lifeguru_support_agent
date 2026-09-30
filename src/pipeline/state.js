function emptyState() {
  return {
    language: null,
    replyRegister: null,
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
  'Namaste! Welcome to LifeGuru support 🙏\n' +
  'Ask us anything about your Mandir Puja or Chadhava booking — schedule, video, prasad, or refund.\n' +
  'नमस्ते! लाइफगुरु सपोर्ट में आपका स्वागत है 🙏 पूजा समय, वीडियो, प्रसाद या किसी भी सवाल के लिए यहाँ लिखें।';

module.exports = {
  emptyState,
  WELCOME_QUERY,
};
