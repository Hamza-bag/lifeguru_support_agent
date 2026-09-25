/**
 * SalesIQ webhook: session load → handleTurn (engine) → finalizeBotReplies → log → JSON.
 * @see docs/support-agent-architecture.md
 */
const express = require('express');
const config = require('./config');
const { createFactsClient } = require('./orders/factsClient');
const { createSessionStore } = require('./session/createStore');
const { emptyState } = require('./pipeline/state');
const { requireSalesIqSignature } = require('./salesiq/signature');
const {
  normalizeWebhookPayload,
  conversationKey,
  messageText,
  isNewChat,
  isWebhookFailure,
  buildFailureResponse,
  visitorPhone,
  toSalesIqBody,
} = require('./salesiq/payload');
const { maybeCaptureWebhookSample } = require('./salesiq/captureSample');
const { normalizePhoneDigits } = require('./orders/phone');
const { parseConversationEvent } = require('./salesiq/shadow');
const { createChatLogger } = require('./logging/chatLog');
const { processIncomingTurn } = require('./salesiq/processTurn');
const { createCallbackClient } = require('./salesiq/callbackClient');
const { shouldUseAsyncWebhook, pendingWaitReply } = require('./salesiq/asyncWebhook');
const { salesIqRequestId } = require('./salesiq/requestId');
const { getMonthUsage, getLimits } = require('./llm/usageLimit');

function createApp(overrides = {}) {
  const factsClient = overrides.factsClient || createFactsClient({
    mode: config.factsMode,
    apiUrl: config.factsApiUrl,
    apiSecret: config.factsApiSecret,
    timeoutMs: config.factsApiTimeoutMs,
  });
  const store = overrides.store || createSessionStore();
  const failureLogDedupe = new Map();
  const FAILURE_LOG_DEDUPE_MS = 60_000;
  const logger = overrides.logger || createChatLogger({
    enabled: config.logPayloads && process.env.NODE_ENV !== 'test',
  });
  const callbackClient = overrides.callbackClient || createCallbackClient(config);
  const pendingQueues = new Map();

  function enqueuePending(key, work) {
    const previous = pendingQueues.get(key) || Promise.resolve();
    const current = previous
      .catch(() => {})
      .then(work)
      .finally(() => {
        if (pendingQueues.get(key) === current) pendingQueues.delete(key);
      });
    pendingQueues.set(key, current);
  }

  function deliverPending({ key, text, requestId, payload, chatPhone, fresh }) {
    enqueuePending(key, async () => {
      const prev = fresh ? null : await store.get(key);
      try {
        const { response } = await processIncomingTurn({
          config,
          store,
          factsClient,
          logger,
          key,
          payload,
          text,
          fresh,
          prev,
          chatPhone,
          webhookStartedAt: Date.now(),
          mirrorBudgetMs: config.asyncMirrorTimeoutMs,
        });
        const sent = await callbackClient.sendResponse(requestId, response);
        if (!sent.ok) {
          console.error('[salesiq] callback failed', sent.status, sent.reason);
          logger.write({
            source: 'salesiq',
            conversation: key,
            handler: 'callback',
            user: text,
            action: 'reply',
            note: 'callback_failed',
            error: sent.reason || String(sent.status),
          });
        }
      } catch (err) {
        console.error('[salesiq] async turn failed', err);
        logger.write({
          source: 'salesiq',
          conversation: key,
          handler: payload?.handler,
          user: text,
          action: 'forward',
          error: String(err.message || err),
          note: 'async_turn_failed',
        });
        await callbackClient.sendResponse(requestId, {
          action: 'forward',
          replies: ['Connecting you to a LifeGuru team member.'],
        });
      }
    });
  }

  const app = express();
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'lifeguru-support-agent',
      factsMode: config.factsMode,
      llmClassify: Boolean(config.llmClassifyEnabled && config.geminiApiKey),
      llmMirrorLanguage: Boolean(config.llmMirrorLanguage && config.geminiApiKey),
      sessionStore: config.sessionStore,
      llmUsageMonth: getMonthUsage(),
      llmLimits: getLimits(),
    });
  });

  app.get('/dev/chats', (_req, res) => {
    res.json({ file: logger.filePath, chats: logger.readLast(100) });
  });

  app.get('/dev/step5', (_req, res) => {
    res.json({
      ok: true,
      step5: {
        factsMode: config.factsMode,
        factsApiConfigured: Boolean(config.factsApiUrl && config.factsApiSecret),
        classify: Boolean(config.llmClassifyEnabled && config.geminiApiKey),
        mirrorLanguage: Boolean(config.llmMirrorLanguage && config.geminiApiKey),
        salesIqPending: Boolean(config.salesIqPendingEnabled && callbackClient.isConfigured()),
        signatureVerify: config.verifySignature,
        captureSample: config.captureSalesIqSample,
        endpoints: {
          webhook: '/salesiq/webhook',
          shadow: '/salesiq/shadow',
          health: '/health',
        },
        doc: 'docs/support-agent-step5-ngrok-salesiq-safe.md',
      },
    });
  });

  const webhook = async (req, res) => {
    if (req.method === 'HEAD' || req.method === 'GET') {
      return res.status(200).end();
    }

    const payload = normalizeWebhookPayload(req.body || {});
    maybeCaptureWebhookSample(payload, { enabled: config.captureSalesIqSample });
    const key = conversationKey(payload);

    if (isWebhookFailure(payload)) {
      const session = await store.get(key);
      const response = buildFailureResponse(payload, session);
      const now = Date.now();
      const lastLogged = failureLogDedupe.get(key) || 0;
      if (now - lastLogged >= FAILURE_LOG_DEDUPE_MS) {
        failureLogDedupe.set(key, now);
        logger.write({
          source: 'salesiq',
          conversation: key,
          handler: 'failure',
          user: '',
          action: response.action,
          bot: response.replies,
          note: 'salesiq_handoff_failed_fallback_reply',
          cause: payload.cause || payload.error || null,
        });
      }
      if (session) {
        await store.set(key, { ...session, handoffFailed: true });
      }
      return res.json(toSalesIqBody(response));
    }

    const text = messageText(payload);
    const fresh = isNewChat(payload);
    const prev = fresh ? null : await store.get(key);
    const sessionForRoute = prev || emptyState();

    try {
      const rawPhone = visitorPhone(payload);
      const chatPhone = rawPhone ? normalizePhoneDigits(rawPhone) : '';

      if (
        shouldUseAsyncWebhook({
          config,
          callbackClient,
          payload,
          text,
          state: sessionForRoute,
          isNewChat: fresh,
        })
      ) {
        const lang = sessionForRoute.language || 'en';
        const waitLine = pendingWaitReply(lang);
        deliverPending({
          key,
          text,
          payload,
          requestId: salesIqRequestId(payload),
          chatPhone,
          fresh,
        });
        return res.json({ action: 'pending', replies: [waitLine] });
      }

      const webhookStartedAt = Date.now();
      const { response } = await processIncomingTurn({
        config,
        store,
        factsClient,
        logger,
        key,
        payload,
        text,
        fresh,
        prev,
        chatPhone,
        webhookStartedAt,
      });
      return res.json(response);
    } catch (err) {
      console.error('[salesiq] handler error', err);
      logger.write({
        source: 'salesiq',
        conversation: key,
        user: text,
        action: 'forward',
        error: String(err.message || err),
      });
      return res.json({
        action: 'forward',
        replies: ['Connecting you to a LifeGuru team member.'],
      });
    }
  };

  const signatureGate = requireSalesIqSignature({
    enabled: config.verifySignature,
    publicKeyPem: config.salesIqPublicKey,
  });

  app.head('/salesiq/webhook', webhook);
  app.get('/salesiq/webhook', webhook);
  app.post('/salesiq/webhook', signatureGate, webhook);

  const shadow = (req, res) => {
    if (req.method === 'HEAD' || req.method === 'GET') {
      return res.status(200).end();
    }
    try {
      const payload = req.body || {};
      const parsed = parseConversationEvent(payload);
      logger.write({
        source: 'salesiq-shadow',
        mode: 'capture-only',
        ...parsed,
        payload,
      });
    } catch (err) {
      console.error('[salesiq-shadow] log failed', err);
    }
    return res.status(200).json({ ok: true });
  };

  app.head('/salesiq/shadow', shadow);
  app.get('/salesiq/shadow', shadow);
  app.post('/salesiq/shadow', shadow);

  return { app, store, factsClient, logger };
}

module.exports = { createApp };
