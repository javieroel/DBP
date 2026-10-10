const IncidentView = (() => {
  const listEl = document.getElementById("incident-list");
  const countEl = document.getElementById("record-count");
  const detailEl = document.getElementById("detail-panel-content");
  const liveRegion = document.getElementById("live-region");

  const priorityLabels = { alta: "Prioridad alta", media: "Prioridad media", baja: "Prioridad baja" };
  const categoryLabels = { acceso: "Acceso", sistema: "Sistema", red: "Red", otro: "Otro" };

  // Seguridad: los datos ahora se GUARDAN en la base. Si alguien registra
  // "<script>...</script>" como título, sin escapar se ejecutaría en el navegador
  // de cada persona que abra la lista (XSS almacenado). escapeHtml lo convierte en texto.
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function badgeClass(status) {
    if (status === "progress") return "badge-progress";
    if (status === "open") return "badge-open";
    return "badge-closed";
  }

  function formatDate(isoDate) {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Botones de acción de un incidente (se usan en la tarjeta y en el detalle)
  function actionsHtml(incident, statusActions, perms, { withView = false } = {}) {
    const id = escapeHtml(incident.id);
    const viewButton = withView
      ? `<button class="button button-small button-secondary" type="button" data-action="view" data-id="${id}">Ver detalle</button>`
      : "";
    const statusButtons = (perms.status ? statusActions[incident.status] || [] : [])
      .map(
        (action) =>
          `<button class="button button-small button-secondary" type="button" data-action="set-status" data-id="${id}" data-status="${action.to}">${action.label}</button>`
      )
      .join("");
    const deleteButton = perms.delete
      ? `<button class="button button-small button-danger" type="button" data-action="delete" data-id="${id}">Eliminar</button>`
      : "";

    return `
      <div class="incident-actions" role="group" aria-label="Acciones para ${id}">
        ${viewButton}${statusButtons}${deleteButton}
      </div>
    `;
  }

  function renderList(incidents, statusLabels, statusActions, perms) {
    listEl.innerHTML = "";
    countEl.textContent = `${incidents.length} registro${incidents.length !== 1 ? "s" : ""}`;

    if (!incidents.length) {
      listEl.innerHTML = `<p class="empty-state">No hay incidentes para los filtros seleccionados.</p>`;
      return;
    }

    incidents.forEach((incident) => {
      const article = document.createElement("article");
      article.className = "incident-item";
      article.setAttribute("data-id", incident.id);

      article.innerHTML = `
        <div class="incident-item-topline">
          <span class="incident-id">${escapeHtml(incident.id)}</span>
          <span class="badge ${badgeClass(incident.status)}">${statusLabels[incident.status]}</span>
        </div>
        <h3>${escapeHtml(incident.title)}</h3>
        <p>${escapeHtml(incident.description)}</p>
        <div class="incident-meta">
          <span>${escapeHtml(categoryLabels[incident.category] || incident.category)}</span>
          <span>${escapeHtml(priorityLabels[incident.priority] || incident.priority)}</span>
          <span>${formatDate(incident.date)}</span>
        </div>
        ${actionsHtml(incident, statusActions, perms, { withView: true })}
      `;
      listEl.appendChild(article);
    });
  }

  function renderDetail(incident, statusLabels, statusActions, perms) {
    if (!incident) {
      detailEl.innerHTML = `<p>Selecciona un incidente de la lista para ver su detalle.</p>`;
      return;
    }
    detailEl.innerHTML = `
      <p class="eyebrow">Detalle del último ticket</p>
      <h2>${escapeHtml(incident.id)}</h2>
      <p class="detail-title">${escapeHtml(incident.title)}</p>
      <dl class="detail-list">
        <div><dt>Estado</dt><dd><span class="badge ${badgeClass(incident.status)}">${statusLabels[incident.status]}</span></dd></div>
        <div><dt>Reportado por</dt><dd>${escapeHtml(incident.reporter)}</dd></div>
        <div><dt>Fecha</dt><dd>${formatDate(incident.date)}</dd></div>
        <div><dt>Área</dt><dd>${escapeHtml(incident.area)}</dd></div>
      </dl>
      <div class="detail-description">
        <h3>Descripción</h3>
        <p>${escapeHtml(incident.description)}</p>
      </div>
      ${actionsHtml(incident, statusActions, perms)}
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

  // Primer clic en "Eliminar": pide confirmación sin abrir ventanas emergentes
  function askDeleteConfirmation(button) {
    button.dataset.confirm = "true";
    button.textContent = "Confirmar eliminación";
    setTimeout(() => {
      if (button.isConnected && button.dataset.confirm === "true") {
        button.dataset.confirm = "";
        button.textContent = "Eliminar";
      }
    }, 5000);
  }

  // ---------- Sesión ----------
  const loginBox = document.getElementById("login-box");
  const userBox = document.getElementById("user-box");
  const loginError = document.getElementById("login-error");
  const formNote = document.getElementById("form-permission-note");

  function renderSession(user, roleLabels) {
    loginBox.hidden = Boolean(user);
    userBox.hidden = !user;
    loginError.hidden = true;
    if (user) {
      document.getElementById("user-name").textContent = user.name;
      document.getElementById("user-role").textContent = roleLabels[user.role] || user.role;
    }
  }

  function showLoginError(message) {
    loginError.textContent = message;
    loginError.hidden = false;
  }

  function renderLoggedOut() {
    listEl.innerHTML = `<p class="empty-state">Inicia sesión para consultar los incidentes.</p>`;
    countEl.textContent = "—";
    detailEl.innerHTML = `<p>Inicia sesión para ver el detalle de los incidentes.</p>`;
  }

  // Habilita o bloquea el formulario de registro según el rol
  function setFormEnabled(formEl, enabled, message) {
    formEl.querySelectorAll("input, select, textarea, button").forEach((el) => {
      el.disabled = !enabled;
    });
    formNote.textContent = message || "";
    formNote.hidden = !message;
  }

  return {
    renderSession,
    showLoginError,
    renderLoggedOut,
    setFormEnabled,
    renderList,
    askDeleteConfirmation,
    renderDetail,
    showFieldError,
    clearFieldError,
    announce,
    resetForm
  };
})();
