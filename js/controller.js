const IncidentController = (() => {
  const form = document.getElementById("incident-form");
  const filterForm = document.getElementById("filter-form");
  const listEl = document.getElementById("incident-list");
  const detailEl = document.getElementById("detail-panel-content");
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-btn");

  const validators = {
    title: (value) => {
      if (value.trim().length < 5) return "El título debe tener al menos 5 caracteres.";
      return "";
    },
    category: (value) => (value === "" ? "Selecciona una categoría." : ""),
    priority: (value) => (value === "" ? "Selecciona una prioridad." : ""),
    description: (value) => {
      if (value.trim().length < 20) return "Describe el incidente con al menos 20 caracteres.";
      return "";
    },
    email: (value) => {
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!pattern.test(value)) return "Ingresa un correo electrónico válido.";
      return "";
    },
    date: (value) => (value === "" ? "Selecciona la fecha del incidente." : "")
  };

  function currentFilters() {
    return {
      q: document.getElementById("filter-q").value.trim(),
      status: document.getElementById("filter-status").value,
      priority: document.getElementById("filter-priority").value
    };
  }

  function validateField(fieldId) {
    const field = document.getElementById(fieldId);
    const message = validators[fieldId](field.value);
    if (message) {
      IncidentView.showFieldError(fieldId, message);
      return false;
    }
    IncidentView.clearFieldError(fieldId);
    return true;
  }

  function validateAll() {
    const fieldIds = Object.keys(validators);
    const results = fieldIds.map(validateField);
    return results.every(Boolean);
  }

  function attachLiveValidation() {
    Object.keys(validators).forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      field.addEventListener("input", () => validateField(fieldId));
      field.addEventListener("blur", () => validateField(fieldId));
    });
  }

  async function refreshList(selectedId) {
    const incidents = await IncidentModel.loadIncidents(currentFilters());
    IncidentView.renderList(incidents, IncidentModel.statusLabels, IncidentModel.statusActions, IncidentModel.permissions());
    const selected = selectedId
      ? IncidentModel.getById(selectedId) || incidents[0] || null
      : incidents[0] || null;
    showDetail(selected);
    return incidents;
  }

  function showDetail(incident) {
    IncidentView.renderDetail(incident, IncidentModel.statusLabels, IncidentModel.statusActions, IncidentModel.permissions());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!IncidentModel.permissions().create) {
      IncidentView.announce("Tu rol no permite registrar incidentes.");
      return;
    }
    if (!validateAll()) {
      IncidentView.announce("El formulario tiene errores. Revisa los campos marcados.");
      return;
    }

    const data = {
      title: document.getElementById("title").value.trim(),
      category: document.getElementById("category").value,
      priority: document.getElementById("priority").value,
      description: document.getElementById("description").value.trim(),
      email: document.getElementById("email").value.trim(),
      date: document.getElementById("date").value
    };

    try {
      const created = await IncidentModel.createIncident(data);
      await refreshList(created.id);
      IncidentView.resetForm(form);
      IncidentView.announce(`Incidente ${created.id} registrado en el servidor.`);
    } catch (error) {
      IncidentView.announce(error.message);
    }
  }

  async function handleFilter(event) {
    event.preventDefault();
    try {
      await refreshList();
      IncidentView.announce("Lista de incidentes actualizada según los filtros.");
    } catch (error) {
      IncidentView.announce(error.message);
    }
  }

  // Un solo manejador para todos los botones (tarjetas y panel de detalle)
  async function handleAction(event) {
    const button = event.target.closest("[data-action]");

    // Clic en la tarjeta (fuera de los botones): mostrar su detalle
    if (!button) {
      const item = event.target.closest(".incident-item");
      if (item) showDetail(IncidentModel.getById(item.getAttribute("data-id")));
      return;
    }

    const id = button.getAttribute("data-id");
    const action = button.getAttribute("data-action");

    try {
      if (action === "view") {
        showDetail(IncidentModel.getById(id));
        IncidentView.announce(`Mostrando detalle de ${id}.`);
      }

      if (action === "set-status") {
        const status = button.getAttribute("data-status");
        const updated = await IncidentModel.patchIncident(id, { status }); // PATCH
        await refreshList(updated.id);
        IncidentView.announce(`El incidente ${updated.id} cambió a ${IncidentModel.statusLabels[updated.status]}.`);
      }

      if (action === "delete") {
        if (button.dataset.confirm !== "true") {
          IncidentView.askDeleteConfirmation(button);
          IncidentView.announce(`Pulsa "Confirmar eliminación" para borrar ${id}.`);
          return;
        }
        await IncidentModel.deleteIncident(id); // DELETE
        await refreshList();
        IncidentView.announce(`El incidente ${id} fue eliminado.`);
      }
    } catch (error) {
      IncidentView.announce(error.message);
      await refreshList(id).catch(() => {});
    }
  }

  // ---------- Sesión ----------
  function applySession() {
    const user = IncidentModel.getUser();
    IncidentView.renderSession(user, IncidentModel.roleLabels);
    if (!user) {
      IncidentView.setFormEnabled(form, false, "Inicia sesión para registrar incidentes.");
      IncidentView.renderLoggedOut();
      return false;
    }
    const canCreate = IncidentModel.permissions().create;
    IncidentView.setFormEnabled(form, canCreate, canCreate ? "" : "Tu rol (solo lectura) no permite registrar incidentes.");
    return true;
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const passwordField = document.getElementById("login-password");

    try {
      const user = await IncidentModel.login(email, passwordField.value);
      passwordField.value = ""; // la contraseña no se conserva en la página
      applySession();
      await refreshList();
      IncidentView.announce(`Sesión iniciada como ${user.name}.`);
    } catch (error) {
      passwordField.value = "";
      IncidentView.showLoginError(error.message);
      IncidentView.announce(error.message);
    }
  }

  function handleLogout() {
    IncidentModel.logout();
    applySession();
    IncidentView.announce("Sesión cerrada.");
  }

  async function init() {
    loginForm.addEventListener("submit", handleLogin);
    logoutButton.addEventListener("click", handleLogout);
    IncidentModel.setUnauthorizedHandler(() => {
      applySession();
      IncidentView.showLoginError("La sesión expiró o no es válida. Inicia sesión de nuevo.");
    });

    form.addEventListener("submit", handleSubmit);
    form.addEventListener("reset", () => IncidentView.resetForm(form));
    filterForm.addEventListener("submit", handleFilter);
    listEl.addEventListener("click", handleAction);
    detailEl.addEventListener("click", handleAction);
    attachLiveValidation();

    if (!applySession()) return;
    try {
      await refreshList();
      IncidentView.announce("Incidentes cargados desde la API.");
    } catch (error) {
      IncidentView.announce(error.message);
    }
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", IncidentController.init);
