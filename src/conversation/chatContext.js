const MAX_TURNS = Number(process.env.SUPPORT_CONTEXT_TURNS) || 8;
const BURST_GAP_MS = Number(process.env.SUPPORT_BURST_GAP_MS) || 12000;

function trimText(text, max = 400) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function appendTurn(state, role, text) {
  const line = trimText(text);
  if (!line) return state;
  const turns = [...(state.turns || []), { role, text: line, at: Date.now() }].slice(-MAX_TURNS);
  return { ...state, turns };
}

/** User pasted multiple lines in one send (local chat or WhatsApp paste). */
function normalizeUserText(text) {
  const raw = String(text || '').trim();
  if (!raw.includes('\n')) return raw;
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' | ');
}

function formatRecentForClassify(state) {
  const turns = state.turns || [];
  if (!turns.length) return '';
  return turns
    .map((t) => `${t.role === 'user' ? 'User' : 'Bot'}: ${t.text}`)
    .join('\n');
}

/**
 * Second+ WhatsApp message within BURST_GAP_MS: merge with last user line for this turn's routing
 * (each webhook still one reply; classify/router sees combined intent).
 */
function mergeRecentUserForRouting(state, newText) {
  const normalized = normalizeUserText(newText);
  if (!normalized) return normalized;
  const now = Date.now();
  const turns = state.turns || [];
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const row = turns[i];
    if (row.role === 'bot') break;
    if (row.role === 'user' && now - row.at <= BURST_GAP_MS) {
      if (row.text === normalized) return normalized;
      return `${row.text} | ${normalized}`;
    }
  }
  return normalized;
}

module.exports = {
  appendTurn,
  normalizeUserText,
  mergeRecentUserForRouting,
  formatRecentForClassify,
  BURST_GAP_MS,
};
