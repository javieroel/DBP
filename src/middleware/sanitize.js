// LIMPIEZA DE ENTRADAS (antes de validar):
//  - descarta claves peligrosas (__proto__, constructor, prototype) -> evita "prototype pollution"
//  - quita etiquetas HTML (<script>, <img onerror=...>) -> defensa contra XSS almacenado
//  - quita caracteres de control invisibles y espacios sobrantes
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
// Las contraseñas NO se modifican: se comparan tal cual con el hash bcrypt
const RAW_KEYS = new Set(["password"]);

function cleanString(value) {
  return value
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "") // bloques <script>/<style> con su contenido
    .replace(/<[^>]*>/g, "")                         // resto de etiquetas HTML
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // control (conserva \t \n \r)
    .trim();
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    const clean = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      clean[key] = typeof value === "string" && !RAW_KEYS.has(key) ? cleanString(value) : value;
    }
    req.body = clean;
  }
  next();
}

module.exports = { sanitizeBody, cleanString };
