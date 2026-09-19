const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ROOT = __dirname;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function enviarJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(data));
}

function enviarArchivoEstatico(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      enviarJSON(res, 404, { error: "Archivo no encontrado", ruta: filePath });
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

function leerIncidentes() {
  const filePath = path.join(ROOT, "data", "incidents.json");
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  const url = req.url.split("?")[0];

  if (url === "/api/salud") {
    enviarJSON(res, 200, { estado: "ok", servicio: "Plataforma de gestión de incidentes" });
    return;
  }

  if (url === "/api/incidentes") {
    try {
      enviarJSON(res, 200, leerIncidentes());
    } catch (error) {
      enviarJSON(res, 500, { error: "No se pudo leer el archivo de incidentes" });
    }
    return;
  }

  if (url.startsWith("/data/")) {
    enviarJSON(res, 404, { error: "Ruta no disponible de forma directa" });
    return;
  }

  const rutaSolicitada = url === "/" ? "/index.html" : url;
  const filePath = path.join(ROOT, rutaSolicitada);

  if (!filePath.startsWith(ROOT)) {
    enviarJSON(res, 400, { error: "Ruta inválida" });
    return;
  }

  const extensionesPermitidas = [".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".ico"];
  if (extensionesPermitidas.includes(path.extname(filePath).toLowerCase())) {
    enviarArchivoEstatico(res, filePath);
    return;
  }

  enviarJSON(res, 404, { error: "Ruta no encontrada", ruta: url });
});

server.listen(PORT, () => {
  console.log(`Servidor disponible en http://localhost:${PORT}`);
});
