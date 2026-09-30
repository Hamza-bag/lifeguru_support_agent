const { handleTurn, resolveChatPhone } = require('../pipeline/turn');
const { sessionAllowsVisitor } = require('../pipeline/phoneContext');
const { finalizeBotReplies } = require('../llm/finalizeReplies');
const { mirrorTimeoutMs: computeMirrorTimeout } = require('../lib/webhookBudget');
const { rulesBlockForPrompt } = require('../content/loadContent');
const { toSalesIqBody } = require('./payload');
const { scheduleHandoffNote } = require('./handoffNotes');

async function processIncomingTurn({
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
  webhookStartedAt = Date.now(),
  mirrorBudgetMs,
  notesClient,
}) {
  let prior = prev;
  let sessionReset = null;
  if (!fresh && prior && chatPhone && !sessionAllowsVisitor(prior, chatPhone)) {
    prior = null;
    sessionReset = 'visitor_phone_mismatch';
  }

  let { state, response } = await handleTurn(
    {
      state: prior,
      text,
      isNewChat: fresh,
      chatPhone: chatPhone || undefined,
      salesIqPayload: payload,
    },
    factsClient,
  );

  const mirrorTimeout =
    typeof mirrorBudgetMs === 'number'
      ? mirrorBudgetMs
      : computeMirrorTimeout({ config, webhookStartedAt });

  const finalized = await finalizeBotReplies({
    config,
    userText: text,
    state,
    response,
    rulesBlock: rulesBlockForPrompt(),
    mirrorTimeoutMs: mirrorTimeout,
  });
  response = finalized.response;

  if (response.action === 'forward') {
    state = { ...state, handoffRequested: true };
  }
  await store.set(key, state);

  if (response.action === 'forward') {
    scheduleHandoffNote({
      config,
      notesClient,
      logger,
      payload,
      conversationKey: key,
      state,
      userText: text,
      response,
    });
  }

  const phoneResolved = resolveChatPhone({ chatPhone: chatPhone || undefined }, state);
  logger.write({
    source: 'salesiq',
    conversation: key,
    handler: payload.handler,
    operation: payload.operation,
    user: text,
    action: response.action,
    bot: response.replies,
    visitorPhoneInPayload: chatPhone || null,
    sessionReset,
    phoneSource: response.phoneSource || phoneResolved.source,
    usedLlmPolish: finalized.usedLlm,
    llmReplyMode: finalized.llmMode,
    llmSkipReason: finalized.llmSkipReason || null,
    mirrorTimeoutMs: finalized.mirrorTimeoutMs ?? mirrorTimeout,
    webhookElapsedMs: Date.now() - webhookStartedAt,
    usedLlmClassify: Boolean(response.classifyMeta?.usedLlmClassify),
    classify: response.classifyMeta || null,
  });

  return { state, response: toSalesIqBody(response), finalized };
}

module.exports = { processIncomingTurn };
