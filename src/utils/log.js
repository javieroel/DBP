// LOGS ESTRUCTURADOS (Unidad 8): una línea JSON por evento, con fecha, nivel, mensaje e id de solicitud.
// Una línea JSON se puede filtrar y buscar en el panel del proveedor (Render) o con grep/jq en el servidor.
// Regla de seguridad: nunca se registran contraseñas, tokens, cabeceras Authorization ni cuerpos completos.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = LEVELS[String(process.env.LOG_LEVEL || "info").toLowerCase()] || LEVELS.info;

// Si por error alguien pasa un campo con nombre sensible, su valor se reemplaza antes de escribir
const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie/i;

function clean(fields = {}) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = SENSITIVE_KEY.test(key) ? "[oculto]" : value;
  }
  return out;
}

function write(level, msg, fields) {
  if (LEVELS[level] < minLevel) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...clean(fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Enmascara un correo para los logs: "analista@incidentes.local" -> "an***@incidentes.local"
function maskEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return "[correo no válido]";
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain}`;
}

module.exports = {
  debug: (msg, fields) => write("debug", msg, fields),
  info: (msg, fields) => write("info", msg, fields),
  warn: (msg, fields) => write("warn", msg, fields),
  error: (msg, fields) => write("error", msg, fields),
  maskEmail
};
