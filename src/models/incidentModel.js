const seed = require("../../data/incidents.json");

let incidents = seed.map((item) => ({ ...item }));

const ALLOWED_STATUS = ["open", "progress", "closed"];
const ALLOWED_PRIORITY = ["alta", "media", "baja"];
const ALLOWED_CATEGORY = ["acceso", "sistema", "red", "otro"];

function clone(item) {
  return JSON.parse(JSON.stringify(item));
}

function nextId() {
  const numbers = incidents.map((item) => {
    const parts = String(item.id).split("-");
    return parseInt(parts[1], 10) || 0;
  });
  const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `INC-${String(nextNumber).padStart(3, "0")}`;
}

function getAll(filters = {}) {
  const status = (filters.status || "").trim();
  const priority = (filters.priority || "").trim();
  const category = (filters.category || "").trim();
  const query = (filters.q || "").trim().toLowerCase();

  return incidents
    .filter((item) => (status ? item.status === status : true))
    .filter((item) => (priority ? item.priority === priority : true))
    .filter((item) => (category ? item.category === category : true))
    .filter((item) => {
      if (!query) return true;
      const haystack = `${item.id} ${item.title} ${item.description} ${item.reporter}`.toLowerCase();
      return haystack.includes(query);
    })
    .map(clone);
}

function getById(id) {
  const found = incidents.find((item) => item.id === id);
  return found ? clone(found) : null;
}

function create(data) {
  const incident = {
    id: nextId(),
    title: data.title,
    description: data.description,
    category: data.category,
    priority: data.priority,
    date: data.date,
    status: data.status || "open",
    reporter: data.reporter,
    area: data.area || "Sin asignar"
  };
  incidents.unshift(incident);
  return clone(incident);
}

function update(id, data) {
  const index = incidents.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const current = incidents[index];
  incidents[index] = {
    ...current,
    title: data.title !== undefined ? data.title : current.title,
    description: data.description !== undefined ? data.description : current.description,
    category: data.category !== undefined ? data.category : current.category,
    priority: data.priority !== undefined ? data.priority : current.priority,
    date: data.date !== undefined ? data.date : current.date,
    status: data.status !== undefined ? data.status : current.status,
    reporter: data.reporter !== undefined ? data.reporter : current.reporter,
    area: data.area !== undefined ? data.area : current.area
  };
  return clone(incidents[index]);
}

function remove(id) {
  const index = incidents.findIndex((item) => item.id === id);
  if (index === -1) return false;
  incidents.splice(index, 1);
  return true;
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
