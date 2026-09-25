const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content');
const KB_DIR = path.join(CONTENT_DIR, 'kb');
const RULES_DIR = path.join(CONTENT_DIR, 'rules');

const GUARDRAILS_PATH = path.join(RULES_DIR, 'guardrails.md');
const ROUTER_RULES_PATH = path.join(RULES_DIR, 'gemini-router.md');
const CLASSIFY_SUMMARY_PATH = path.join(RULES_DIR, 'classify-summary.md');
const FAQ_PATH = path.join(KB_DIR, 'faq.json');

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
  try {
    const list = JSON.parse(fs.readFileSync(FAQ_PATH, 'utf8'));
    cachedFaqEntries = Array.isArray(list) ? list : [];
  } catch {
    cachedFaqEntries = [];
  }
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
  /** @deprecated use ROUTER_RULES_PATH */
  RULES_PATH: ROUTER_RULES_PATH,
  FAQ_PATH,
  readGuardrails,
  readRules,
  readFaqEntries,
  guardrailsBlockForPrompt,
  classifyRulesBlockForPrompt,
  rulesBlockForPrompt,
  CLASSIFY_SUMMARY_PATH,
};
