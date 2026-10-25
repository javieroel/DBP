// Configuración de la base de datos leída SOLO desde variables de entorno.
// La usan tanto la aplicación como sequelize-cli (migraciones y seeders).
require("dotenv").config({ quiet: true });

// Dos formas de configurar la base (Unidad 8, apartado 15.2):
//   1) DATABASE_URL=postgresql://usuario:clave@host:5432/base  -> la entregan Render y otros proveedores
//   2) DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD           -> desarrollo y servidor con Docker
function fromDatabaseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL no tiene un formato válido (postgresql://usuario:clave@host:puerto/base).");
  }
  return {
    DB_HOST: url.hostname,
    DB_PORT: url.port || "5432",
    DB_NAME: decodeURIComponent(url.pathname.replace(/^\//, "")),
    DB_USER: decodeURIComponent(url.username),
    DB_PASSWORD: decodeURIComponent(url.password)
  };
}

const fromUrl = process.env.DATABASE_URL ? fromDatabaseUrl(process.env.DATABASE_URL) : {};
const read = (name) => fromUrl[name] || process.env[name];

// Si falta un valor obligatorio, la aplicación se detiene ANTES de aceptar tráfico
const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missing = required.filter((name) => !read(name));
if (missing.length) {
  throw new Error(
    `Faltan variables de entorno: ${missing.join(", ")}. Defina DATABASE_URL o las variables DB_* (vea .env.example).`
  );
}

const useSsl = process.env.DB_SSL === "true";

const base = {
  username: read("DB_USER"),
  password: read("DB_PASSWORD"),
  database: read("DB_NAME"),
  host: read("DB_HOST"),
  port: Number(read("DB_PORT")) || 5432,
  dialect: "postgres",
  logging: process.env.DB_LOGGING === "true" ? (sql) => console.log(`[sql] ${sql}`) : false, // solo para depurar en local
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
