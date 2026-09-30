const { Sequelize } = require('sequelize');
const config = require('../config');

let sequelize;

function getSequelize() {
  if (sequelize) return sequelize;
  const { db } = config;
  if (!db.host || !db.database || !db.user) {
    throw new Error(
      'Database not configured — set SUPPORT_DB_* (or DB_* for dev) from admin backend .env.',
    );
  }
  sequelize = new Sequelize(db.database, db.user, db.password, {
    host: db.host,
    port: db.port,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: db.poolMax,
      idle: 30_000,
      acquire: db.connectionTimeoutMs,
      afterConnect: async (connection) => {
        await connection.query('SET default_transaction_read_only = ON');
      },
    },
    dialectOptions: {
      statement_timeout: db.queryTimeoutMs,
    },
  });
  return sequelize;
}

async function closeSequelize() {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
  }
}

module.exports = { getSequelize, closeSequelize };
