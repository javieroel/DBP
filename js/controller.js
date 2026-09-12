const IncidentController = (() => {
  const form = document.getElementById("incident-form");
  const listEl = document.getElementById("incident-list");

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

  function handleSubmit(event) {
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
    const newIncident = IncidentModel.addIncident(data);
    IncidentView.renderList(IncidentModel.getAll(), IncidentModel.statusLabels);
    IncidentView.renderDetail(newIncident, IncidentModel.statusLabels);
    IncidentView.resetForm(form);
    IncidentView.announce(`Incidente ${newIncident.id} registrado correctamente.`);
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

  async function init() {
    try {
      await IncidentModel.loadIncidents();
      const incidents = IncidentModel.getAll();
      IncidentView.renderList(incidents, IncidentModel.statusLabels);
      IncidentView.renderDetail(incidents[0] || null, IncidentModel.statusLabels);
      IncidentView.announce("Incidentes cargados correctamente.");
    } catch (error) {
      IncidentView.announce("Ocurrió un error al cargar los incidentes.");
    }

    form.addEventListener("submit", handleSubmit);
    form.addEventListener("reset", () => IncidentView.resetForm(form));
    listEl.addEventListener("click", handleListClick);
    listEl.addEventListener("keydown", handleListKeydown);
    attachLiveValidation();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", IncidentController.init);
