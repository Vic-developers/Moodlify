/**
 * ==============================================================================
 * MOODLIFY - USERS DIRECTORY PAGE (js/pages/users.js)
 * Real-time User Management, Role Mapping, Password Reset, Status Toggles,
 * CSV Import/Export, Bulk Actions, Initial Avatars & Debounced Search
 * ==============================================================================
 */

(function () {
  'use strict';

  let currentPlatform = 'all';
  let currentRole = 'all';
  let currentStatus = 'all';
  let searchQuery = '';
  let currentPage = 1;
  const pageSize = 8;
  let selectedUserIds = new Set();
  let searchDebounceTimer = null;

  const usersPage = {
    render: async function (container) {
      const state = window.store.getState();
      let users = [...state.users];

      // Filtros
      if (currentPlatform !== 'all') {
        users = users.filter(u => u.platformId === currentPlatform);
      }
      if (currentRole !== 'all') {
        users = users.filter(u => u.role === currentRole);
      }
      if (currentStatus !== 'all') {
        users = users.filter(u => u.status === currentStatus);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        users = users.filter(u =>
          u.username.toLowerCase().includes(q) ||
          u.firstname.toLowerCase().includes(q) ||
          u.lastname.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      }

      // Paginación
      const totalUsers = users.length;
      const totalPages = Math.ceil(totalUsers / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      const startIndex = (currentPage - 1) * pageSize;
      const paginatedUsers = users.slice(startIndex, startIndex + pageSize);

      container.innerHTML = `
        <div class="animate-fade-in">
          <!-- Page Header -->
          <div class="page-header">
            <div>
              <h1 class="page-title">Directorio de Usuarios</h1>
              <p class="page-subtitle">Gestión centralizada de cuentas docentes, administrativas y alumnos</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-secondary" onclick="window.usersPage.exportCSV()">
                <i data-lucide="download"></i> Exportar CSV
              </button>
              <button class="btn btn-secondary" onclick="window.usersPage.openImportModal()">
                <i data-lucide="upload"></i> Importar CSV
              </button>
              <button class="btn btn-primary" onclick="window.usersPage.openCreateModal()">
                <i data-lucide="user-plus"></i> Nuevo Usuario
              </button>
            </div>
          </div>

          <!-- Toolbar & Filters -->
          <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.25rem;">
            <div style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
              <div class="input-icon-wrapper" style="max-width: 320px; width: 100%;">
                <i data-lucide="search"></i>
                <input type="text" class="form-input" placeholder="Buscar por nombre, usuario o email..."
                       value="${window.security.escapeHtml(searchQuery)}"
                       oninput="window.usersPage.onSearchInput(this.value)" />
              </div>

              <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                <select class="form-select" style="width: auto; padding: 0.45rem 0.85rem;" onchange="window.usersPage.onPlatformChange(this.value)">
                  <option value="all" ${currentPlatform === 'all' ? 'selected' : ''}>Todas las plataformas</option>
                  ${state.platforms.map(p => `
                    <option value="${p.id}" ${currentPlatform === p.id ? 'selected' : ''}>${window.security.escapeHtml(p.name)}</option>
                  `).join('')}
                </select>

                <select class="form-select" style="width: auto; padding: 0.45rem 0.85rem;" onchange="window.usersPage.onRoleChange(this.value)">
                  <option value="all" ${currentRole === 'all' ? 'selected' : ''}>Todos los roles</option>
                  <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Administradores</option>
                  <option value="editingteacher" ${currentRole === 'editingteacher' ? 'selected' : ''}>Profesores Titulares</option>
                  <option value="teacher" ${currentRole === 'teacher' ? 'selected' : ''}>Profesores Adjuntos</option>
                  <option value="student" ${currentRole === 'student' ? 'selected' : ''}>Estudiantes</option>
                </select>

                <select class="form-select" style="width: auto; padding: 0.45rem 0.85rem;" onchange="window.usersPage.onStatusChange(this.value)">
                  <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>Todos los estados</option>
                  <option value="active" ${currentStatus === 'active' ? 'selected' : ''}>Activos</option>
                  <option value="suspended" ${currentStatus === 'suspended' ? 'selected' : ''}>Suspendidos</option>
                </select>
              </div>
            </div>

            <!-- Bulk actions banner if items are selected -->
            ${selectedUserIds.size > 0 ? `
              <div style="margin-top: 1rem; padding: 0.65rem 0.85rem; background: var(--primary-light); border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.85rem; color: var(--primary); font-weight: 600;">
                  ${selectedUserIds.size} usuario(s) seleccionado(s)
                </span>
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-secondary btn-sm" onclick="window.usersPage.bulkSuspend()">Alternar Estado</button>
                  <button class="btn btn-danger btn-sm" onclick="window.usersPage.bulkDelete()">Eliminar Seleccionados</button>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Users Table -->
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 38px;">
                    <input type="checkbox" class="form-checkbox"
                           ${selectedUserIds.size === paginatedUsers.length && paginatedUsers.length > 0 ? 'checked' : ''}
                           onchange="window.usersPage.toggleSelectAll(this.checked)" />
                  </th>
                  <th>Usuario</th>
                  <th>Plataforma</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último Acceso</th>
                  <th style="text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${paginatedUsers.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem 1rem;">
                      <div style="color: var(--muted); font-size: 0.9rem;">No se encontraron usuarios con los filtros actuales.</div>
                    </td>
                  </tr>
                ` : paginatedUsers.map(u => this._renderUserRow(u)).join('')}
              </tbody>
            </table>

            <!-- Pagination Bar -->
            <div class="pagination">
              <div>Mostrando <strong>${paginatedUsers.length}</strong> de <strong>${totalUsers}</strong> usuarios</div>
              <div class="pagination-pages">
                <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="window.usersPage.setPage(${currentPage - 1})">
                  ← Ant
                </button>
                <span style="padding: 0 0.5rem; font-size: 0.85rem;">Página ${currentPage} de ${totalPages}</span>
                <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.usersPage.setPage(${currentPage + 1})">
                  Sig →
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    _renderUserRow: function (u) {
      const isSelected = selectedUserIds.has(u.id);
      const initials = `${(u.firstname || '').charAt(0)}${(u.lastname || '').charAt(0)}`.toUpperCase() || 'U';
      const roleBadge = this._getRoleBadge(u.role);
      const lastAccessStr = u.lastAccess ? new Date(u.lastAccess).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca';

      return `
        <tr style="${isSelected ? 'background: var(--bg-hover);' : ''}">
          <td>
            <input type="checkbox" class="form-checkbox" ${isSelected ? 'checked' : ''}
                   onchange="window.usersPage.toggleSelect('${u.id}')" />
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="avatar avatar-sm">${initials}</div>
              <div>
                <div style="font-weight: 600; color: var(--text);">
                  ${window.security.escapeHtml(u.firstname)} ${window.security.escapeHtml(u.lastname)}
                </div>
                <div style="font-size: 0.75rem; color: var(--muted);">${window.security.escapeHtml(u.email)}</div>
              </div>
            </div>
          </td>
          <td>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">${window.security.escapeHtml(u.platformName || 'Plataforma')}</span>
          </td>
          <td>${roleBadge}</td>
          <td>${window.widgets.statusBadge(u.status)}</td>
          <td style="font-size: 0.8rem; color: var(--muted);">${lastAccessStr}</td>
          <td style="text-align: right;">
            <div class="table-actions">
              <button class="btn btn-ghost btn-icon btn-sm" title="Restablecer Contraseña" onclick="window.usersPage.resetPassword('${u.id}', '${window.security.escapeHtml(u.firstname)}')">
                <i data-lucide="key" style="width: 15px; height: 15px;"></i>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm" title="Alternar Suspensión" onclick="window.usersPage.toggleSuspend('${u.id}')">
                <i data-lucide="${u.status === 'suspended' ? 'check-circle' : 'user-x'}" style="width: 15px; height: 15px; color: ${u.status === 'suspended' ? 'var(--success)' : 'var(--warning)'};"></i>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm" title="Editar Usuario" onclick="window.usersPage.openEditModal('${u.id}')">
                <i data-lucide="edit-3" style="width: 15px; height: 15px;"></i>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm" title="Eliminar Usuario" style="color: var(--danger);" onclick="window.usersPage.deleteUser('${u.id}', '${window.security.escapeHtml(u.username)}')">
                <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    },

    _getRoleBadge: function (role) {
      switch (role) {
        case 'admin':
          return '<span class="badge badge-danger">Administrador</span>';
        case 'editingteacher':
          return '<span class="badge badge-info">Profesor Titular</span>';
        case 'teacher':
          return '<span class="badge badge-warning">Profesor Adjunto</span>';
        case 'student':
        default:
          return '<span class="badge badge-neutral">Estudiante</span>';
      }
    },

    onSearchInput: function (val) {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        searchQuery = val;
        currentPage = 1;
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }, 250);
    },

    onPlatformChange: function (val) {
      currentPlatform = val;
      currentPage = 1;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    onRoleChange: function (val) {
      currentRole = val;
      currentPage = 1;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    onStatusChange: function (val) {
      currentStatus = val;
      currentPage = 1;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    setPage: function (p) {
      currentPage = p;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    toggleSelect: function (id) {
      if (selectedUserIds.has(id)) {
        selectedUserIds.delete(id);
      } else {
        selectedUserIds.add(id);
      }
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    toggleSelectAll: function (checked) {
      const state = window.store.getState();
      if (checked) {
        state.users.forEach(u => selectedUserIds.add(u.id));
      } else {
        selectedUserIds.clear();
      }
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    openCreateModal: function () {
      const state = window.store.getState();
      const content = `
        <form id="create-user-form" onsubmit="event.preventDefault(); window.usersPage.handleCreateSubmit();">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Nombre(s)</label>
              <input type="text" class="form-input" id="user-fname" placeholder="Ej: Ana" required />
            </div>
            <div class="form-group">
              <label class="form-label required">Apellidos</label>
              <input type="text" class="form-input" id="user-lname" placeholder="Ej: Soto" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label required">Nombre de Usuario Moodle</label>
            <input type="text" class="form-input" id="user-uname" placeholder="Ej: a.soto" required />
          </div>
          <div class="form-group">
            <label class="form-label required">Correo Electrónico Institucional</label>
            <input type="email" class="form-input" id="user-email" placeholder="ana.soto@universidad.edu" required />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Plataforma Asignada</label>
              <select class="form-select" id="user-plat">
                ${state.platforms.map(p => `
                  <option value="${p.id}">${window.security.escapeHtml(p.name)}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Rol en Plataforma</label>
              <select class="form-select" id="user-role">
                <option value="student">Estudiante</option>
                <option value="editingteacher">Profesor Titular</option>
                <option value="teacher">Profesor Adjunto</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('create-user-form').requestSubmit()">Crear Usuario</button>
      `;

      window.modal.open({
        title: 'Crear Usuario en Moodle',
        content,
        footer
      });
    },

    handleCreateSubmit: async function () {
      const firstname = document.getElementById('user-fname').value.trim();
      const lastname = document.getElementById('user-lname').value.trim();
      const username = document.getElementById('user-uname').value.trim();
      const email = document.getElementById('user-email').value.trim();
      const platform_id = document.getElementById('user-plat').value;
      const role = document.getElementById('user-role').value;

      if (!firstname || !lastname || !username || !email) {
        if (window.toast) window.toast.warning('Completa todos los campos obligatorios');
        return;
      }

      if (window.security && !window.security.isValidEmail(email)) {
        if (window.toast) window.toast.error('El formato de correo no es válido');
        return;
      }

      const res = await window.api.request('createUser', { firstname, lastname, username, email, platform_id, role });
      if (res.success) {
        if (window.toast) window.toast.success('Usuario matriculado y creado en el sistema');
        window.modal.close();
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    },

    openEditModal: function (id) {
      const state = window.store.getState();
      const u = state.users.find(item => item.id === id);
      if (!u) return;

      const content = `
        <form id="edit-user-form" onsubmit="event.preventDefault(); window.usersPage.handleEditSubmit('${id}');">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Nombre</label>
              <input type="text" class="form-input" id="edit-user-fname" value="${window.security.escapeHtml(u.firstname)}" required />
            </div>
            <div class="form-group">
              <label class="form-label required">Apellidos</label>
              <input type="text" class="form-input" id="edit-user-lname" value="${window.security.escapeHtml(u.lastname)}" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label required">Correo Electrónico</label>
            <input type="email" class="form-input" id="edit-user-email" value="${window.security.escapeHtml(u.email)}" required />
          </div>
          <div class="form-group">
            <label class="form-label required">Rol</label>
            <select class="form-select" id="edit-user-role">
              <option value="student" ${u.role === 'student' ? 'selected' : ''}>Estudiante</option>
              <option value="editingteacher" ${u.role === 'editingteacher' ? 'selected' : ''}>Profesor Titular</option>
              <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>Profesor Adjunto</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
            </select>
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('edit-user-form').requestSubmit()">Guardar Cambios</button>
      `;

      window.modal.open({
        title: `Editar Usuario: ${u.username}`,
        content,
        footer
      });
    },

    handleEditSubmit: async function (id) {
      const firstname = document.getElementById('edit-user-fname').value.trim();
      const lastname = document.getElementById('edit-user-lname').value.trim();
      const email = document.getElementById('edit-user-email').value.trim();
      const role = document.getElementById('edit-user-role').value;

      const res = await window.api.request('updateUser', { id, firstname, lastname, email, role });
      if (res.success) {
        if (window.toast) window.toast.success('Información de usuario actualizada');
        window.modal.close();
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    },

    resetPassword: async function (id, firstname) {
      const res = await window.api.request('resetUserPassword', { id });
      if (res.success) {
        window.modal.open({
          title: 'Nueva Contraseña Temporal',
          content: `
            <p style="margin-bottom: 1rem; color: var(--text);">Se ha regenerado la clave de acceso para <strong>${firstname}</strong>. Proporciónala al usuario:</p>
            <div style="background: var(--bg-alt); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border); text-align: center; font-family: monospace; font-size: 1.25rem; font-weight: 700; color: var(--primary);">
              ${res.data.password}
            </div>
            <p style="margin-top: 1rem; font-size: 0.8rem; color: var(--muted);">El usuario deberá cambiar esta clave en su próximo inicio de sesión en Moodle.</p>
          `,
          footer: '<button class="btn btn-primary" onclick="window.modal.close()">Entendido</button>'
        });
      }
    },

    toggleSuspend: async function (id) {
      const res = await window.api.request('suspendUser', { id });
      if (res.success) {
        if (window.toast) window.toast.success('Estado del usuario actualizado');
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    },

    deleteUser: function (id, username) {
      window.modal.confirm({
        title: 'Eliminar Usuario',
        message: `¿Estás seguro de que deseas eliminar permanentemente la cuenta "${username}" de Moodle?`,
        confirmText: 'Eliminar Cuenta',
        type: 'danger',
        onConfirm: async () => {
          const res = await window.api.request('deleteUser', { id });
          if (res.success) {
            if (window.toast) window.toast.success('Usuario eliminado');
            selectedUserIds.delete(id);
            this.render(document.getElementById('page-container'));
            if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
          }
        }
      });
    },

    bulkSuspend: async function () {
      for (const id of selectedUserIds) {
        await window.api.request('suspendUser', { id });
      }
      if (window.toast) window.toast.success('Estados de usuarios modificados');
      selectedUserIds.clear();
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    bulkDelete: function () {
      window.modal.confirm({
        title: 'Eliminar Múltiples Cuentas',
        message: `¿Estás seguro de que deseas eliminar ${selectedUserIds.size} usuarios seleccionados?`,
        confirmText: 'Eliminar en Lote',
        type: 'danger',
        onConfirm: async () => {
          for (const id of selectedUserIds) {
            await window.api.request('deleteUser', { id });
          }
          if (window.toast) window.toast.success('Usuarios eliminados');
          selectedUserIds.clear();
          this.render(document.getElementById('page-container'));
          if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
        }
      });
    },

    exportCSV: function () {
      const users = window.store.getState().users;
      let csv = 'ID,Username,Firstname,Lastname,Email,Role,Status,Platform\n';
      users.forEach(u => {
        csv += `"${u.id}","${u.username}","${u.firstname}","${u.lastname}","${u.email}","${u.role}","${u.status}","${u.platformName}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `moodlify_users_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (window.toast) window.toast.success('Archivo CSV exportado correctamente');
    },

    openImportModal: function () {
      const content = `
        <div class="form-group">
          <label class="form-label required">Selecciona archivo CSV</label>
          <input type="file" id="import-csv-file" accept=".csv" class="form-input" />
          <span class="form-helper">El archivo debe contener cabeceras: username, firstname, lastname, email, role</span>
        </div>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="window.usersPage.handleImportCSV()">Cargar e Importar</button>
      `;

      window.modal.open({
        title: 'Importación Masiva de Usuarios CSV',
        content,
        footer
      });
    },

    handleImportCSV: function () {
      const fileInput = document.getElementById('import-csv-file');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        if (window.toast) window.toast.warning('Por favor selecciona un archivo CSV');
        return;
      }

      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        let createdCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(s => s.replace(/(^"|"$)/g, '').trim());
          if (parts.length >= 4) {
            await window.api.request('createUser', {
              username: parts[0] || 'user_' + i,
              firstname: parts[1] || 'Usuario',
              lastname: parts[2] || 'Importado',
              email: parts[3] || 'correo@ejemplo.edu',
              role: parts[4] || 'student'
            });
            createdCount++;
          }
        }

        if (window.toast) window.toast.success(`${createdCount} usuarios importados con éxito`);
        window.modal.close();
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      };

      reader.readAsText(file);
    }
  };

  window.usersPage = usersPage;
})();

