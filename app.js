const express = require("express");
const path = require("path");
const { connectDatabase, sequelize } = require("./src/db/sequelize");
const incidentRoutes = require("./src/routes/incidentRoutes");
const { requestLogger } = require("./src/middleware/logger");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");
const asyncHandler = require("./src/middleware/asyncHandler");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

app.disable("x-powered-by"); // no anunciar que usamos Express
app.use(express.json({ limit: "10kb" })); // limita el tamaño del cuerpo
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

app.use("/api/incidentes", incidentRoutes);

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
