const MAX_NOTE = 3800;
const MAX_LAST_QUERY = 500;
const MAX_SNIPPET = 100;

function trimLine(text, max = MAX_SNIPPET) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function isTrivialGreeting(text) {
  return /^(hi|hello|hey|hii|yo|namaste|नमस्ते)[!.?\s]*$/i.test(String(text || '').trim());
}

function userMessagesFromTurns(state) {
  return (state?.turns || [])
    .filter((t) => t.role === 'user')
    .map((t) => trimLine(t.text, 400))
    .filter(Boolean);
}

function humanEscalationLabel(reason, classifyMeta) {
  if (reason?.startsWith('fail_open:')) {
    return reason.replace('fail_open:', 'System: ').replace(/_/g, ' ');
  }
  if (classifyMeta?.reason) {
    return `${classifyMeta.route || 'human'} — ${classifyMeta.reason}`;
  }
  if (reason) return String(reason).replace(/_/g, ' ');
  return null;
}

/**
 * Short operator-facing summary — not a full transcript.
 */
function buildConversationSummary(state, lastQuery) {
  const parts = [];
  const last = trimLine(lastQuery, MAX_SNIPPET);
  const users = userMessagesFromTurns(state);

  if (state?.customerName) {
    parts.push(`Customer ${state.customerName}`);
  }
  if (state?.orderId) {
    parts.push(`booking ${state.orderId} in context`);
  } else if ((state?.orders || []).length > 0) {
    parts.push(`${state.orders.length} booking(s) shown, none selected yet`);
  }

  const priorUser = users.filter((u) => u !== last && !isTrivialGreeting(u));
  const seen = new Set();
  const snippets = [];
  for (const u of priorUser) {
    const key = u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    snippets.push(trimLine(u, 90));
  }
  const recentSnippets = snippets.slice(-3);

  if (recentSnippets.length) {
    parts.push(`Earlier: ${recentSnippets.join(' → ')}`);
  } else if (users.some(isTrivialGreeting) && last) {
    parts.push('Opened with a greeting');
  } else if (!last && users.length === 0) {
    parts.push('No prior messages in session log');
  }

  if (state?.pendingIntent) {
    parts.push(`Topic: ${state.pendingIntent}`);
  }

  return parts.join('. ').replace(/\.\s*\./g, '.') || 'Short chat — see last query below.';
}

function buildHandoffNote({ state, userText, response, escalationReason }) {
  const lastQuery = trimLine(userText, MAX_LAST_QUERY);
  const lines = ['[LifeGuru support agent — handoff]'];

  if (lastQuery) {
    lines.push(`Last query: ${lastQuery}`);
  }

  lines.push(`Summary: ${buildConversationSummary(state, lastQuery)}`);

  const why = humanEscalationLabel(escalationReason || state?.handoffEscalation, response?.classifyMeta);
  if (why) {
    lines.push(`Handoff reason: ${why}`);
  }

  if (state?.chatPhone) {
    lines.push(`WhatsApp: ${state.chatPhone}`);
  }
  if (state?.claimedBookingPhone && state.claimedBookingPhone !== state.chatPhone) {
    lines.push(`Booking number they typed: ${state.claimedBookingPhone}`);
  }
  if (state?.orderId && !String(lines.join('\n')).includes(state.orderId)) {
    lines.push(`Order ID: ${state.orderId}`);
  }

  let note = lines.join('\n');
  if (note.length > MAX_NOTE) {
    note = `${note.slice(0, MAX_NOTE - 1)}…`;
  }
  return note;
}

module.exports = {
  buildHandoffNote,
  buildConversationSummary,
  MAX_NOTE,
};
