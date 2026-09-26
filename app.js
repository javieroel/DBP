const express = require("express");
const path = require("path");
const incidentRoutes = require("./src/routes/incidentRoutes");
const { requestLogger } = require("./src/middleware/logger");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

app.use(express.json());
app.use(requestLogger);

app.get("/api/salud", (req, res) => {
  res.json({
    estado: "ok",
    servicio: "Plataforma de gestión de incidentes",
    motor: "Express"
  });
});

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

app.listen(PORT, () => {
  console.log(`Servidor Express disponible en http://localhost:${PORT}`);
});
