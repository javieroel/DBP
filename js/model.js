const IncidentModel = (() => {
  let incidents = [];

  const statusLabels = {
    progress: "En revisión",
    open: "Abierto",
    closed: "Resuelto"
  };

  async function loadIncidents() {
    try {
      const response = await fetch("data/incidents.json");
      if (!response.ok) throw new Error("No se pudo cargar el archivo de incidentes");
      incidents = await response.json();
      return incidents;
    } catch (error) {
      console.error("Error al cargar incidentes:", error);
      incidents = [];
      throw error;
    }
  }

  function getAll() {
    return incidents;
  }

  function getById(id) {
    return incidents.find((item) => item.id === id) || null;
  }

  function addIncident(data) {
    const nextNumber = incidents.length
      ? Math.max(...incidents.map((i) => parseInt(i.id.split("-")[1], 10))) + 1
      : 1;
    const newIncident = {
      id: `INC-${String(nextNumber).padStart(3, "0")}`,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      date: data.date,
      status: "open",
      reporter: data.email,
      area: "Sin asignar"
    };
    incidents.unshift(newIncident);
    return newIncident;
  }

  return {
    loadIncidents,
    getAll,
    getById,
    addIncident,
    statusLabels
  };
})();
