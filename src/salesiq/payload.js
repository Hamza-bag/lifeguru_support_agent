/**
 * SalesIQ may send workflow-style `entity` wrappers on webhook bots too.
 */
function normalizeWebhookPayload(body) {
  if (!body || typeof body !== 'object') return {};
  const payload = { ...body };
  const entity = body.entity;
  if (!entity || typeof entity !== 'object') return payload;

  if (entity.visitor) {
    payload.visitor = { ...payload.visitor, ...entity.visitor };
  }
  if (entity.message) payload.message = entity.message;
  if (entity.request) {
    payload.request = { ...payload.request, ...entity.request };
  }
  if (entity.id && !payload.request?.conversation_id) {
    payload.request = { ...payload.request, conversation_id: String(entity.id) };
  }
  return payload;
}

function conversationKey(payload) {
  const request = payload.request || {};
  const visitor = payload.visitor || {};
  const stable =
    visitor.active_conversation_id ||
    request.conversation_id ||
    request.chat_id ||
    visitor.id ||
    visitor.unique_id ||
    visitor.phone;
  if (stable) return String(stable);
  // Failure callbacks use a new request.id per retry — never key sessions on that alone.
  if (isWebhookFailure(payload)) return 'anon';
  return String(request.id || 'anon');
}

/** SalesIQ sends after forward/handoff when preview or routing cannot complete. */
function isWebhookFailure(payload) {
  return payload?.handler === 'failure';
}

const { t } = require('../conversation/copy');

/** Zoho failure handler must reply — returning forward again causes a retry loop. */
function buildFailureResponse(payload, sessionState) {
  const visitor = payload.visitor || {};
  const lang =
    sessionState?.language ||
    (visitor.language === 'hi' ? 'hi' : visitor.language === 'en' ? 'en' : null) ||
    'en';
  const failed =
    payload.failed_response ||
    payload.failedResponse ||
    payload.response ||
    {};
  const failedAction = failed.action;
  if (failedAction === 'forward' || failedAction == null) {
    return {
      action: 'reply',
      replies: [t(lang, 'handoffFailureAgentBusy')],
    };
  }
  return {
    action: 'reply',
    replies: [t(lang, 'error')],
  };
}

function messageHasNonTextMedia(payload) {
  const message = payload?.message;
  if (!message || typeof message !== 'object') return false;
  const type = String(
    message.type || message.msgtype || message.message_type || message.msg_type || '',
  ).toLowerCase();
  if (/^(image|photo|audio|voice|video|file|document|attachment|media|sticker|link|url)$/.test(type)) {
    return true;
  }
  if (/image|audio|voice|video|file|document|attachment/.test(type)) return true;
  if (message.attachment || message.attachments?.length || message.file || message.image) {
    return true;
  }
  if (message.audio || message.voice || message.media?.url) return true;
  if (message.url && type && type !== 'text' && type !== 'txt') return true;
  return false;
}

function messageText(payload) {
  const message = payload.message || {};
  if (typeof message === 'string') return message;
  if (Array.isArray(payload.answers)) {
    const parts = payload.answers
      .map((a) => (typeof a === 'string' ? a : a?.text || a?.value || ''))
      .filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  const text = message.text || message.msg || payload.answers;
  if (text == null) return '';
  if (typeof text === 'string') return text;
  if (typeof text === 'object' && text.text) return String(text.text);
  return String(text);
}

function isNewChat(payload) {
  return payload.handler === 'trigger' || payload.operation === 'chat';
}

function firstNonEmptyPhone(...candidates) {
  for (const value of candidates) {
    if (value == null || value === '') continue;
    const s = String(value).trim();
    if (s) return s;
  }
  return '';
}

/** WhatsApp channel sends booking identity on visitor.phone; website preview often does not. */
function visitorPhone(payload) {
  const visitor = payload.visitor || {};
  const entityVisitor = payload.entity?.visitor || {};
  const visitorInfo = payload.visitor_info || visitor.visitor_info || entityVisitor.visitor_info || {};
  const custom = visitor.custom_info || visitor.custominfo || {};
  return firstNonEmptyPhone(
    visitor.phone,
    visitor.mobile,
    visitor.whatsapp,
    entityVisitor.phone,
    entityVisitor.mobile,
    visitorInfo.phone,
    custom.phone,
    custom.mobile,
    custom.whatsapp,
  );
}

function toSalesIqBody(response) {
  const body = {
    action: response.action || 'reply',
    replies: response.replies || [],
  };
  if (response.suggestions?.length) {
    body.suggestions = response.suggestions;
  }
  return body;
}

module.exports = {
  normalizeWebhookPayload,
  conversationKey,
  messageText,
  messageHasNonTextMedia,
  isNewChat,
  isWebhookFailure,
  buildFailureResponse,
  visitorPhone,
  toSalesIqBody,
};
