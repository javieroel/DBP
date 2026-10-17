// SERVICIO DE INCIDENTES: aplica las REGLAS DE NEGOCIO.
//  - El controlador solo atiende HTTP (lee la petición y responde).
//  - El modelo solo accede a los datos.
//  - Aquí se valida, se decide qué está permitido y se coordina al modelo.
// Las funciones puras (sin base de datos) se prueban con Jest en tests/incidentService.test.js.
const incidentModel = require("../models/incidentModel");
const HttpError = require("../middleware/httpError");
const {
  ALLOWED_STATUS,
  ALLOWED_PRIORITY,
  ALLOWED_CATEGORY,
  WRITABLE_FIELDS,
  REQUIRED_FIELDS,
  STATUS_TRANSITIONS
} = require("../constants/incident");

// ---------- Reglas puras ----------

/**
 * Indica si un incidente puede pasar del estado `from` al estado `to`.
 * @param {string} from estado actual
 * @param {string} to estado solicitado
 * @returns {boolean}
 */
function canChangeStatus(from, to) {
  if (from === to) return true; // no hay cambio
  return (STATUS_TRANSITIONS[from] || []).includes(to);
}

/** Lanza 409 si el cambio de estado no está permitido. Un estado inexistente lo rechaza el modelo (400). */
function assertStatusChange(currentStatus, newStatus) {
  if (newStatus === undefined || !ALLOWED_STATUS.includes(newStatus)) return;
  if (canChangeStatus(currentStatus, newStatus)) return;
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  throw new HttpError(
    409,
    allowed.length
      ? `No se puede pasar de "${currentStatus}" a "${newStatus}". Permitidos: ${allowed.join(", ")}.`
      : `El incidente ya está resuelto ("${currentStatus}") y no puede cambiar de estado.`
  );
}

/** Convierte "INC-025" o "25" en 25. Cualquier otro formato: 400. */
function parseId(raw) {
  const match = /^(?:INC-)?(\d{1,9})$/i.exec(String(raw));
  if (!match) throw new HttpError(400, `El identificador "${raw}" no tiene el formato INC-###.`);
  return Number(match[1]);
}

/** Valida los filtros de la URL (?status, ?priority, ?category, ?q, ?limit, ?offset). */
function parseFilters(query = {}) {
  const filters = {};
  const checks = [
    ["status", ALLOWED_STATUS, "estado"],
    ["priority", ALLOWED_PRIORITY, "prioridad"],
    ["category", ALLOWED_CATEGORY, "categoría"]
  ];

  checks.forEach(([key, allowed, label]) => {
    const value = String(query[key] || "").trim();
    if (!value) return;
    if (!allowed.includes(value)) {
      throw new HttpError(400, `Filtro de ${label} no válido. Use: ${allowed.join(", ")}.`);
    }
    filters[key] = value;
  });

  const q = String(query.q || "").trim();
  if (q.length > 100) throw new HttpError(400, "La búsqueda no puede superar 100 caracteres.");
  if (q) filters.q = q;

  // Paginación con tope para evitar respuestas gigantes
  const limit = query.limit !== undefined ? Number(query.limit) : 100;
  const offset = query.offset !== undefined ? Number(query.offset) : 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new HttpError(400, "limit debe ser un entero entre 1 y 100.");
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new HttpError(400, "offset debe ser un entero mayor o igual a 0.");
  }
  filters.limit = limit;
  filters.offset = offset;
  return filters;
}

/** Comprueba que el cuerpo sea un objeto JSON y traduce "email" (formulario) a "reporter" (base). */
function normalizeBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "El cuerpo de la petición debe ser un objeto JSON.");
  }
  return { ...body, reporter: body.reporter !== undefined ? body.reporter : body.email };
}

/** Campos obligatorios que faltan para un reemplazo completo (PUT). */
function missingRequiredFields(body) {
  return REQUIRED_FIELDS.filter((field) => body[field] === undefined);
}

/** Campos modificables que trae un cambio parcial (PATCH). */
function sentWritableFields(body) {
  return WRITABLE_FIELDS.filter((field) => body[field] !== undefined);
}

// ---------- Casos de uso (coordinan reglas y modelo) ----------

async function findOrFail(rawId) {
  const incident = await incidentModel.getById(parseId(rawId));
  if (!incident) throw new HttpError(404, `No existe el incidente ${rawId}`);
  return incident;
}

async function list(query) {
  return incidentModel.getAll(parseFilters(query));
}

async function get(rawId) {
  return findOrFail(rawId);
}

async function create(body) {
  return incidentModel.create(normalizeBody(body));
}

// PUT: reemplazo completo
async function replace(rawId, rawBody) {
  const body = normalizeBody(rawBody);
  const missing = missingRequiredFields(body);
  if (missing.length) {
    throw new HttpError(400, `PUT reemplaza el incidente completo. Faltan campos: ${missing.join(", ")}. Para cambios parciales use PATCH.`);
  }
  const current = await findOrFail(rawId);
  assertStatusChange(current.status, body.status);
  return incidentModel.update(current, body);
}

// PATCH: cambio parcial
async function patch(rawId, rawBody) {
  const body = normalizeBody(rawBody);
  if (!sentWritableFields(body).length) {
    throw new HttpError(400, `PATCH necesita al menos un campo para modificar: ${WRITABLE_FIELDS.join(", ")}.`);
  }
  const current = await findOrFail(rawId);
  assertStatusChange(current.status, body.status);
  return incidentModel.update(current, body);
}

async function remove(rawId) {
  const removed = await incidentModel.remove(parseId(rawId));
  if (!removed) throw new HttpError(404, `No existe el incidente ${rawId}`);
}

module.exports = {
  // reglas puras
  canChangeStatus,
  assertStatusChange,
  parseId,
  parseFilters,
  normalizeBody,
  missingRequiredFields,
  sentWritableFields,
  // casos de uso
  list,
  get,
  create,
  replace,
  patch,
  remove
};
