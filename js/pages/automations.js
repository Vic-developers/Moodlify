/**
 * ==============================================================================
 * MOODLIFY - AUTOMATIONS PAGE (js/pages/automations.js)
 * Background tasks, Scheduled Crons, Trigger Execution,
 * Predefined Templates & Run History
 * ==============================================================================
 */

(function () {
  'use strict';

  const automationsPage = {
    render: async function (container) {
      const state = window.store.getState();
      const automations = state.automations || [];

      container.innerHTML = `
        <div class="animate-fade-in">
          <!-- Page Header -->
          <div class="page-header">
            <div>
              <h1 class="page-title">Automatizaciones y Tareas</h1>
              <p class="page-subtitle">Sincronización desasistida, generación de reportes y salud de infraestructura</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-primary" onclick="window.automationsPage.openCreateModal()">
                <i data-lucide="plus"></i> Nueva Automatización
              </button>
            </div>
          </div>

          <!-- Automations List Grid -->
          <div style="display: grid; grid-template-columns: 1fr; gap: 1.25rem;">
            ${automations.map(a => this._renderAutomationCard(a)).join('')}
          </div>
        </div>
      `;
    },

    _renderAutomationCard: function (a) {
      const freqLabels = {
        hourly: 'Cada Hora',
        daily: 'Diaria (02:00 AM)',
        weekly: 'Semanal (Lunes)',
        monthly: 'Mensual (Día 1)'
      };

      const lastRunStr = a.lastRun ? new Date(a.lastRun).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Pendiente';

      return `
        <div class="card animate-fade-in" style="padding: 1.25rem 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 280px;">
              <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
                <span class="badge ${a.isActive ? 'badge-success' : 'badge-neutral'}">
                  <span class="status-dot ${a.isActive ? 'active' : 'inactive'}"></span>
                  ${a.isActive ? 'Activa' : 'Pausada'}
                </span>
                <h3 style="font-size: 1.05rem; font-weight: 600; color: var(--text); margin: 0;">
                  ${window.security.escapeHtml(a.name)}
                </h3>
              </div>
              <p style="font-size: 0.85rem; color: var(--muted); margin: 0 0 0.75rem 0; line-height: 1.4;">
                ${window.security.escapeHtml(a.description)}
              </p>

              <div style="display: flex; gap: 1.5rem; font-size: 0.8rem; color: var(--muted); flex-wrap: wrap;">
                <span><i data-lucide="clock" style="width: 14px; height: 14px; vertical-align: middle;"></i> Frecuencia: <strong>${freqLabels[a.frequency] || a.frequency}</strong></span>
                <span><i data-lucide="history" style="width: 14px; height: 14px; vertical-align: middle;"></i> Última corrida: <strong>${lastRunStr}</strong></span>
                <span><i data-lucide="play-circle" style="width: 14px; height: 14px; vertical-align: middle;"></i> Ejecuciones totales: <strong>${a.runsCount}</strong></span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.65rem; align-self: center;">
              <button class="btn btn-secondary btn-sm" onclick="window.automationsPage.runNow('${a.id}', this)">
                <i data-lucide="play" style="width: 14px; height: 14px;"></i> Ejecutar Ahora
              </button>
              <button class="btn btn-ghost btn-sm" onclick="window.automationsPage.toggleStatus('${a.id}')">
                <i data-lucide="${a.isActive ? 'pause' : 'play'}" style="width: 14px; height: 14px;"></i> ${a.isActive ? 'Pausar' : 'Reanudar'}
              </button>
              <button class="btn btn-ghost btn-icon btn-sm" style="color: var(--danger);" onclick="window.automationsPage.deleteAutomation('${a.id}', '${window.security.escapeHtml(a.name)}')">
                <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    },

    runNow: async function (id, btnEl) {
      if (btnEl) btnEl.classList.add('btn-loading');

      await new Promise(r => setTimeout(r, 650));

      const state = window.store.getState();
      const updated = state.automations.map(a => {
        if (a.id === id) {
          return {
            ...a,
            lastRun: new Date().toISOString(),
            runsCount: (a.runsCount || 0) + 1
          };
        }
        return a;
      });

      window.store.setState({ automations: updated });

      if (btnEl) btnEl.classList.remove('btn-loading');
      if (window.toast) window.toast.success('Automatización ejecutada correctamente');
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    toggleStatus: function (id) {
      const state = window.store.getState();
      const updated = state.automations.map(a => {
        if (a.id === id) {
          return { ...a, isActive: !a.isActive };
        }
        return a;
      });

      window.store.setState({ automations: updated });
      if (window.toast) window.toast.info('Estado de la tarea modificado');
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    openCreateModal: function () {
      const state = window.store.getState();
      const content = `
        <form id="create-auto-form" onsubmit="event.preventDefault(); window.automationsPage.handleCreateSubmit();">
          <div class="form-group">
            <label class="form-label required">Nombre de la Automatización</label>
            <input type="text" class="form-input" id="auto-name" placeholder="Ej: Respaldo y Verificación de Cursos" required />
          </div>
          <div class="form-group">
            <label class="form-label required">Descripción</label>
            <textarea class="form-textarea" id="auto-desc" rows="2" placeholder="Describe brevemente el propósito de la tarea..." required></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Frecuencia de Ejecución</label>
              <select class="form-select" id="auto-freq">
                <option value="hourly">Cada hora</option>
                <option value="daily" selected>Diaria (02:00 AM)</option>
                <option value="weekly">Semanal (Lunes)</option>
                <option value="monthly">Mensual (Día 1)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Acción a Ejecutar</label>
              <select class="form-select" id="auto-action">
                <option value="sync_all">Sincronización Total</option>
                <option value="generate_report">Generar y Enviar Reporte</option>
                <option value="health_check">Monitoreo de Latencia y Salud</option>
                <option value="cleanup_logs">Limpieza de Auditoría</option>
              </select>
            </div>
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('create-auto-form').requestSubmit()">Crear Tarea</button>
      `;

      window.modal.open({
        title: 'Programar Nueva Automatización',
        content,
        footer
      });
    },

    handleCreateSubmit: function () {
      const name = document.getElementById('auto-name').value.trim();
      const description = document.getElementById('auto-desc').value.trim();
      const frequency = document.getElementById('auto-freq').value;
      const action = document.getElementById('auto-action').value;

      if (!name || !description) {
        if (window.toast) window.toast.warning('Completa todos los campos obligatorios');
        return;
      }

      const newAuto = {
        id: 'auto-' + Date.now(),
        name,
        description,
        frequency,
        action,
        isActive: true,
        lastRun: null,
        runsCount: 0,
        status: 'active'
      };

      const state = window.store.getState();
      window.store.setState({ automations: [newAuto, ...state.automations] });

      if (window.toast) window.toast.success('Automatización programada');
      window.modal.close();
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    deleteAutomation: function (id, name) {
      window.modal.confirm({
        title: 'Eliminar Automatización',
        message: `¿Estás seguro de que deseas eliminar la tarea programada "${name}"?`,
        confirmText: 'Eliminar',
        type: 'danger',
        onConfirm: () => {
          const state = window.store.getState();
          window.store.setState({
            automations: state.automations.filter(a => a.id !== id)
          });
          if (window.toast) window.toast.success('Tarea eliminada');
          this.render(document.getElementById('page-container'));
          if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
        }
      });
    }
  };

  window.automationsPage = automationsPage;
})();

