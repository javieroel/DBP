// CAPA DE ACCESO A DATOS: antes trabajaba con un arreglo en memoria;
// ahora cada función hace una consulta a PostgreSQL mediante el ORM.
// El controlador no sabe (ni le importa) que hay SQL detrás: solo llama a estas funciones.
const { Op } = require("sequelize");
const { Incident, ALLOWED_STATUS, ALLOWED_PRIORITY, ALLOWED_CATEGORY } = require("./Incident");

// Campos que el cliente PUEDE enviar. Cualquier otro (id, createdAt...) se ignora.
// Esto evita la "asignación masiva" (mass assignment).
const WRITABLE_FIELDS = ["title", "description", "category", "priority", "status", "date", "reporter", "area"];

function pickWritable(data) {
  const clean = {};
  WRITABLE_FIELDS.forEach((field) => {
    if (data[field] !== undefined) {
      clean[field] = typeof data[field] === "string" ? data[field].trim() : data[field];
    }
  });
  return clean;
}

// SELECT ... WHERE status = $1 AND priority = $2 ... ORDER BY date DESC
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

// UPDATE incidents SET ... WHERE id = $1
async function update(id, data) {
  const incident = await Incident.findByPk(id);
  if (!incident) return null;
  incident.set(pickWritable(data));
  await incident.save(); // aquí se ejecutan las validaciones del modelo
  return incident;
}

// DELETE FROM incidents WHERE id = $1
async function remove(id) {
  const deletedRows = await Incident.destroy({ where: { id } });
  return deletedRows > 0;
}

module.exports = {
  ALLOWED_STATUS,
  ALLOWED_PRIORITY,
  ALLOWED_CATEGORY,
  getAll,
  getById,
  create,
  update,
  remove
};
