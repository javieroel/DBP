const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const security = require("./src/config/security"); // falla al arrancar si JWT_SECRET es débil
const { connectDatabase, sequelize } = require("./src/db/sequelize");
const incidentRoutes = require("./src/routes/incidentRoutes");
const authRoutes = require("./src/routes/authRoutes");
const { sanitizeBody } = require("./src/middleware/sanitize");
const { requestLogger } = require("./src/middleware/logger");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");
const asyncHandler = require("./src/middleware/asyncHandler");
const HttpError = require("./src/middleware/httpError");
const log = require("./src/utils/log");
const { version } = require("./package.json");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const ENVIRONMENT = process.env.NODE_ENV || "development";
// Versión desplegada: la del package.json y, si el proveedor la entrega, el commit de Git
const COMMIT = (process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || "").slice(0, 7);

app.disable("x-powered-by"); // no anunciar que usamos Express

// Detrás de un proxy HTTPS (Caddy o Render) se confía en él para conocer la IP real y el protocolo
if (security.behindHttpsProxy) app.set("trust proxy", 1);

// Primero el registro: así TODA petición (incluso las rechazadas por CORS o por JSON inválido)
// recibe un id de seguimiento y queda en el log.
app.use(requestLogger);

// Cabeceras de seguridad: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy...
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:"],
        // Solo se fuerzan peticiones HTTPS cuando de verdad hay HTTPS delante
        "upgrade-insecure-requests": security.behindHttpsProxy ? [] : null
      }
    },
    strictTransportSecurity: security.behindHttpsProxy ? { maxAge: 15552000 } : false
  })
);

// CORS: solo la propia interfaz y los orígenes de CORS_ORIGINS pueden llamar a la API
// desde un navegador. Cualquier otro sitio web recibe 403 y sin cabeceras CORS.
app.use("/api", (req, res, next) => {
  const origin = req.get("Origin");
  if (!origin) return next(); // curl, Postman, scripts: no son navegadores, CORS no aplica
  const ownOrigin = `${req.protocol}://${req.get("host")}`;
  if (origin === ownOrigin || security.corsOrigins.includes(origin)) return next();
  log.warn("cors_bloqueado", { event: "seguridad.cors_bloqueado", reqId: req.id, origin, ip: req.ip });
  return next(new HttpError(403, "Origen no permitido por la política CORS."));
});
app.use(
  "/api",
  cors({
    origin: true, // a esta altura el origen ya fue verificado arriba
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600
  })
);

// Rendimiento: comprime con gzip las respuestas de texto (HTML, CSS, JS y JSON)
app.use(compression());

// Los datos de la API son privados: el navegador no debe guardarlos en caché
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use(express.json({ limit: "10kb" })); // limita el tamaño del cuerpo
app.use(sanitizeBody);                     // limpia las entradas antes de validarlas

// HEALTH CHECK (Unidad 8): el proveedor lo consulta para saber si la instancia puede recibir tráfico.
// Comprueba la dependencia esencial (la base). Responde 503 si no hay conexión.
// No revela tecnologías internas (se retiró "motor"), solo lo necesario para operar.
app.get(
  "/api/salud",
  asyncHandler(async (req, res) => {
    let baseDatos = "conectada";
    try {
      await sequelize.authenticate();
    } catch {
      baseDatos = "sin conexión";
    }
    res.status(baseDatos === "conectada" ? 200 : 503).json({
      estado: baseDatos === "conectada" ? "ok" : "degradado",
      servicio: "Plataforma de gestión de incidentes",
      version,
      commit: COMMIT || undefined,
      entorno: ENVIRONMENT,
      baseDatos,
      tiempoActivoSeg: Math.round(process.uptime())
    });
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/incidentes", incidentRoutes); // protegidas con JWT y roles

app.use("/data", (req, res) => {
  res.status(404).json({ error: "Ruta no disponible de forma directa" });
});

// CSS y JS se revalidan en cada carga con ETag (si no cambiaron: 304 sin cuerpo).
// Las imágenes cambian poco: se guardan 7 días en la caché del navegador.
const staticOptions = { maxAge: 0, etag: true };
app.use("/css", express.static(path.join(ROOT, "css"), staticOptions));
app.use("/js", express.static(path.join(ROOT, "js"), staticOptions));
app.use("/assets", express.static(path.join(ROOT, "assets"), { ...staticOptions, maxAge: "7d" }));

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.use(notFound);
app.use(errorHandler);

// Primero se verifica la base; solo si responde se abre el puerto HTTP.
async function start() {
  try {
    await connectDatabase();
  } catch (error) {
    log.error("base_no_disponible", { error: error.name, detalle: error.message || "sin mensaje (¿la base está encendida?)" });
    process.exit(1);
  }
  const server = app.listen(PORT, () => {
    log.info("servidor_iniciado", { port: Number(PORT), entorno: ENVIRONMENT, version, commit: COMMIT || undefined });
  });

  // Apagado ordenado: el proveedor envía SIGTERM al publicar una versión nueva.
  // Se dejan de aceptar conexiones, se terminan las que están en curso y se cierra la base.
  const shutdown = (signal) => {
    log.info("servidor_deteniendo", { signal });
    server.close(async () => {
      await sequelize.close().catch(() => {});
      log.info("servidor_detenido", { signal });
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref(); // por si una conexión no termina
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  log.error("promesa_no_controlada", { detalle: reason instanceof Error ? reason.message : String(reason) });
});

start();
