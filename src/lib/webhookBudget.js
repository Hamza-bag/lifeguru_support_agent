/**
 * SalesIQ webhook ~5s total. Mirror/classify timeouts are ceilings; use remaining budget at runtime.
 */
function mirrorTimeoutMs({ config, webhookStartedAt, minMs = 800 }) {
  const ceiling = config.llmMirrorTimeoutMs || 4500;
  const budget = config.webhookBudgetMs || 4800;
  const reserve = config.webhookReserveMs || 250;
  if (!webhookStartedAt) return ceiling;
  const elapsed = Date.now() - webhookStartedAt;
  const remaining = budget - elapsed - reserve;
  if (remaining < minMs) return 0;
  return Math.min(ceiling, remaining);
}

module.exports = { mirrorTimeoutMs };
