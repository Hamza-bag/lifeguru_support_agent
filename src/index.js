require('dotenv').config();

const config = require('./config');
const policy = require('./config/policy');
const { createApp } = require('./app');

const { app } = createApp();

app.listen(config.port, () => {
  console.log(
    `LifeGuru support agent on :${config.port} facts=${config.factsMode} ` +
      `routing=${policy.routingStrategy} classify=${Boolean(config.llmClassifyEnabled && config.geminiApiKey)} ` +
      `classifyTimeoutMs=${config.llmClassifyTimeoutMs} ` +
      `mirror=${Boolean(config.llmMirrorLanguage && config.geminiApiKey)}`,
  );
});
