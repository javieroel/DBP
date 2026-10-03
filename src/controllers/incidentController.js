// CONTROLADOR: recibe la petición HTTP, valida lo que llega por URL,
// llama al modelo (que habla con la base) y responde con el código HTTP adecuado.
// Ya no tiene try/catch: cualquier excepción viaja al manejador central de errores.
const incidentModel = require("../models/incidentModel");
const HttpError = require("../middleware/httpError");
const asyncHandler = require("../middleware/asyncHandler");

// Acepta "INC-025" o "25" y devuelve el número 25. Si no, error 400.
function parseId(raw) {
  const match = /^(?:INC-)?(\d{1,9})$/i.exec(String(raw));
  if (!match) {
    throw new HttpError(400, `El identificador "${raw}" no tiene el formato INC-###.`);
  }
  return Number(match[1]);
}

// Revisa los filtros de la URL antes de enviarlos a la base.
function parseFilters(query) {
  const filters = {};
  const checks = [
    ["status", incidentModel.ALLOWED_STATUS, "estado"],
    ["priority", incidentModel.ALLOWED_PRIORITY, "prioridad"],
    ["category", incidentModel.ALLOWED_CATEGORY, "categoría"]
  ];

  checks.forEach(([key, allowed, label]) => {
    const value = (query[key] || "").trim();
    if (!value) return;
    if (!allowed.includes(value)) {
      throw new HttpError(400, `Filtro de ${label} no válido. Use: ${allowed.join(", ")}.`);
    }
    filters[key] = value;
  });

  const q = (query.q || "").trim();
  if (q.length > 100) throw new HttpError(400, "La búsqueda no puede superar 100 caracteres.");
  if (q) filters.q = q;

  // Paginación opcional con tope para evitar respuestas gigantes
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

function bodyWithReporter(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "El cuerpo de la petición debe ser un objeto JSON.");
  }
  // El formulario envía "email"; la base guarda "reporter"
  return { ...body, reporter: body.reporter !== undefined ? body.reporter : body.email };
}

// GET /api/incidentes?status=open&priority=alta
const listIncidents = asyncHandler(async (req, res) => {
  const incidents = await incidentModel.getAll(parseFilters(req.query));
  res.json(incidents); // 200 OK
});

// GET /api/incidentes/:id
const getIncident = asyncHandler(async (req, res) => {
  const incident = await incidentModel.getById(parseId(req.params.id));
  if (!incident) throw new HttpError(404, `No existe el incidente ${req.params.id}`);
  res.json(incident);
});

// POST /api/incidentes
const createIncident = asyncHandler(async (req, res) => {
  const created = await incidentModel.create(bodyWithReporter(req.body));
  res.status(201).location(`/api/incidentes/${created.toJSON().id}`).json(created); // 201 Created
});

// PUT /api/incidentes/:id
const updateIncident = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const updated = await incidentModel.update(id, bodyWithReporter(req.body));
  if (!updated) throw new HttpError(404, `No existe el incidente ${req.params.id}`);
  res.json(updated);
});

// DELETE /api/incidentes/:id
const deleteIncident = asyncHandler(async (req, res) => {
  const removed = await incidentModel.remove(parseId(req.params.id));
  if (!removed) throw new HttpError(404, `No existe el incidente ${req.params.id}`);
  res.status(204).send(); // 204 No Content
});

module.exports = {
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident
};
