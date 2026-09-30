const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content');
const KB_DIR = path.join(CONTENT_DIR, 'kb');
const RULES_DIR = path.join(CONTENT_DIR, 'rules');

const GUARDRAILS_PATH = path.join(RULES_DIR, 'guardrails.md');
const ROUTER_RULES_PATH = path.join(RULES_DIR, 'gemini-router.md');
const CLASSIFY_SUMMARY_PATH = path.join(RULES_DIR, 'classify-summary.md');

/** Merged into FAQ match — see docs/support-agent-knowledge-base-plan.md */
const KB_FAQ_FILES = [
  'faq.json',
  'puja.json',
  'chadhava.json',
  'puja-subscription.json',
  'chadhava-subscription.json',
  'etiquette.json',
  'videos-delivery.json',
  'prasad.json',
  'booking-account.json',
  'refunds-cancellations.json',
  'spiritual-queries.json',
  'which-puja.json',
  'out-of-scope.json',
];

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return '';
  }
}

const cachedGuardrails = readText(GUARDRAILS_PATH);
const cachedRouterRules = readText(ROUTER_RULES_PATH);
const cachedClassifySummary = readText(CLASSIFY_SUMMARY_PATH);
let cachedFaqEntries;

function readGuardrails() {
  return cachedGuardrails;
}

function readRules() {
  return cachedRouterRules;
}

function readFaqEntries() {
  if (cachedFaqEntries) return cachedFaqEntries;
  const merged = [];
  const seenIds = new Set();
  for (const name of KB_FAQ_FILES) {
    const filePath = path.join(KB_DIR, name);
    try {
      const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(list)) continue;
      for (const entry of list) {
        if (!entry?.id || seenIds.has(entry.id)) continue;
        if (entry.status === 'draft') continue;
        seenIds.add(entry.id);
        merged.push(entry);
      }
    } catch {
      // missing file OK until CS adds it
    }
  }
  cachedFaqEntries = merged;
  return cachedFaqEntries;
}

function guardrailsBlockForPrompt() {
  const guardrails = readGuardrails();
  if (!guardrails) return '';
  return `\n---\nSAFETY & TONE GUARDRAILS (non-negotiable):\n${guardrails}\n---\n`;
}

/** Prepended to every Gemini classify + mirror/polish call. */
function readClassifySummary() {
  return cachedClassifySummary;
}

/** Short block for classify only — full guardrails stay on mirror/polish. */
function classifyRulesBlockForPrompt() {
  const summary = readClassifySummary();
  if (summary) {
    return `\n---\nROUTER RULES (JSON only):\n${summary}\n---\n`;
  }
  const rules = readRules();
  if (rules) {
    return `\n---\nTEAM RULES (must follow):\n${rules.slice(0, 1200)}\n---\n`;
  }
  return guardrailsBlockForPrompt();
}

function rulesBlockForPrompt() {
  const parts = [guardrailsBlockForPrompt()];
  const rules = readRules();
  if (rules) {
    parts.push(`\n---\nTEAM RULES (must follow):\n${rules}\n---\n`);
  }
  return parts.join('');
}

module.exports = {
  CONTENT_DIR,
  KB_DIR,
  RULES_DIR,
  GUARDRAILS_PATH,
  ROUTER_RULES_PATH,
  readGuardrails,
  readRules,
  readFaqEntries,
  guardrailsBlockForPrompt,
  classifyRulesBlockForPrompt,
  rulesBlockForPrompt,
  CLASSIFY_SUMMARY_PATH,
};
