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
  salesIqRequestId,
  toSalesIqBody,
} = require('./salesiq/payload');
const { maybeCaptureWebhookSample } = require('./salesiq/captureSample');
const { normalizePhoneDigits } = require('./orders/phone');
const { parseConversationEvent } = require('./salesiq/shadow');
const { createChatLogger } = require('./logging/chatLog');
const { processIncomingTurn } = require('./salesiq/processTurn');
const { createCallbackClient } = require('./salesiq/callbackClient');
const { createConversationNotesClient } = require('./salesiq/conversationNotes');
const { createOAuthTokenProvider } = require('./salesiq/oauthToken');
const { scheduleHandoffNote } = require('./salesiq/handoffNotes');
const { shouldUseAsyncWebhook, pendingWaitReply } = require('./salesiq/asyncWebhook');

function createApp(overrides = {}) {
  const appConfig = overrides.config ? { ...config, ...overrides.config } : config;
  const factsClient = overrides.factsClient || createFactsClient();
  const store = overrides.store || createSessionStore();
  const failureLogDedupe = new Map();
  const FAILURE_LOG_DEDUPE_MS = 60_000;
  const logger = overrides.logger || createChatLogger({
    enabled: appConfig.logPayloads && process.env.NODE_ENV !== 'test',
  });
  const salesIqTokenProvider =
    overrides.salesIqTokenProvider || createOAuthTokenProvider(appConfig);
  const callbackClient =
    overrides.callbackClient || createCallbackClient(appConfig, salesIqTokenProvider);
  const notesClient =
    overrides.notesClient ||
    createConversationNotesClient(appConfig, salesIqTokenProvider);
  const pendingQueues = new Map();

  const failOpenForwardReply = {
    action: 'forward',
    replies: ['Connecting you to a LifeGuru team member.'],
  };

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
        const { state, response } = await processIncomingTurn({
          config: appConfig,
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
          mirrorBudgetMs: appConfig.asyncMirrorTimeoutMs,
          notesClient,
        });
        let sent = await callbackClient.sendResponse(requestId, response);
        if (!sent.ok && appConfig.supportFailOpenForward) {
          const handoff =
            response.action === 'forward' ? response : failOpenForwardReply;
          sent = await callbackClient.sendResponse(requestId, handoff, {
            forceForward: true,
          });
          if (response.action !== 'forward') {
            scheduleHandoffNote({
              config: appConfig,
              notesClient,
              logger,
              payload,
              conversationKey: key,
              state,
              userText: text,
              response: handoff,
              escalationReason: 'fail_open:callback_failed',
            });
          }
        }
        if (!sent.ok) {
          console.error('[salesiq] callback failed', sent.status, sent.reason);
          logger.write({
            source: 'salesiq',
            conversation: key,
            handler: 'callback',
            user: text,
            action: response.action,
            bot: response.replies,
            note: 'callback_failed',
            requestId,
            callbackAction: sent.body?.action,
            error: sent.reason || String(sent.status),
          });
        } else {
          logger.write({
            source: 'salesiq',
            conversation: key,
            handler: 'callback',
            user: text,
            action: response.action,
            bot: response.replies,
            note: 'callback_ok',
            requestId,
            callbackAction: sent.body?.action,
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
        if (appConfig.supportFailOpenForward) {
          const prevState = await store.get(key);
          scheduleHandoffNote({
            config: appConfig,
            notesClient,
            logger,
            payload,
            conversationKey: key,
            state: prevState || {},
            userText: text,
            response: failOpenForwardReply,
            escalationReason: 'fail_open:async_turn_failed',
          });
          await callbackClient.sendResponse(requestId, failOpenForwardReply, {
            forceForward: true,
          });
        }
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
    res.json({ ok: true });
  });

  if (process.env.SUPPORT_DEV_CHATS === 'true') {
    app.get('/dev/chats', (_req, res) => {
      res.json({ file: logger.filePath, chats: logger.readLast(100) });
    });
  }

  const webhook = async (req, res) => {
    if (req.method === 'HEAD' || req.method === 'GET') {
      return res.status(200).end();
    }

    const payload = normalizeWebhookPayload(req.body || {});
    maybeCaptureWebhookSample(payload, { enabled: appConfig.captureSalesIqSample });
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
          config: appConfig,
          callbackClient,
          payload,
          text,
          state: sessionForRoute,
          isNewChat: fresh,
        })
      ) {
        const lang = sessionForRoute.language || 'en';
        const waitLine = pendingWaitReply(lang);
        const requestId = salesIqRequestId(payload);
        logger.write({
          source: 'salesiq',
          conversation: key,
          handler: 'pending',
          user: text,
          action: 'pending',
          bot: [waitLine],
          note: 'pending_accepted',
          requestId,
        });
        deliverPending({
          key,
          text,
          payload,
          requestId,
          chatPhone,
          fresh,
        });
        return res.json({ action: 'pending', replies: [waitLine] });
      }

      const webhookStartedAt = Date.now();
      const { response } = await processIncomingTurn({
        config: appConfig,
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
        notesClient,
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
    enabled: appConfig.verifySignature,
    publicKeyPem: appConfig.salesIqPublicKey,
  });

  app.head('/salesiq/webhook', webhook);
  app.get('/salesiq/webhook', webhook);
  app.post('/salesiq/webhook', signatureGate, webhook);

  const shadow = (req, res) => {
    if (!appConfig.supportDevShadow) {
      return res.status(404).json({ ok: false });
    }
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
