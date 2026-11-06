/**
 * ==============================================================================
 * MOODLIFY - INCIDENCES & TICKETING PAGE (js/pages/incidences.js)
 * Helpdesk Ticketing for Moodle Platforms, Priority Badges, Status Workflow,
 * Technician Assignment, Category Filtering & Incident Resolution
 * ==============================================================================
 */

(function () {
  'use strict';

  let currentStatus = 'all';
  let currentPriority = 'all';

  const incidencesPage = {
    render: async function (container) {
      const state = window.store.getState();
      let incidences = [...state.incidences];

      if (currentStatus !== 'all') {
        incidences = incidences.filter(i => i.status === currentStatus);
      }
      if (currentPriority !== 'all') {
        incidences = incidences.filter(i => i.priority === currentPriority);
      }

      const openCount = state.incidences.filter(i => i.status === 'open').length;
      const progressCount = state.incidences.filter(i => i.status === 'in_progress').length;
      const resolvedCount = state.incidences.filter(i => i.status === 'resolved').length;

      container.innerHTML = `
        <div class="animate-fade-in">
          <!-- Page Header -->
          <div class="page-header">
            <div>
              <h1 class="page-title">Gestión de Incidencias</h1>
              <p class="page-subtitle">Monitoreo de tickets técnicos, fallas de sincronización y soporte</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-primary" onclick="window.incidencesPage.openCreateModal()">
                <i data-lucide="plus"></i> Nueva Incidencia
              </button>
            </div>
          </div>

          <!-- 3 Status KPIs -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
            <div class="card" style="padding: 1.25rem; border-left: 4px solid var(--warning);">
              <div style="font-size: 0.8rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Abiertas / Nuevas</div>
              <div style="font-size: 1.8rem; font-weight: 700; color: var(--text); margin-top: 0.25rem;">${openCount}</div>
            </div>
            <div class="card" style="padding: 1.25rem; border-left: 4px solid var(--info);">
              <div style="font-size: 0.8rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">En Progreso</div>
              <div style="font-size: 1.8rem; font-weight: 700; color: var(--text); margin-top: 0.25rem;">${progressCount}</div>
            </div>
            <div class="card" style="padding: 1.25rem; border-left: 4px solid var(--success);">
              <div style="font-size: 0.8rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Resueltas</div>
              <div style="font-size: 1.8rem; font-weight: 700; color: var(--text); margin-top: 0.25rem;">${resolvedCount}</div>
            </div>
          </div>

          <!-- Filters Toolbar -->
          <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.25rem;">
            <div style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text);">Filtrar Tickets:</span>
              <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                <select class="form-select" style="width: auto; padding: 0.45rem 0.85rem;" onchange="window.incidencesPage.onStatusFilterChange(this.value)">
                  <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>Todos los estados</option>
                  <option value="open" ${currentStatus === 'open' ? 'selected' : ''}>Abiertas</option>
                  <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>En Progreso</option>
                  <option value="resolved" ${currentStatus === 'resolved' ? 'selected' : ''}>Resueltas</option>
                </select>

                <select class="form-select" style="width: auto; padding: 0.45rem 0.85rem;" onchange="window.incidencesPage.onPriorityFilterChange(this.value)">
                  <option value="all" ${currentPriority === 'all' ? 'selected' : ''}>Todas las prioridades</option>
                  <option value="critical" ${currentPriority === 'critical' ? 'selected' : ''}>Crítica</option>
                  <option value="high" ${currentPriority === 'high' ? 'selected' : ''}>Alta</option>
                  <option value="medium" ${currentPriority === 'medium' ? 'selected' : ''}>Media</option>
                  <option value="low" ${currentPriority === 'low' ? 'selected' : ''}>Baja</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Incidences List -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${incidences.length === 0 ? window.widgets.emptyState({
              title: 'No hay incidencias registradas',
              description: 'Todas las plataformas operan con normalidad.',
              actionButton: { label: 'Crear Incidencia', onClick: 'window.incidencesPage.openCreateModal()' }
            }) : incidences.map(inc => this._renderIncidenceCard(inc)).join('')}
          </div>
        </div>
      `;
    },

    _renderIncidenceCard: function (inc) {
      const priorityBadge = {
        critical: '<span class="badge badge-danger">Crítica</span>',
        high: '<span class="badge badge-warning" style="background: var(--danger-light); color: var(--danger);">Alta</span>',
        medium: '<span class="badge badge-warning">Media</span>',
        low: '<span class="badge badge-neutral">Baja</span>'
      }[inc.priority] || '<span class="badge badge-neutral">Normal</span>';

      const categoryLabel = {
        general: 'General',
        matriculas: 'Matrículas',
        cursos: 'Cursos',
        usuarios: 'Usuarios',
        rendimiento: 'Rendimiento',
        seguridad: 'Seguridad'
      }[inc.category] || inc.category;

      const timeAgoStr = new Date(inc.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

      return `
        <div class="card animate-fade-in" style="padding: 1.25rem 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 280px;">
              <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
                ${window.widgets.statusBadge(inc.status)}
                ${priorityBadge}
                <span class="badge badge-info">${categoryLabel}</span>
                <span style="font-size: 0.75rem; color: var(--muted);">${timeAgoStr}</span>
              </div>

              <h3 style="font-size: 1.05rem; font-weight: 600; color: var(--text); margin: 0 0 0.4rem 0;">
                ${window.security.escapeHtml(inc.title)}
              </h3>

              <p style="font-size: 0.85rem; color: var(--muted); margin: 0 0 0.85rem 0; line-height: 1.45;">
                ${window.security.escapeHtml(inc.description)}
              </p>

              <div style="display: flex; gap: 1.5rem; font-size: 0.8rem; color: var(--muted); flex-wrap: wrap;">
                <span><i data-lucide="server" style="width: 14px; height: 14px; vertical-align: middle;"></i> Plataforma: <strong>${window.security.escapeHtml(inc.platformName)}</strong></span>
                <span><i data-lucide="user" style="width: 14px; height: 14px; vertical-align: middle;"></i> Asignado a: <strong>${window.security.escapeHtml(inc.assignedTo || 'Sin asignar')}</strong></span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem; align-self: center;">
              ${inc.status === 'open' ? `
                <button class="btn btn-secondary btn-sm" onclick="window.incidencesPage.advanceStatus('${inc.id}', 'in_progress')">
                  Iniciar Atención
                </button>
              ` : ''}
              ${inc.status === 'in_progress' ? `
                <button class="btn btn-primary btn-sm" onclick="window.incidencesPage.advanceStatus('${inc.id}', 'resolved')">
                  <i data-lucide="check" style="width: 14px; height: 14px;"></i> Marcar Resuelta
                </button>
              ` : ''}
              ${inc.status === 'resolved' ? `
                <button class="btn btn-ghost btn-sm" onclick="window.incidencesPage.advanceStatus('${inc.id}', 'open')">
                  Reabrir
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    },

    onStatusFilterChange: function (val) {
      currentStatus = val;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    onPriorityFilterChange: function (val) {
      currentPriority = val;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    advanceStatus: async function (id, nextStatus) {
      const res = await window.api.request('updateIncidence', { id, status: nextStatus });
      if (res.success) {
        if (window.toast) window.toast.success(`Estado del ticket actualizado a '${nextStatus}'`);
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    },

    openCreateModal: function () {
      const state = window.store.getState();
      const content = `
        <form id="create-inc-form" onsubmit="event.preventDefault(); window.incidencesPage.handleCreateSubmit();">
          <div class="form-group">
            <label class="form-label required">Título del Ticket / Problema</label>
            <input type="text" class="form-input" id="inc-title" placeholder="Ej: Falla en entrega de calificaciones por webhook" required />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Plataforma Afectada</label>
              <select class="form-select" id="inc-plat">
                ${state.platforms.map(p => `
                  <option value="${p.id}">${window.security.escapeHtml(p.name)}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Prioridad</label>
              <select class="form-select" id="inc-priority">
                <option value="low">Baja</option>
                <option value="medium" selected>Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Categoría</label>
              <select class="form-select" id="inc-cat">
                <option value="general">General</option>
                <option value="matriculas">Matrículas</option>
                <option value="cursos">Cursos</option>
                <option value="usuarios">Usuarios</option>
                <option value="rendimiento">Rendimiento</option>
                <option value="seguridad">Seguridad</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Técnico Asignado</label>
              <input type="text" class="form-input" id="inc-assigned" value="Víctor Lorenzo" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label required">Descripción Detallada</label>
            <textarea class="form-textarea" id="inc-desc" rows="3" placeholder="Síntomas observados, pasos para reproducir o mensajes de error devueltos..." required></textarea>
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('create-inc-form').requestSubmit()">Crear Incidencia</button>
      `;

      window.modal.open({
        title: 'Registrar Incidencia Técnica',
        content,
        footer
      });
    },

    handleCreateSubmit: async function () {
      const title = document.getElementById('inc-title').value.trim();
      const platform_id = document.getElementById('inc-plat').value;
      const priority = document.getElementById('inc-priority').value;
      const category = document.getElementById('inc-cat').value;
      const assignedTo = document.getElementById('inc-assigned').value.trim();
      const description = document.getElementById('inc-desc').value.trim();

      if (!title || !description) {
        if (window.toast) window.toast.warning('Por favor completa todos los campos requeridos');
        return;
      }

      const res = await window.api.request('createIncidence', {
        title,
        platform_id,
        priority,
        category,
        assignedTo,
        description
      });

      if (res.success) {
        if (window.toast) window.toast.success('Incidencia creada y encolada para atención');
        window.modal.close();
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    }
  };

  window.incidencesPage = incidencesPage;
})();

