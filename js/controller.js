const IncidentController = (() => {
  const form = document.getElementById("incident-form");
  const filterForm = document.getElementById("filter-form");
  const listEl = document.getElementById("incident-list");
  const detailEl = document.getElementById("detail-panel-content");

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
    IncidentView.renderList(incidents, IncidentModel.statusLabels);
    const selected = selectedId
      ? IncidentModel.getById(selectedId) || incidents[0] || null
      : incidents[0] || null;
    IncidentView.renderDetail(selected, IncidentModel.statusLabels);
    return incidents;
  }

  async function handleSubmit(event) {
    event.preventDefault();
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

  function handleListClick(event) {
    const item = event.target.closest(".incident-item");
    if (!item) return;
    const incident = IncidentModel.getById(item.getAttribute("data-id"));
    IncidentView.renderDetail(incident, IncidentModel.statusLabels);
    IncidentView.announce(`Mostrando detalle de ${incident.id}.`);
  }

  function handleListKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
      const item = event.target.closest(".incident-item");
      if (item) {
        event.preventDefault();
        handleListClick(event);
      }
    }
  }

  async function handleUpdateStatus(event) {
    const button = event.target.closest("[data-action='update-status']");
    if (!button) return;
    const current = IncidentModel.getById(button.getAttribute("data-id"));
    if (!current) return;

    try {
      const updated = await IncidentModel.updateIncident(current.id, {
        status: IncidentModel.nextStatus[current.status]
      });
      await refreshList(updated.id);
      IncidentView.announce(`El incidente ${updated.id} cambió a ${IncidentModel.statusLabels[updated.status]}.`);
    } catch (error) {
      IncidentView.announce(error.message);
    }
  }

  async function init() {
    try {
      await refreshList();
      IncidentView.announce("Incidentes cargados desde la API.");
    } catch (error) {
      IncidentView.announce("Ocurrió un error al cargar los incidentes.");
    }

    form.addEventListener("submit", handleSubmit);
    form.addEventListener("reset", () => IncidentView.resetForm(form));
    filterForm.addEventListener("submit", handleFilter);
    listEl.addEventListener("click", handleListClick);
    listEl.addEventListener("keydown", handleListKeydown);
    detailEl.addEventListener("click", handleUpdateStatus);
    attachLiveValidation();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", IncidentController.init);
