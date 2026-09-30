/**
 * In-process circuit breaker when Gemini returns 429/5xx or times out.
 * Stops classify calls for a cooldown so festival spikes degrade to rules, not errors.
 * (Multi-instance prod: share state via Redis later — same interface.)
 */

let consecutiveFailures = 0;
let openUntil = 0;

function getConfig() {
  return {
    failureThreshold: Number(process.env.SUPPORT_LLM_CIRCUIT_FAILURES) || 5,
    cooldownMs: Number(process.env.SUPPORT_LLM_CIRCUIT_COOLDOWN_MS) || 60_000,
  };
}

function isGeminiCircuitOpen() {
  if (Date.now() < openUntil) return true;
  if (openUntil && Date.now() >= openUntil) {
    openUntil = 0;
    consecutiveFailures = 0;
  }
  return false;
}

function shouldTrip(status) {
  if (!status) return true;
  if (status === 429) return true;
  if (status >= 500) return true;
  return false;
}

function recordGeminiFailure(status) {
  if (!shouldTrip(status)) return;
  consecutiveFailures += 1;
  const { failureThreshold, cooldownMs } = getConfig();
  if (consecutiveFailures >= failureThreshold) {
    openUntil = Date.now() + cooldownMs;
    console.error(
      `[llm] circuit open ${cooldownMs}ms after ${consecutiveFailures} Gemini failures (last status ${status})`,
    );
  }
}

function recordGeminiSuccess() {
  consecutiveFailures = 0;
  openUntil = 0;
}

function resetGeminiCircuitForTests() {
  consecutiveFailures = 0;
  openUntil = 0;
}

module.exports = {
  isGeminiCircuitOpen,
  recordGeminiFailure,
  recordGeminiSuccess,
  resetGeminiCircuitForTests,
};
