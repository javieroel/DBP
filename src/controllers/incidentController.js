// CONTROLADOR: solo atiende HTTP. Lee la petición, llama al servicio y responde
// con el código adecuado. Las reglas de negocio están en services/incidentService.js
// y cualquier excepción viaja al manejador central de errores.
const incidentService = require("../services/incidentService");
const asyncHandler = require("../middleware/asyncHandler");

// GET /api/incidentes?status=open&priority=alta  -> 200
const listIncidents = asyncHandler(async (req, res) => {
  res.json(await incidentService.list(req.query));
});

// GET /api/incidentes/:id  -> 200 | 404
const getIncident = asyncHandler(async (req, res) => {
  res.json(await incidentService.get(req.params.id));
});

// POST /api/incidentes  -> 201
const createIncident = asyncHandler(async (req, res) => {
  const created = await incidentService.create(req.body);
  res.status(201).location(`/api/incidentes/${created.toJSON().id}`).json(created);
});

// PUT /api/incidentes/:id  -> 200 | 400 | 404 | 409
const updateIncident = asyncHandler(async (req, res) => {
  res.json(await incidentService.replace(req.params.id, req.body));
});

// PATCH /api/incidentes/:id  -> 200 | 400 | 404 | 409
const patchIncident = asyncHandler(async (req, res) => {
  res.json(await incidentService.patch(req.params.id, req.body));
});

// DELETE /api/incidentes/:id  -> 204 | 404
const deleteIncident = asyncHandler(async (req, res) => {
  await incidentService.remove(req.params.id);
  res.status(204).send();
});

module.exports = {
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  patchIncident,
  deleteIncident
};
