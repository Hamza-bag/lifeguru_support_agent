require('dotenv').config();

const config = require('./config');
const policy = require('./config/policy');
const { createApp } = require('./app');

if (config.verifySignature && !config.salesIqPublicKey) {
  console.error(
    'SALESIQ_VERIFY_SIGNATURE is true but SALESIQ_PUBLIC_KEY is empty. Refusing to start.',
  );
  process.exit(1);
}

const { app } = createApp();

app.listen(config.port, () => {
  console.log(
    `LifeGuru support agent on :${config.port} facts=sequelize-readonly ` +
      `routing=${policy.routingStrategy} classify=${Boolean(config.llmClassifyEnabled && config.geminiApiKey)} ` +
      `classifyTimeoutMs=${config.llmClassifyTimeoutMs} ` +
      `mirror=${Boolean(config.llmMirrorLanguage && config.geminiApiKey)}`,
  );
});
