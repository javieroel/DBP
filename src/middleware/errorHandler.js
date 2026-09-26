const HttpError = require("./httpError");

function notFound(req, res, next) {
  next(new HttpError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message =
    status === 500
      ? "Error interno del servidor"
      : err.message || "Error al procesar la solicitud";

  if (status === 500) {
    console.error("[error]", err);
  }

  res.status(status).json({
    error: message,
    ruta: req.originalUrl
  });
}

module.exports = { notFound, errorHandler };
