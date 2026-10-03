// Crea UNA sola conexión (pool) a PostgreSQL que reutiliza toda la aplicación.
const { Sequelize } = require("sequelize");
const allConfig = require("../config/config");

const env = process.env.NODE_ENV || "development";
const config = allConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

async function connectDatabase() {
  await sequelize.authenticate();
  console.log(`[db] Conectado a PostgreSQL ${config.host}:${config.port}/${config.database}`);
}

module.exports = { sequelize, connectDatabase };
