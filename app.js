const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const security = require("./src/config/security"); // falla al arrancar si JWT_SECRET es débil
const { connectDatabase, sequelize } = require("./src/db/sequelize");
const incidentRoutes = require("./src/routes/incidentRoutes");
const authRoutes = require("./src/routes/authRoutes");
const { sanitizeBody } = require("./src/middleware/sanitize");
const { requestLogger } = require("./src/middleware/logger");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");
const asyncHandler = require("./src/middleware/asyncHandler");
const HttpError = require("./src/middleware/httpError");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

app.disable("x-powered-by"); // no anunciar que usamos Express

// Detrás de Caddy (HTTPS) se confía en el proxy para conocer la IP real del cliente
if (security.behindHttpsProxy) app.set("trust proxy", 1);

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
  console.warn(`[cors] Origen bloqueado: ${origin}`);
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

app.use(express.json({ limit: "10kb" })); // limita el tamaño del cuerpo
app.use(sanitizeBody);                     // limpia las entradas antes de validarlas
app.use(requestLogger);

// Salud del servicio: ahora también comprueba la conexión con la base
app.get(
  "/api/salud",
  asyncHandler(async (req, res) => {
    let baseDatos = "conectada";
    try {
      await sequelize.authenticate();
    } catch (error) {
      baseDatos = "sin conexión";
    }
    res.status(baseDatos === "conectada" ? 200 : 503).json({
      estado: baseDatos === "conectada" ? "ok" : "degradado",
      servicio: "Plataforma de gestión de incidentes",
      motor: "Express",
      baseDatos,
      persistencia: "PostgreSQL + Sequelize"
    });
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/incidentes", incidentRoutes); // protegidas con JWT y roles

app.use("/data", (req, res) => {
  res.status(404).json({ error: "Ruta no disponible de forma directa" });
});

app.use("/css", express.static(path.join(ROOT, "css")));
app.use("/js", express.static(path.join(ROOT, "js")));
app.use("/assets", express.static(path.join(ROOT, "assets")));

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
    console.error("[db] No se pudo conectar a PostgreSQL:", error.message);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`Servidor Express disponible en http://localhost:${PORT}`);
  });
}

start();
