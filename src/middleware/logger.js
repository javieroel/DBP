// REGISTRO DE SOLICITUDES (Unidad 8): cada petición recibe un id de seguimiento (X-Request-Id).
// El mismo id aparece en la respuesta de error que ve el usuario y en el log del servidor,
// así un error reportado se puede localizar en los registros (apartado 15.4).
const crypto = require("crypto");
const log = require("../utils/log");

const VALID_ID = /^[A-Za-z0-9-]{8,64}$/;

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const incoming = req.get("X-Request-Id");
  req.id = incoming && VALID_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.set("X-Request-Id", req.id);

  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const status = res.statusCode;
    // El health check correcto lo consulta el proveedor cada pocos segundos: va a "debug" para no
    // tapar los eventos importantes (15.4: guardar información útil, no todo sin límite).
    const routineHealthCheck = req.originalUrl === "/api/salud" && status === 200;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : routineHealthCheck ? "debug" : "info";
    const fields = {
      reqId: req.id,
      method: req.method,
      path: req.originalUrl.split("?")[0], // sin la consulta: puede contener texto buscado por el usuario
      status,
      ms: Math.round(ms * 10) / 10,
      userId: req.user && req.user.id,
      role: req.user && req.user.role,
      ip: req.ip,
      // Solo la CANTIDAD de entradas de X-Forwarded-For (nunca las IPs): sirve para calibrar TRUST_PROXY
      xff: req.get("X-Forwarded-For") ? req.get("X-Forwarded-For").split(",").length : undefined
    };
    // 401 y 403 son eventos de seguridad: se marcan para poder filtrarlos (OWASP A09)
    if (status === 401 || status === 403) fields.event = "seguridad.acceso_denegado";
    log[level]("solicitud", fields);
  });

  next();
}

module.exports = { requestLogger };
