#!/usr/bin/env node
/**
 * Replay parsed PDF chats through support agent (classify + handleTurn).
 * Logs: logs/replay-50-chats.jsonl
 *
 * Usage:
 *   node scripts/parse-pdf-chats.py path/to/export.pdf logs/pdf-50-chats-parsed.json
 *   node scripts/replay-pdf-chats.js logs/pdf-50-chats-parsed.json
 *
 * Env: same .env as agent (GEMINI_API_KEY, FACTS_MODE, etc.)
 * Rate: SUPPORT_REPLAY_DELAY_MS=300 between Gemini calls (default 400)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { createFactsClient } = require('../src/orders/factsClient');
const { handleTurn, emptyState } = require('../src/pipeline/turn');
const { classifyUserMessage } = require('../src/llm/classify');

const delayMs = Number(process.env.SUPPORT_REPLAY_DELAY_MS) || 400;
const classifyOnly = process.env.SUPPORT_REPLAY_CLASSIFY_ONLY === 'true';
const maxMsgsPerChat = Number(process.env.SUPPORT_REPLAY_MAX_MSGS_PER_CHAT) || 5;
const logPath = path.join(__dirname, '../logs/replay-50-chats.jsonl');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function appendLog(row) {
  fs.appendFileSync(logPath, `${JSON.stringify(row)}\n`, 'utf8');
}

async function main() {
  const input = process.argv[2] || path.join(__dirname, '../logs/pdf-50-chats-parsed.json');
  if (!fs.existsSync(input)) {
    console.error('Missing parsed JSON. Run: python3 scripts/parse-pdf-chats.py <export.pdf> logs/pdf-50-chats-parsed.json');
    process.exit(1);
  }
  const { chats } = JSON.parse(fs.readFileSync(input, 'utf8'));
  const facts = createFactsClient({
    mode: config.factsMode,
    apiUrl: config.factsApiUrl,
    apiSecret: config.factsApiSecret,
  });

  fs.writeFileSync(logPath, '', 'utf8');
  console.log(`Replaying ${chats.length} chats → ${logPath}`);
  console.log(`classifyOnly=${classifyOnly} model=${config.geminiModel} facts=${config.factsMode}`);

  let turns = 0;
  for (const chat of chats) {
    let state = emptyState();
    const chatPhone = chat.phone || undefined;
    let msgIndex = 0;
    const messages = (chat.userMessages || []).slice(0, maxMsgsPerChat);
    for (const text of messages) {
      msgIndex += 1;
      turns += 1;
      let classify = null;
      if (config.llmClassifyEnabled && config.geminiApiKey) {
        classify = await classifyUserMessage({
          apiKey: config.geminiApiKey,
          model: config.geminiModel,
          userText: text,
          recentConversation: '',
        });
        await sleep(delayMs);
      }

      let turn = null;
      if (!classifyOnly) {
        if (msgIndex === 1) {
          const welcome = await handleTurn({ state, text: '', isNewChat: true }, facts);
          state = welcome.state;
        }
        turn = await handleTurn(
          { state, text, chatPhone, isNewChat: false },
          facts,
        );
        state = turn.state;
      }

      appendLog({
        ts: new Date().toISOString(),
        ticket: chat.ticket,
        phone: chat.phone,
        msgIndex,
        user: text,
        classify: classify
          ? {
              route: classify.route,
              intent: classify.intent,
              language: classify.language,
              reason: classify.reason,
              usedLlm: classify.usedLlm,
              llmError: classify.llmError,
            }
          : null,
        bot: turn
          ? {
              action: turn.response.action,
              replies: (turn.response.replies || []).map((r) => String(r).slice(0, 280)),
              classifyMeta: turn.response.classifyMeta || null,
            }
          : null,
      });
    }
  }
  console.log(`Done. ${turns} user messages logged.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
