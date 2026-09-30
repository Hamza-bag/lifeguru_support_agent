const { buildHandoffNote } = require('../conversation/handoffSummary');
const { salesIqConversationId } = require('./payload');

function scheduleHandoffNote({
  config,
  notesClient,
  logger,
  payload,
  conversationKey,
  state,
  userText,
  response,
  escalationReason,
}) {
  if (!config.salesIqHandoffNotes || !notesClient?.isConfigured?.()) return;
  if (response?.action !== 'forward') return;

  const convId = salesIqConversationId(payload) || conversationKey;
  if (!convId || String(convId).startsWith('botpreview_')) return;

  const note = buildHandoffNote({
    state,
    userText,
    response,
    escalationReason: escalationReason || state?.handoffEscalation,
  });

  notesClient.addNote(convId, note).then((result) => {
    if (!logger?.write) return;
    logger.write({
      source: 'salesiq',
      conversation: conversationKey,
      handler: 'handoff_note',
      user: userText,
      action: 'note',
      note: result.ok ? 'handoff_note_ok' : 'handoff_note_failed',
      error: result.ok ? undefined : result.reason,
    });
  });
}

module.exports = { scheduleHandoffNote };
