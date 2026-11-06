/**
 * ==============================================================================
 * MOODLIFY - COURSES CATALOG PAGE (js/pages/courses.js)
 * Course Directory with Gradient Headers, Category and Platform Filters,
 * Enrollment Modals, CRUD operations & Student Counters
 * ==============================================================================
 */

(function () {
  'use strict';

  let currentPlatform = 'all';
  let currentCategory = 'all';
  let currentStatus = 'all';
  let searchQuery = '';

  const coursesPage = {
    render: async function (container) {
      const state = window.store.getState();
      let courses = [...state.courses];

      if (currentPlatform !== 'all') {
        courses = courses.filter(c => c.platformId === currentPlatform);
      }
      if (currentCategory !== 'all') {
        courses = courses.filter(c => c.categoryId === currentCategory);
      }
      if (currentStatus !== 'all') {
        courses = courses.filter(c => c.status === currentStatus);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        courses = courses.filter(c =>
          c.fullname.toLowerCase().includes(q) ||
          c.shortname.toLowerCase().includes(q) ||
          (c.summary && c.summary.toLowerCase().includes(q))
        );
      }

      container.innerHTML = `
        <div class="animate-fade-in">
          <!-- Page Header -->
          <div class="page-header">
            <div>
              <h1 class="page-title">Catálogo de Cursos</h1>
              <p class="page-subtitle">Aulas virtuales, asignaturas y programas formativos en Moodle</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-primary" onclick="window.coursesPage.openCreateModal()">
                <i data-lucide="plus"></i> Crear Nuevo Curso
              </button>
            </div>
          </div>

          <!-- Filter Toolbar -->
          <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.25rem;">
            <div style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
              <div class="input-icon-wrapper" style="max-width: 320px; width: 100%;">
                <i data-lucide="search"></i>
                <input type="text" class="form-input" placeholder="Buscar por título, código corto o descripción..."
                       value="${window.security.escapeHtml(searchQuery)}"
                       oninput="window.coursesPage.onSearchInput(this.value)" />
              </div>

              <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                <select class="form-select" style="width: auto; padding: 0.45rem 0.85rem;" onchange="window.coursesPage.onPlatformChange(this.value)">
                  <option value="all" ${currentPlatform === 'all' ? 'selected' : ''}>Todas las plataformas</option>
                  ${state.platforms.map(p => `
                    <option value="${p.id}" ${currentPlatform === p.id ? 'selected' : ''}>${window.security.escapeHtml(p.name)}</option>
                  `).join('')}
                </select>

                <select class="form-select" style="width: auto; padding: 0.45rem 0.85rem;" onchange="window.coursesPage.onStatusChange(this.value)">
                  <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>Todos los estados</option>
                  <option value="active" ${currentStatus === 'active' ? 'selected' : ''}>Activos</option>
                  <option value="draft" ${currentStatus === 'draft' ? 'selected' : ''}>Borradores</option>
                  <option value="archived" ${currentStatus === 'archived' ? 'selected' : ''}>Archivados</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Courses Cards Grid -->
          ${courses.length === 0 ? window.widgets.emptyState({
            title: 'No se encontraron cursos',
            description: 'No hay cursos que coincidan con los filtros seleccionados.',
            actionButton: { label: 'Crear Curso', onClick: 'window.coursesPage.openCreateModal()' }
          }) : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem;">
              ${courses.map(c => this._renderCourseCard(c)).join('')}
            </div>
          `}
        </div>
      `;
    },

    _renderCourseCard: function (c) {
      return `
        <div class="card animate-fade-in" style="display: flex; flex-direction: column;">
          <!-- Gradient Top Banner -->
          <div style="height: 100px; background: ${c.gradient || 'linear-gradient(135deg, #2563eb, #3b82f6)'}; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: flex-start; color: #ffffff;">
            <span style="font-size: 0.75rem; font-weight: 700; background: rgba(0,0,0,0.25); padding: 0.2rem 0.55rem; border-radius: 6px; letter-spacing: 0.05em;">
              ${window.security.escapeHtml(c.shortname)}
            </span>
            ${window.widgets.statusBadge(c.status)}
          </div>

          <div class="card-body" style="flex: 1; display: flex; flex-direction: column; gap: 0.75rem;">
            <div>
              <span style="font-size: 0.725rem; font-weight: 600; text-transform: uppercase; color: var(--primary);">
                ${window.security.escapeHtml(c.categoryName || 'General')}
              </span>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text); margin-top: 0.2rem; line-height: 1.35;">
                ${window.security.escapeHtml(c.fullname)}
              </h3>
            </div>

            <p style="font-size: 0.8rem; color: var(--muted); margin: 0; line-height: 1.4; flex: 1;">
              ${window.security.escapeHtml(c.summary || 'Sin descripción disponible.')}
            </p>

            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.75rem; border-top: 1px solid var(--border); font-size: 0.8rem; color: var(--muted);">
              <span><i data-lucide="users" style="width: 14px; height: 14px; vertical-align: middle;"></i> <strong>${c.studentsCount}</strong> alumnos</span>
              <span><i data-lucide="calendar" style="width: 14px; height: 14px; vertical-align: middle;"></i> Inicio: ${c.startDate || 'Inmediato'}</span>
            </div>
          </div>

          <div class="card-footer" style="gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.coursesPage.openEnrollModal('${c.id}')">
              <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i> Matricular
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.coursesPage.openEditModal('${c.id}')">
              <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Editar
            </button>
            <button class="btn btn-ghost btn-sm" style="color: var(--danger); margin-left: auto;" onclick="window.coursesPage.deleteCourse('${c.id}', '${window.security.escapeHtml(c.shortname)}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </div>
      `;
    },

    onSearchInput: function (val) {
      searchQuery = val;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    onPlatformChange: function (val) {
      currentPlatform = val;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    onStatusChange: function (val) {
      currentStatus = val;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    openCreateModal: function () {
      const state = window.store.getState();
      const content = `
        <form id="create-course-form" onsubmit="event.preventDefault(); window.coursesPage.handleCreateSubmit();">
          <div class="form-group">
            <label class="form-label required">Nombre Completo del Curso</label>
            <input type="text" class="form-input" id="crs-fullname" placeholder="Ej: Fundamentos de Inteligencia Artificial" required />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Código Corto (Shortname)</label>
              <input type="text" class="form-input" id="crs-shortname" placeholder="Ej: IA-101" required />
            </div>
            <div class="form-group">
              <label class="form-label required">Plataforma Moodle</label>
              <select class="form-select" id="crs-platform">
                ${state.platforms.map(p => `
                  <option value="${p.id}">${window.security.escapeHtml(p.name)}</option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción o Resumen del Curso</label>
            <textarea class="form-textarea" id="crs-summary" rows="3" placeholder="Objetivos y contenidos principales del aula virtual..."></textarea>
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('create-course-form').requestSubmit()">Crear Curso</button>
      `;

      window.modal.open({
        title: 'Crear Curso en Moodle',
        content,
        footer
      });
    },

    handleCreateSubmit: async function () {
      const fullname = document.getElementById('crs-fullname').value.trim();
      const shortname = document.getElementById('crs-shortname').value.trim();
      const platform_id = document.getElementById('crs-platform').value;
      const summary = document.getElementById('crs-summary').value.trim();

      if (!fullname || !shortname) {
        if (window.toast) window.toast.warning('Por favor completa los campos requeridos');
        return;
      }

      const res = await window.api.request('createCourse', { fullname, shortname, platform_id, summary });
      if (res.success) {
        if (window.toast) window.toast.success('Curso creado y publicado');
        window.modal.close();
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    },

    openEditModal: function (id) {
      const state = window.store.getState();
      const c = state.courses.find(item => item.id === id);
      if (!c) return;

      const content = `
        <form id="edit-course-form" onsubmit="event.preventDefault(); window.coursesPage.handleEditSubmit('${id}');">
          <div class="form-group">
            <label class="form-label required">Nombre Completo</label>
            <input type="text" class="form-input" id="edit-crs-fullname" value="${window.security.escapeHtml(c.fullname)}" required />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Código Corto</label>
              <input type="text" class="form-input" id="edit-crs-shortname" value="${window.security.escapeHtml(c.shortname)}" required />
            </div>
            <div class="form-group">
              <label class="form-label required">Estado</label>
              <select class="form-select" id="edit-crs-status">
                <option value="active" ${c.status === 'active' ? 'selected' : ''}>Activo</option>
                <option value="draft" ${c.status === 'draft' ? 'selected' : ''}>Borrador</option>
                <option value="archived" ${c.status === 'archived' ? 'selected' : ''}>Archivado</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea class="form-textarea" id="edit-crs-summary" rows="3">${window.security.escapeHtml(c.summary || '')}</textarea>
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('edit-course-form').requestSubmit()">Guardar Cambios</button>
      `;

      window.modal.open({
        title: `Editar Curso: ${c.shortname}`,
        content,
        footer
      });
    },

    handleEditSubmit: async function (id) {
      const fullname = document.getElementById('edit-crs-fullname').value.trim();
      const shortname = document.getElementById('edit-crs-shortname').value.trim();
      const status = document.getElementById('edit-crs-status').value;
      const summary = document.getElementById('edit-crs-summary').value.trim();

      const state = window.store.getState();
      const updated = state.courses.map(c => c.id === id ? { ...c, fullname, shortname, status, summary } : c);
      window.store.setState({ courses: updated });

      if (window.toast) window.toast.success('Curso actualizado');
      window.modal.close();
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    openEnrollModal: function (courseId) {
      const state = window.store.getState();
      const course = state.courses.find(c => c.id === courseId);
      if (!course) return;

      const content = `
        <div style="margin-bottom: 1rem;">
          <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1rem;">
            Matricular alumnos al curso: <strong>${window.security.escapeHtml(course.fullname)}</strong>
          </p>
          <div class="form-group">
            <label class="form-label required">Selecciona Alumnos</label>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem;">
              ${state.users.filter(u => u.status === 'active').map(u => `
                <label class="form-checkbox-label" style="padding: 0.35rem 0.5rem; border-radius: 6px; display: flex; align-items: center; gap: 0.5rem;">
                  <input type="checkbox" class="form-checkbox enroll-user-checkbox" value="${u.id}" />
                  <span>${window.security.escapeHtml(u.firstname)} ${window.security.escapeHtml(u.lastname)} (${window.security.escapeHtml(u.email)})</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label required">Rol en el Curso</label>
            <select class="form-select" id="enroll-role-select">
              <option value="student">Estudiante</option>
              <option value="teacher">Profesor Adjunto</option>
              <option value="editingteacher">Profesor Titular</option>
            </select>
          </div>
        </div>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="window.coursesPage.handleEnrollSubmit('${courseId}')">Matricular Seleccionados</button>
      `;

      window.modal.open({
        title: 'Matricular Usuarios en Moodle',
        content,
        footer
      });
    },

    handleEnrollSubmit: async function (courseId) {
      const checkboxes = document.querySelectorAll('.enroll-user-checkbox:checked');
      const userIds = Array.from(checkboxes).map(cb => cb.value);
      const roleId = document.getElementById('enroll-role-select').value;

      if (userIds.length === 0) {
        if (window.toast) window.toast.warning('Selecciona al menos un alumno para matricular');
        return;
      }

      const res = await window.api.request('enrollUsers', {
        course_id: courseId,
        user_ids: userIds,
        role_id: roleId
      });

      if (res.success) {
        if (window.toast) window.toast.success(res.message);
        window.modal.close();
        this.render(document.getElementById('page-container'));
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    },

    deleteCourse: function (id, shortname) {
      window.modal.confirm({
        title: 'Eliminar Curso',
        message: `¿Estás seguro de que deseas eliminar el curso "${shortname}"? Los datos de progreso de los alumnos podrían archivarse.`,
        confirmText: 'Eliminar Curso',
        type: 'danger',
        onConfirm: async () => {
          const res = await window.api.request('deleteCourse', { id });
          if (res.success) {
            if (window.toast) window.toast.success('Curso eliminado');
            this.render(document.getElementById('page-container'));
            if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
          }
        }
      });
    }
  };

  window.coursesPage = coursesPage;
})();

