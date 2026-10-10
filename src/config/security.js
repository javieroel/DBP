// Configuración de seguridad leída desde variables de entorno.
// Si falta algo crítico, la aplicación NO arranca (es preferible a arrancar insegura).
require("dotenv").config({ quiet: true });

const secret = process.env.JWT_SECRET || "";
if (secret.length < 32 || secret.includes("genere_")) {
  throw new Error(
    "JWT_SECRET falta o es débil (mínimo 32 caracteres). Genere uno con: openssl rand -hex 32"
  );
}

// Orígenes que pueden llamar a la API desde otro dominio (CORS), separados por comas
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  jwt: {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    algorithm: "HS256",
    issuer: "dbp-incidentes",
    audience: "dbp-incidentes-web"
  },
  corsOrigins,
  // true cuando la app está detrás de un proxy HTTPS (Caddy): habilita HSTS y la IP real del cliente
  behindHttpsProxy: process.env.HTTPS_PROXY_ENABLED === "true",
  bcryptRounds: 12
};
