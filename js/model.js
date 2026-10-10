const IncidentModel = (() => {
  let incidents = [];

  // ---------- Sesión (JWT) ----------
  // El token se guarda en sessionStorage: se borra al cerrar la pestaña.
  // Riesgo conocido: un XSS podría leerlo; por eso la vista escapa todo el HTML
  // y el servidor envía una Content-Security-Policy que bloquea scripts externos.
  const SESSION_KEY = "dbp_session";
  let session = readSession();
  let onUnauthorized = () => {};

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
    } catch (error) {
      return null;
    }
  }

  function saveSession(value) {
    session = value;
    try {
      if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {
      /* sin almacenamiento: la sesión vive solo en memoria */
    }
  }

  function getUser() {
    return session ? session.user : null;
  }

  // Qué puede hacer cada rol en la interfaz (el servidor vuelve a comprobarlo: 403)
  const rolePermissions = {
    admin: { create: true, status: true, delete: true },
    analista: { create: true, status: true, delete: false },
    lector: { create: false, status: false, delete: false }
  };

  const roleLabels = { admin: "Administrador", analista: "Analista", lector: "Solo lectura" };

  function permissions() {
    const user = getUser();
    return (user && rolePermissions[user.role]) || { create: false, status: false, delete: false };
  }

  function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
  }

  // Todas las peticiones a la API pasan por aquí: se añade "Authorization: Bearer <token>"
  async function apiFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (session && session.token) headers.Authorization = `Bearer ${session.token}`;
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && session) {
      saveSession(null); // token vencido o inválido: se cierra la sesión
      onUnauthorized();
    }
    return response;
  }

  async function login(email, password) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      throw new Error(await parseError(response, "No se pudo iniciar sesión"));
    }
    const data = await response.json();
    saveSession({ token: data.token, user: data.user });
    return data.user;
  }

  function logout() {
    saveSession(null);
    incidents = [];
  }

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
    const response = await apiFetch(`/api/incidentes${buildQuery(filters)}`);
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
    const response = await apiFetch("/api/incidentes", {
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
    const response = await apiFetch(`/api/incidentes/${encodeURIComponent(id)}`, {
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
    const response = await apiFetch(`/api/incidentes/${encodeURIComponent(id)}`, {
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
    statusActions,
    login,
    logout,
    getUser,
    permissions,
    roleLabels,
    setUnauthorizedHandler
  };
})();
