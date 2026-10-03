// Configuración de la base de datos leída SOLO desde variables de entorno.
// La usan tanto la aplicación como sequelize-cli (migraciones y seeders).
require("dotenv").config({ quiet: true });

const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(`Faltan variables de entorno: ${missing.join(", ")}. Revise su archivo .env`);
}

const useSsl = process.env.DB_SSL === "true";

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  dialect: "postgres",
  logging: process.env.DB_LOGGING === "true" ? (sql) => console.log(`[sql] ${sql}`) : false,
  dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: true } } : {},
  pool: { max: 10, min: 0, idle: 10000, acquire: 30000 },
  migrationStorageTableName: "sequelize_meta",
  seederStorage: "sequelize",
  seederStorageTableName: "sequelize_data"
};

module.exports = {
  development: base,
  test: base,
  production: base
};
