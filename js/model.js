const IncidentModel = (() => {
  let incidents = [];

  const statusLabels = {
    progress: "En revisión",
    open: "Abierto",
    closed: "Resuelto"
  };

  const nextStatus = {
    open: "progress",
    progress: "closed",
    closed: "open"
  };

  async function parseError(response, fallback) {
    try {
      const payload = await response.json();
      // Si la API devuelve detalles de validación, se muestran todos
      if (Array.isArray(payload.detalles) && payload.detalles.length) {
        return `${payload.error} ${payload.detalles.map((d) => d.mensaje).join(" ")}`;
      }
      return payload.error || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function buildQuery(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return query ? `?${query}` : "";
  }

  async function loadIncidents(filters = {}) {
    const response = await fetch(`/api/incidentes${buildQuery(filters)}`);
    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudieron cargar los incidentes"));
    }
    incidents = await response.json();
    return incidents;
  }

  function getAll() {
    return incidents;
  }

  function getById(id) {
    return incidents.find((item) => item.id === id) || null;
  }

  async function createIncident(data) {
    const response = await fetch("/api/incidentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        date: data.date,
        reporter: data.email
      })
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo registrar el incidente"));
    }

    return response.json();
  }

  async function updateIncident(id, payload) {
    const response = await fetch(`/api/incidentes/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo actualizar el incidente"));
    }

    return response.json();
  }

  return {
    loadIncidents,
    getAll,
    getById,
    createIncident,
    updateIncident,
    statusLabels,
    nextStatus
  };
})();
