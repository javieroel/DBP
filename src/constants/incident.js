// Valores permitidos de un incidente. Los comparten el modelo (validación ORM),
// el servicio (reglas de negocio) y las pruebas unitarias.
const ALLOWED_STATUS = ["open", "progress", "closed"];
const ALLOWED_PRIORITY = ["alta", "media", "baja"];
const ALLOWED_CATEGORY = ["acceso", "sistema", "red", "otro"];

// Campos que el cliente PUEDE enviar. Cualquier otro (id, createdAt...) se ignora (evita asignación masiva).
const WRITABLE_FIELDS = ["title", "description", "category", "priority", "status", "date", "reporter", "area"];

// PUT reemplaza el incidente completo, así que debe traer todos estos campos.
const REQUIRED_FIELDS = ["title", "description", "category", "priority", "date", "reporter"];

// REGLA DE NEGOCIO: estados a los que se puede pasar desde cada estado.
// Un incidente resuelto (closed) no se reabre: se registra uno nuevo.
const STATUS_TRANSITIONS = {
  open: ["progress", "closed"],
  progress: ["open", "closed"],
  closed: []
};

module.exports = {
  ALLOWED_STATUS,
  ALLOWED_PRIORITY,
  ALLOWED_CATEGORY,
  WRITABLE_FIELDS,
  REQUIRED_FIELDS,
  STATUS_TRANSITIONS
};
