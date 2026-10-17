// MODELO / REPOSITORIO: SOLO accede a los datos de PostgreSQL mediante el ORM.
// No conoce HTTP ni reglas de negocio (esas viven en services/incidentService.js).
const { Op } = require("sequelize");
const { Incident } = require("./Incident");
const { WRITABLE_FIELDS } = require("../constants/incident");

// Copia solo los campos permitidos (lista blanca)
function pickWritable(data) {
  const clean = {};
  WRITABLE_FIELDS.forEach((field) => {
    if (data[field] !== undefined) {
      clean[field] = typeof data[field] === "string" ? data[field].trim() : data[field];
    }
  });
  return clean;
}

// SELECT ... WHERE status = $1 AND priority = $2 ... ORDER BY date DESC, id DESC LIMIT $n
async function getAll(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.category) where.category = filters.category;

  if (filters.q) {
    const term = `%${filters.q}%`; // Sequelize lo envía como parámetro: no hay inyección SQL
    where[Op.or] = [
      { title: { [Op.iLike]: term } },
      { description: { [Op.iLike]: term } },
      { reporter: { [Op.iLike]: term } }
    ];
  }

  return Incident.findAll({
    where,
    order: [["date", "DESC"], ["id", "DESC"]],
    limit: filters.limit,
    offset: filters.offset
  });
}

// SELECT ... WHERE id = $1
async function getById(id) {
  return Incident.findByPk(id);
}

// INSERT INTO incidents (...) VALUES (...) RETURNING *
async function create(data) {
  return Incident.create(pickWritable(data));
}

// UPDATE incidents SET ... WHERE id = $1   (recibe el registro ya cargado)
async function update(incident, data) {
  incident.set(pickWritable(data));
  await incident.save(); // aquí se ejecutan las validaciones del modelo
  return incident;
}

// DELETE FROM incidents WHERE id = $1
async function remove(id) {
  const deletedRows = await Incident.destroy({ where: { id } });
  return deletedRows > 0;
}

module.exports = { getAll, getById, create, update, remove };
