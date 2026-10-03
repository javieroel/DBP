// MANEJO CENTRAL DE EXCEPCIONES: TODOS los errores de la app terminan aquí.
// Traduce cada tipo de error a un código HTTP y a un JSON uniforme,
// sin revelar al cliente detalles internos (SQL, tablas, stack trace).
const {
  ValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ConnectionError,
  DatabaseError
} = require("sequelize");
const HttpError = require("./httpError");

function notFound(req, res, next) {
  next(new HttpError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

function classify(err) {
  // 1) Errores que nosotros lanzamos a propósito (400, 404...)
  if (err instanceof HttpError) {
    return { status: err.status, error: err.message };
  }
  // 2) JSON mal escrito o demasiado grande (lo detecta express.json)
  if (err.type === "entity.parse.failed") {
    return { status: 400, error: "El cuerpo de la petición no es un JSON válido." };
  }
  if (err.type === "entity.too.large") {
    return { status: 413, error: "El cuerpo de la petición es demasiado grande." };
  }
  // 3) Duplicados (UniqueConstraintError hereda de ValidationError: va primero)
  if (err instanceof UniqueConstraintError) {
    return { status: 409, error: "El registro ya existe." };
  }
  // 4) Validaciones del modelo Sequelize
  if (err instanceof ValidationError) {
    return {
      status: 400,
      error: "Datos de incidente no válidos.",
      detalles: err.errors.map((e) => ({ campo: e.path, mensaje: e.message }))
    };
  }
  if (err instanceof ForeignKeyConstraintError) {
    return { status: 409, error: "El registro está relacionado con otros datos." };
  }
  // 5) La base de datos no responde
  if (err instanceof ConnectionError) {
    return { status: 503, error: "Base de datos no disponible. Intente más tarde." };
  }
  // 6) Restricciones CHECK o tipos de dato rechazados por PostgreSQL
  if (err instanceof DatabaseError) {
    const code = err.parent && err.parent.code;
    if (code === "23514" || code === "22P02" || code === "22007" || code === "22008" || code === "22001") {
      return { status: 400, error: "La base de datos rechazó un valor no válido." };
    }
  }
  // 7) Cualquier otra cosa: error interno genérico
  return { status: 500, error: "Error interno del servidor" };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const { status, ...body } = classify(err);

  // El detalle técnico solo se queda en el log del servidor
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} ->`, err.name, err.message);
  } else {
    console.warn(`[aviso] ${req.method} ${req.originalUrl} -> ${status} ${body.error}`);
  }

  res.status(status).json({ ...body, ruta: req.originalUrl });
}

module.exports = { notFound, errorHandler };
