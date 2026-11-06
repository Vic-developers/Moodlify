/**
 * ==============================================================================
 * MOODLIFY - PLATFORMS PAGE (js/pages/platforms.js)
 * Full CRUD for Moodle instances: Cards Grid, Health Testing, Sync,
 * State filtering, Search & Context Actions
 * ==============================================================================
 */

(function () {
  'use strict';

  let currentFilter = 'all';
  let searchQuery = '';

  const platformsPage = {
    render: async function (container) {
      const state = window.store.getState();
      let platforms = [...state.platforms];

      if (currentFilter !== 'all') {
        platforms = platforms.filter(p => p.status === currentFilter);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        platforms = platforms.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.url.toLowerCase().includes(q) ||
          p.institution.toLowerCase().includes(q)
        );
      }

      container.innerHTML = `
        <div class="animate-fade-in">
          <!-- Page Header -->
          <div class="page-header">
            <div>
              <h1 class="page-title">Instancias de Moodle</h1>
              <p class="page-subtitle">Conexión, sincronización y estado de servidores LMS institucionales</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-secondary" onclick="window.platformsPage.syncAll()">
                <i data-lucide="refresh-cw"></i> Sincronizar Todas
              </button>
              <button class="btn btn-primary" onclick="window.platformsPage.openCreateModal()">
                <i data-lucide="plus"></i> Añadir Plataforma
              </button>
            </div>
          </div>

          <!-- Filters & Search Toolbar -->
          <div class="card" style="margin-bottom: 1.5rem; padding: 0.85rem 1.25rem;">
            <div style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
              <div class="input-icon-wrapper" style="max-width: 380px; width: 100%;">
                <i data-lucide="search"></i>
                <input type="text" class="form-input" placeholder="Buscar por nombre, URL o institución..."
                       value="${window.security.escapeHtml(searchQuery)}"
                       oninput="window.platformsPage.onSearch(this.value)" />
              </div>
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <span style="font-size: 0.8rem; font-weight: 500; color: var(--muted);">Filtrar por estado:</span>
                <select class="form-select" style="width: auto; padding: 0.45rem 1rem;" onchange="window.platformsPage.onFilterChange(this.value)">
                  <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>Todos los estados</option>
                  <option value="active" ${currentFilter === 'active' ? 'selected' : ''}>Activas</option>
                  <option value="maintenance" ${currentFilter === 'maintenance' ? 'selected' : ''}>Mantenimiento</option>
                  <option value="error" ${currentFilter === 'error' ? 'selected' : ''}>Con Error</option>
                  <option value="inactive" ${currentFilter === 'inactive' ? 'selected' : ''}>Inactivas</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Platforms Grid -->
          ${platforms.length === 0 ? window.widgets.emptyState({
            title: 'No se encontraron plataformas',
            description: 'No hay instancias Moodle que coincidan con los criterios de búsqueda.',
            actionButton: { label: 'Crear Nueva Plataforma', onClick: 'window.platformsPage.openCreateModal()' }
          }) : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem;">
              ${platforms.map(p => this._renderPlatformCard(p)).join('')}
            </div>
          `}
        </div>
      `;
    },

    _renderPlatformCard: function (p) {
      const syncDateFormatted = p.lastSync ? new Date(p.lastSync).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca';

      return `
        <div class="card animate-fade-in" style="display: flex; flex-direction: column;">
          <div class="card-header" style="align-items: flex-start;">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                <h3 class="card-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${window.security.escapeHtml(p.name)}
                </h3>
              </div>
              <div style="font-size: 0.775rem; color: var(--muted);">${window.security.escapeHtml(p.institution)}</div>
            </div>
            <div>
              ${window.widgets.statusBadge(p.status)}
            </div>
          </div>

          <div class="card-body" style="flex: 1; display: flex; flex-direction: column; gap: 1rem;">
            <div style="background: var(--bg-alt); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--border);">
              <div style="font-size: 0.725rem; font-weight: 600; text-transform: uppercase; color: var(--muted); margin-bottom: 0.2rem;">URL del Servidor</div>
              <a href="${window.security.escapeHtml(p.url)}" target="_blank" rel="noopener" style="font-size: 0.85rem; font-family: monospace; display: flex; align-items: center; gap: 0.35rem; color: var(--primary); text-decoration: underline;">
                ${window.security.escapeHtml(p.url)} <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
              </a>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div style="background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 0.65rem;">
                <div style="font-size: 0.7rem; color: var(--muted);">Usuarios</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--text);">${p.usersCount}</div>
              </div>
              <div style="background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 0.65rem;">
                <div style="font-size: 0.7rem; color: var(--muted);">Cursos</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--text);">${p.coursesCount}</div>
              </div>
            </div>

            <div style="font-size: 0.775rem; color: var(--muted); display: flex; flex-direction: column; gap: 0.25rem;">
              <div><strong>Versión:</strong> ${window.security.escapeHtml(p.version)}</div>
              <div><strong>Última Sincronización:</strong> ${syncDateFormatted}</div>
              <div><strong>Latencia de Red:</strong> <span style="color: ${p.responseTimeMs < 200 ? 'var(--success)' : 'var(--warning)'}; font-weight: 600;">${p.responseTimeMs}ms</span></div>
            </div>
          </div>

          <div class="card-footer" style="gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="window.platformsPage.testConnection('${p.id}')">
              <i data-lucide="activity" style="width: 14px; height: 14px;"></i> Probar
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.platformsPage.syncPlatform('${p.id}')">
              <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Sincronizar
            </button>
            <button class="btn btn-ghost btn-sm" onclick="window.platformsPage.openEditModal('${p.id}')">
              <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Editar
            </button>
            <button class="btn btn-ghost btn-sm" style="color: var(--danger); margin-left: auto;" onclick="window.platformsPage.deletePlatform('${p.id}', '${window.security.escapeHtml(p.name)}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </div>
      `;
    },

    onSearch: function (val) {
      searchQuery = val;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    onFilterChange: function (val) {
      currentFilter = val;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    openCreateModal: function () {
      const content = `
        <form id="create-platform-form" onsubmit="event.preventDefault(); window.platformsPage.handleCreateSubmit();">
          <div class="form-group">
            <label class="form-label required">Nombre de la Plataforma</label>
            <input type="text" class="form-input" id="plat-name" placeholder="Ej: Campus Principal Pregrado" required />
          </div>
          <div class="form-group">
            <label class="form-label required">URL Base de Moodle</label>
            <input type="url" class="form-input" id="plat-url" placeholder="https://moodle.institucion.edu" required />
            <span class="form-helper">Debe incluir protocolo https:// y sin barra al final</span>
          </div>
          <div class="form-group">
            <label class="form-label required">Token de Servicio Web (Webservice Token)</label>
            <input type="password" class="form-input" id="plat-token" placeholder="Token generado en Moodle" required />
            <span class="form-helper">Creado en Administración del Sitio > Extensiones > Servicios Web > Gestionar Tokens</span>
          </div>
          <div class="form-group">
            <label class="form-label">Institución o Facultad</label>
            <input type="text" class="form-input" id="plat-inst" placeholder="Ej: Facultad de Ingeniería" />
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('create-platform-form').requestSubmit()">Conectar Plataforma</button>
      `;

      window.modal.open({
        title: 'Conectar Nueva Instancia de Moodle',
        content,
        footer
      });
    },

    handleCreateSubmit: async function () {
      const name = document.getElementById('plat-name').value.trim();
      const url = document.getElementById('plat-url').value.trim();
      const token = document.getElementById('plat-token').value.trim();
      const institution = document.getElementById('plat-inst').value.trim();

      if (!name || !url || !token) {
        if (window.toast) window.toast.warning('Por favor completa todos los campos requeridos');
        return;
      }

      const res = await window.api.request('createPlatform', { name, url, token, institution });
      if (res.success) {
        if (window.toast) window.toast.success('Plataforma Moodle conectada');
        window.modal.close();
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    },

    openEditModal: function (id) {
      const state = window.store.getState();
      const p = state.platforms.find(item => item.id === id);
      if (!p) return;

      const content = `
        <form id="edit-platform-form" onsubmit="event.preventDefault(); window.platformsPage.handleEditSubmit('${id}');">
          <div class="form-group">
            <label class="form-label required">Nombre de la Plataforma</label>
            <input type="text" class="form-input" id="edit-plat-name" value="${window.security.escapeHtml(p.name)}" required />
          </div>
          <div class="form-group">
            <label class="form-label required">URL Base</label>
            <input type="url" class="form-input" id="edit-plat-url" value="${window.security.escapeHtml(p.url)}" required />
          </div>
          <div class="form-group">
            <label class="form-label required">Estado</label>
            <select class="form-select" id="edit-plat-status">
              <option value="active" ${p.status === 'active' ? 'selected' : ''}>Activo</option>
              <option value="maintenance" ${p.status === 'maintenance' ? 'selected' : ''}>Mantenimiento</option>
              <option value="error" ${p.status === 'error' ? 'selected' : ''}>Error</option>
              <option value="inactive" ${p.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Institución</label>
            <input type="text" class="form-input" id="edit-plat-inst" value="${window.security.escapeHtml(p.institution)}" />
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('edit-platform-form').requestSubmit()">Guardar Cambios</button>
      `;

      window.modal.open({
        title: `Editar Plataforma: ${p.name}`,
        content,
        footer
      });
    },

    handleEditSubmit: async function (id) {
      const name = document.getElementById('edit-plat-name').value.trim();
      const url = document.getElementById('edit-plat-url').value.trim();
      const status = document.getElementById('edit-plat-status').value;
      const institution = document.getElementById('edit-plat-inst').value.trim();

      const res = await window.api.request('updatePlatform', { id, name, url, status, institution });
      if (res.success) {
        if (window.toast) window.toast.success('Plataforma actualizada');
        window.modal.close();
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    },

    testConnection: async function (id) {
      if (window.toast) window.toast.info('Probando conexión con el servicio web de Moodle...');
      const res = await window.api.request('testPlatformConnection', { id });
      if (res.success) {
        if (window.toast) window.toast.success(`Conexión exitosa. Versión: ${res.data.version} (${res.data.latencyMs}ms)`);
      }
    },

    syncPlatform: async function (id) {
      if (window.toast) window.toast.info('Sincronizando usuarios y cursos...');
      const res = await window.api.request('syncPlatform', { id });
      if (res.success) {
        if (window.toast) window.toast.success(res.message);
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    },

    syncAll: async function () {
      const state = window.store.getState();
      if (window.toast) window.toast.info('Sincronizando todas las plataformas Moodle...');
      for (const p of state.platforms) {
        await window.api.request('syncPlatform', { id: p.id });
      }
      if (window.toast) window.toast.success('Sincronización completa');
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    deletePlatform: function (id, name) {
      window.modal.confirm({
        title: 'Eliminar Instancia Moodle',
        message: `¿Estás seguro de que deseas desconectar la plataforma "${name}"? Se perderán las sincronizaciones automáticas asociadas.`,
        confirmText: 'Desconectar Plataforma',
        type: 'danger',
        onConfirm: async () => {
          const res = await window.api.request('deletePlatform', { id });
          if (res.success) {
            if (window.toast) window.toast.success('Plataforma eliminada');
            this.render(document.getElementById('page-container'));
            if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
          }
        }
      });
    }
  };

  window.platformsPage = platformsPage;
})();

