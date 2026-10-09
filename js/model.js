const IncidentModel = (() => {
  let incidents = [];

  const statusLabels = {
    progress: "En revisión",
    open: "Abierto",
    closed: "Resuelto"
  };

  // Botones de estado que se muestran según el estado actual.
  // Es la misma regla que valida el servidor: un incidente resuelto no se reabre.
  // (Si alguien la salta desde el navegador, el servidor responde 409.)
  const statusActions = {
    open: [
      { to: "progress", label: "Pasar a revisión" },
      { to: "closed", label: "Marcar resuelto" }
    ],
    progress: [
      { to: "open", label: "Devolver a abierto" },
      { to: "closed", label: "Marcar resuelto" }
    ],
    closed: []
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

  // PATCH: cambia SOLO los campos enviados (aquí, el estado)
  async function patchIncident(id, changes) {
    const response = await fetch(`/api/incidentes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes)
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo actualizar el incidente"));
    }

    return response.json(); // 200 OK con el incidente actualizado
  }

  // DELETE: elimina el incidente. El servidor responde 204 No Content (sin cuerpo).
  async function deleteIncident(id) {
    const response = await fetch(`/api/incidentes/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo eliminar el incidente"));
    }
    // 204 no trae JSON, por eso no se llama a response.json()
  }

  return {
    loadIncidents,
    getAll,
    getById,
    createIncident,
    patchIncident,
    deleteIncident,
    statusLabels,
    statusActions
  };
})();
