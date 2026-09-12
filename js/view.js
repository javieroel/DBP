const IncidentView = (() => {
  const listEl = document.getElementById("incident-list");
  const countEl = document.getElementById("record-count");
  const detailEl = document.getElementById("detail-panel-content");
  const liveRegion = document.getElementById("live-region");

  const priorityLabels = { alta: "Prioridad alta", media: "Prioridad media", baja: "Prioridad baja" };
  const categoryLabels = { acceso: "Acceso", sistema: "Sistema", red: "Red", otro: "Otro" };

  function badgeClass(status) {
    if (status === "progress") return "badge-progress";
    if (status === "open") return "badge-open";
    return "badge-closed";
  }

  function formatDate(isoDate) {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  }

  function renderList(incidents, statusLabels) {
    listEl.innerHTML = "";
    countEl.textContent = `${incidents.length} registro${incidents.length !== 1 ? "s" : ""}`;

    incidents.forEach((incident) => {
      const article = document.createElement("article");
      article.className = "incident-item";
      article.setAttribute("data-id", incident.id);
      article.setAttribute("tabindex", "0");
      article.setAttribute("role", "button");
      article.setAttribute("aria-label", `Ver detalle de ${incident.id}: ${incident.title}`);

      article.innerHTML = `
        <div class="incident-item-topline">
          <span class="incident-id">${incident.id}</span>
          <span class="badge ${badgeClass(incident.status)}">${statusLabels[incident.status]}</span>
        </div>
        <h3>${incident.title}</h3>
        <p>${incident.description}</p>
        <div class="incident-meta">
          <span>${categoryLabels[incident.category] || incident.category}</span>
          <span>${priorityLabels[incident.priority] || incident.priority}</span>
          <span>${formatDate(incident.date)}</span>
        </div>
      `;
      listEl.appendChild(article);
    });
  }

  function renderDetail(incident, statusLabels) {
    if (!incident) {
      detailEl.innerHTML = `<p>Selecciona un incidente de la lista para ver su detalle.</p>`;
      return;
    }
    detailEl.innerHTML = `
      <p class="eyebrow">Detalle del último ticket</p>
      <h2>${incident.id}</h2>
      <p class="detail-title">${incident.title}</p>
      <dl class="detail-list">
        <div><dt>Estado</dt><dd><span class="badge ${badgeClass(incident.status)}">${statusLabels[incident.status]}</span></dd></div>
        <div><dt>Reportado por</dt><dd>${incident.reporter}</dd></div>
        <div><dt>Fecha</dt><dd>${formatDate(incident.date)}</dd></div>
        <div><dt>Área</dt><dd>${incident.area}</dd></div>
      </dl>
      <div class="detail-description">
        <h3>Descripción</h3>
        <p>${incident.description}</p>
      </div>
      <button class="button button-secondary button-full" type="button">Actualizar estado</button>
    `;
  }

  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(`${fieldId}-error`);
    field.setAttribute("aria-invalid", "true");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  }

  function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(`${fieldId}-error`);
    field.removeAttribute("aria-invalid");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.hidden = true;
    }
  }

  function announce(message) {
    liveRegion.textContent = "";
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 50);
  }

  function resetForm(formEl) {
    formEl.reset();
    ["title", "category", "priority", "description", "email", "date"].forEach(clearFieldError);
  }

  return {
    renderList,
    renderDetail,
    showFieldError,
    clearFieldError,
    announce,
    resetForm
  };
})();
