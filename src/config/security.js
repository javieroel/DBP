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

const behindHttpsProxy = process.env.HTTPS_PROXY_ENABLED === "true";

// Cuántos proxies hay entre internet y la app (Caddy = 1; en Render hay varios: Cloudflare + balanceadores).
// Con el número exacto, Express toma como IP del cliente la entrada correcta de X-Forwarded-For.
// Un valor menor deja la IP de un proxy interno (el límite de intentos dejaría de ser por cliente);
// "true" o un valor mayor permitiría que el cliente falsifique su IP enviando su propio encabezado.
const trustProxyHops = Number(process.env.TRUST_PROXY || 1);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 1 || trustProxyHops > 10) {
  throw new Error("TRUST_PROXY debe ser un número entero entre 1 y 10 (cantidad de proxies delante de la app).");
}
if (process.env.NODE_ENV === "production" && !behindHttpsProxy) {
  // No se detiene (el servidor de la red local puede usarse por HTTP), pero queda advertido en el log
  console.warn(JSON.stringify({
    time: new Date().toISOString(),
    level: "warn",
    msg: "produccion_sin_https",
    detalle: "NODE_ENV=production sin HTTPS_PROXY_ENABLED=true: no se envía HSTS."
  }));
}

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
  behindHttpsProxy,
  trustProxyHops,
  bcryptRounds: 12
};
