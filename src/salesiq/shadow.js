function unwrapEntity(payload = {}) {
  if (payload.entity && typeof payload.entity === 'object') return payload.entity;
  if (payload.data && typeof payload.data === 'object' && payload.data.visitor) {
    return payload.data;
  }
  return payload;
}

function inferEvent(payload) {
  if (payload.event) return String(payload.event);
  if (payload.type) return String(payload.type);
  const inner = unwrapEntity(payload);
  if (inner.message?.text && inner.visitor) return 'conversation.message';
  if (inner.question && inner.visitor) return 'conversation.created';
  return 'unknown';
}

function messageText(message, inner) {
  if (!message && inner?.question) return String(inner.question);
  if (typeof message === 'string') return message;
  if (!message || typeof message !== 'object') return '';
  if (message.text) return String(message.text);
  if (message.file || message.attachment || message.url || message.type === 'file') {
    return '[media]';
  }
  return '';
}

function parseConversationEvent(payload = {}) {
  const inner = unwrapEntity(payload);
  const visitor = inner.visitor || {};
  const message = inner.message || {};
  const owner = inner.owner || {};
  const text = messageText(message, inner);

  return {
    event: inferEvent(payload),
    conversation: String(
      inner.id || inner.visitor_conversation_id || visitor.id || '',
    ),
    channel: visitor.channel || inner.channel || payload.channel || '',
    visitorPhone: visitor.phone || '',
    visitorName: visitor.name || '',
    operator: owner.email_id || owner.name || '',
    sender: message.sender?.name || '',
    text,
  };
}

module.exports = { inferEvent, parseConversationEvent, unwrapEntity };
