#!/usr/bin/env node
/**
 * Local demo without SalesIQ. Type messages; "reset" starts a new chat.
 * Demo phone: 9876543210
 */
require('dotenv').config();
const readline = require('readline');
const config = require('../src/config');
const { createFactsClient } = require('../src/orders/factsClient');
const { handleTurn, emptyState } = require('../src/pipeline/turn');
const { finalizeBotReplies } = require('../src/llm/finalizeReplies');
const { rulesBlockForPrompt } = require('../src/content/loadContent');
const { createChatLogger } = require('../src/logging/chatLog');

if (process.stdout.setDefaultEncoding) {
  process.stdout.setDefaultEncoding('utf8');
}

async function maybePolish(state, text, response) {
  const { response: out, usedLlm } = await finalizeBotReplies({
    config,
    userText: text,
    state,
    response,
    rulesBlock: rulesBlockForPrompt(),
  });
  return { ...out, usedLlm };
}

async function main() {
  const factsClient = createFactsClient({
    mode: config.factsMode,
    apiUrl: config.factsApiUrl,
    apiSecret: config.factsApiSecret,
  });
  const logger = createChatLogger({ enabled: true });
  let state = emptyState();
  let isNewChat = false;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const chatPhone =
    config.policy.allowDefaultChatPhone && config.policy.defaultChatPhone
      ? config.policy.defaultChatPhone
      : null;
  const factsLabel =
    config.factsMode === 'http'
      ? `http → ${config.factsApiUrl || '(set FACTS_API_URL)'}`
      : 'mock (9876543210 demo orders)';
  console.log(
    'LifeGuru support agent (local).\n' +
      `Facts: ${factsLabel}\n` +
      (chatPhone
        ? `Simulated WhatsApp phone: ${chatPhone} (SUPPORT_DEV_DEFAULT_PHONE)\n`
        : 'No simulated WhatsApp phone — same as webhook without visitor.phone (bot will ask for number).\n') +
      `Classify: ${config.llmClassifyEnabled && config.geminiApiKey ? config.geminiModel : 'rules only'}\n` +
      `Mirror language: ${config.llmMirrorLanguage && config.geminiApiKey ? config.geminiModel : 'off'}\n` +
      `Chat log: ${logger.filePath}\n` +
      'After an answer the bot asks if you need more help. Yes / No closes the chat.\n' +
      'quit = leave. reset = new chat.\n' +
      'Hindi may look split in this terminal; WhatsApp will not.\n',
  );

  const printBot = (response) => {
    const { action, replies, suggestions, usedLlm, classifyMeta } = response;
    const classifyTag =
      classifyMeta?.usedLlmClassify && classifyMeta.route
        ? ` classify:${classifyMeta.route}/${classifyMeta.intent || '-'}`
        : classifyMeta?.route
          ? ` route:${classifyMeta.route}`
          : '';
    for (const msg of replies || []) {
      console.log(`bot [${action}${usedLlm ? ' llm' : ''}${classifyTag}] ${msg}`);
    }
    if (suggestions?.length) {
      console.log(`    suggestions: ${suggestions.join(' | ')}`);
    }
    console.log('');
  };

  const first = await handleTurn({ state, text: '', isNewChat: true }, factsClient);
  state = first.state;
  printBot(first.response);

  const ask = () => {
    rl.question('you> ', async (line) => {
      const text = line.trim();
      if (text === 'quit' || text === 'exit') {
        rl.close();
        return;
      }
      if (text === 'reset') {
        const restarted = await handleTurn(
          { state: emptyState(), text: '', isNewChat: true },
          factsClient,
        );
        state = restarted.state;
        console.log('(new chat)');
        printBot(restarted.response);
        ask();
        return;
      }
      try {
        const result = await handleTurn(
          {
            state,
            text,
            isNewChat,
            ...(chatPhone ? { chatPhone } : {}),
          },
          factsClient,
        );
        const response = await maybePolish(result.state, text, result.response);
        state = result.state;
        logger.write({
          source: 'local-chat',
          user: text,
          action: response.action,
          bot: response.replies,
          usedLlmPolish: Boolean(response.usedLlm),
          usedLlmClassify: Boolean(response.classifyMeta?.usedLlmClassify),
          classify: response.classifyMeta || null,
        });
        printBot(response);
        if (response.action === 'end') {
          const restarted = await handleTurn(
            { state: emptyState(), text: '', isNewChat: true },
            factsClient,
          );
          state = restarted.state;
          console.log('(chat closed — new chat)');
          printBot(restarted.response);
        }
      } catch (err) {
        console.error(err);
      }
      ask();
    });
  };

  ask();
}

main();
