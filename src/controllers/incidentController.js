const incidentModel = require("../models/incidentModel");
const HttpError = require("../middleware/httpError");

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePayload(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.title !== undefined) {
    if (!data.title || String(data.title).trim().length < 5) {
      errors.push("El título debe tener al menos 5 caracteres.");
    }
  }

  if (!partial || data.description !== undefined) {
    if (!data.description || String(data.description).trim().length < 20) {
      errors.push("La descripción debe tener al menos 20 caracteres.");
    }
  }

  if (!partial || data.category !== undefined) {
    if (!incidentModel.ALLOWED_CATEGORY.includes(data.category)) {
      errors.push("La categoría no es válida.");
    }
  }

  if (!partial || data.priority !== undefined) {
    if (!incidentModel.ALLOWED_PRIORITY.includes(data.priority)) {
      errors.push("La prioridad no es válida.");
    }
  }

  if (!partial || data.date !== undefined) {
    if (!data.date || !isValidDate(data.date)) {
      errors.push("La fecha debe tener el formato YYYY-MM-DD.");
    }
  }

  if (!partial || data.reporter !== undefined) {
    if (!data.reporter || !isValidEmail(data.reporter)) {
      errors.push("El correo de contacto no es válido.");
    }
  }

  if (data.status !== undefined && !incidentModel.ALLOWED_STATUS.includes(data.status)) {
    errors.push("El estado no es válido.");
  }

  return errors;
}

function listIncidents(req, res) {
  const incidents = incidentModel.getAll({
    status: req.query.status,
    priority: req.query.priority,
    category: req.query.category,
    q: req.query.q
  });
  res.json(incidents);
}

function getIncident(req, res, next) {
  const incident = incidentModel.getById(req.params.id);
  if (!incident) {
    return next(new HttpError(404, `No existe el incidente ${req.params.id}`));
  }
  res.json(incident);
}

function createIncident(req, res, next) {
  const payload = {
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    priority: req.body.priority,
    date: req.body.date,
    reporter: req.body.reporter || req.body.email,
    status: req.body.status,
    area: req.body.area
  };

  const errors = validatePayload(payload);
  if (errors.length) {
    return next(new HttpError(400, errors.join(" ")));
  }

  const created = incidentModel.create({
    ...payload,
    title: String(payload.title).trim(),
    description: String(payload.description).trim(),
    reporter: String(payload.reporter).trim()
  });
  res.status(201).json(created);
}

function updateIncident(req, res, next) {
  const current = incidentModel.getById(req.params.id);
  if (!current) {
    return next(new HttpError(404, `No existe el incidente ${req.params.id}`));
  }

  const payload = {
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    priority: req.body.priority,
    date: req.body.date,
    reporter: req.body.reporter || req.body.email,
    status: req.body.status,
    area: req.body.area
  };

  const errors = validatePayload(payload, { partial: true });
  if (errors.length) {
    return next(new HttpError(400, errors.join(" ")));
  }

  const updated = incidentModel.update(req.params.id, payload);
  res.json(updated);
}

function deleteIncident(req, res, next) {
  const removed = incidentModel.remove(req.params.id);
  if (!removed) {
    return next(new HttpError(404, `No existe el incidente ${req.params.id}`));
  }
  res.status(204).send();
}

module.exports = {
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident
};
