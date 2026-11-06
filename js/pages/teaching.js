/**
 * ==============================================================================
 * MOODLIFY - DATA DOCENTE (js/pages/teaching.js)
 * Base de datos de docencia: qué cursos imparte/impartió cada docente por ciclo
 * académico y recinto/plataforma. CRUD, filtros y KPIs para reportes.
 * ==============================================================================
 */
(function () {
  'use strict';

  let filterTeacher = 'all';
  let filterCycle = 'all';
  let filterPlatform = 'all';
  let filterStatus = 'all';
  let filterCategory = 'all';
  let searchQuery = '';

  let currentPage = 1;
  const pageSize = 10;

  const teachingPage = {
    render: async function (container) {
      const state = window.store.getState();
      const assignments = state.teachingAssignments || [];
      const teachers = this._getTeachers(state);
      const cycles = [...new Set(assignments.map(a => a.cicloAcademico))].sort().reverse();
      const categories = [...new Set((state.courses || []).map(c => c.categoryName || 'General'))].sort();

      const filtered = this._applyFilters(assignments);

      const total = filtered.length;
      const totalPages = Math.ceil(total / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      const startIndex = (currentPage - 1) * pageSize;
      const paginated = filtered.slice(startIndex, startIndex + pageSize);

      const uniqueTeachers = new Set(assignments.map(a => a.teacherId)).size;
      const teachingNow = assignments.filter(a => a.status === 'impartiendo').length;
      const cyclesCount = cycles.length;
      const distinctCourses = new Set(assignments.map(a => a.courseId)).size;

      container.innerHTML = `
        <div class="animate-fade-in">
          <div class="page-header">
            <div>
              <h1 class="page-title">Data Docente</h1>
              <p class="page-subtitle">Base de datos de docencia: cursos impartidos e impartidos por docente, ciclo y recinto</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-secondary" onclick="window.router.navigate('#reports')">
                <i data-lucide="bar-chart-3"></i> Ir a Reportes Docentes
              </button>
              <button class="btn btn-primary" onclick="window.teachingPage.openAssignmentModal()">
                <i data-lucide="plus"></i> Nueva Asignación Docente
              </button>
            </div>
          </div>

          <div class="metrics-grid">
            ${window.widgets.metricCard({ label: 'Asignaciones Totales', value: assignments.length, trend: { value: fClassTeach(assignments), isPositive: true }, subtext: 'registros de docencia', icon: '<i data-lucide="database"></i>', colorClass: 'primary' })}
            ${window.widgets.metricCard({ label: 'Docentes con Carga', value: uniqueTeachers, trend: null, subtext: `${teachers.length} docente(s) en directorio`, icon: '<i data-lucide="user-check"></i>', colorClass: 'success' })}
            ${window.widgets.metricCard({ label: 'Impartiendo Ahora', value: teachingNow, trend: { value: 'ciclo activo', isPositive: true }, subtext: `${distinctCourses} curso(s) con docente`, icon: '<i data-lucide="graduation-cap"></i>', colorClass: 'info' })}
            ${window.widgets.metricCard({ label: 'Ciclos Académicos', value: cyclesCount, trend: null, subtext: cycles.length ? cycles.join(', ') : 'sin ciclos', icon: '<i data-lucide="calendar"></i>', colorClass: 'warning' })}
          </div>

          <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.25rem;">
            <div style="display: flex; gap: 0.75rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
              <div class="input-icon-wrapper" style="max-width: 300px; width: 100%;">
                <i data-lucide="search"></i>
                <input type="text" class="form-input" placeholder="Buscar docente o curso..."
                       value="${window.security.escapeHtml(searchQuery)}"
                       oninput="window.teachingPage.onSearchInput(this.value)" />
              </div>
              <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
                <select class="form-select" style="width:auto;" onchange="window.teachingPage.onFilter('teacher', this.value)">
                  <option value="all" ${filterTeacher === 'all' ? 'selected' : ''}>Todos los docentes</option>
                  ${teachers.map(t => `<option value="${t.id}" ${filterTeacher === t.id ? 'selected' : ''}>${window.security.escapeHtml(t.firstname + ' ' + t.lastname)}</option>`).join('')}
                </select>
                <select class="form-select" style="width:auto;" onchange="window.teachingPage.onFilter('cycle', this.value)">
                  <option value="all" ${filterCycle === 'all' ? 'selected' : ''}>Todos los ciclos</option>
                  ${cycles.map(cy => `<option value="${window.security.escapeHtml(cy)}" ${filterCycle === cy ? 'selected' : ''}>${window.security.escapeHtml(cy)}</option>`).join('')}
                </select>
                <select class="form-select" style="width:auto;" onchange="window.teachingPage.onFilter('platform', this.value)">
                  <option value="all" ${filterPlatform === 'all' ? 'selected' : ''}>Todos los recintos</option>
                  ${state.platforms.map(p => `<option value="${p.id}" ${filterPlatform === p.id ? 'selected' : ''}>${window.security.escapeHtml(p.name)}</option>`).join('')}
                </select>
                <select class="form-select" style="width:auto;" onchange="window.teachingPage.onFilter('category', this.value)">
                  <option value="all" ${filterCategory === 'all' ? 'selected' : ''}>Todas las categorías</option>
                  ${categories.map(cat => `<option value="${window.security.escapeHtml(cat)}" ${filterCategory === cat ? 'selected' : ''}>${window.security.escapeHtml(cat)}</option>`).join('')}
                </select>
                <select class="form-select" style="width:auto;" onchange="window.teachingPage.onFilter('status', this.value)">
                  <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>Todos los estados</option>
                  <option value="impartiendo" ${filterStatus === 'impartiendo' ? 'selected' : ''}>Impartiendo</option>
                  <option value="completado" ${filterStatus === 'completado' ? 'selected' : ''}>Completado</option>
                  <option value="programado" ${filterStatus === 'programado' ? 'selected' : ''}>Programado</option>
                </select>
                ${(filterTeacher !== 'all' || filterCycle !== 'all' || filterPlatform !== 'all' || filterStatus !== 'all' || filterCategory !== 'all' || searchQuery) ? `
                  <button class="btn btn-ghost btn-sm" onclick="window.teachingPage.resetFilters()"><i data-lucide="x"></i> Limpiar</button>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Docente</th>
                    <th>Curso</th>
                    <th>Ciclo Académico</th>
                    <th>Recinto / Plataforma</th>
                    <th>Categoría</th>
                    <th>Estado</th>
                    <th style="text-align:right;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${paginated.length === 0 ? `
                    <tr><td colspan="7" style="text-align:center; padding:2.5rem;">
                      ${window.widgets.emptyState({ icon: '<i data-lucide="graduation-cap"></i>', title: 'Sin asignaciones', description: 'Crea la primera asignación docente para este docente/curso/ciclo.' })}
                    </td></tr>
                  ` : paginated.map(a => `
                    <tr>
                      <td>
                        <div style="font-weight:700; color:var(--text);">${window.security.escapeHtml(a.teacherName || 'Docente')}</div>
                        <div style="font-size:0.75rem; color:var(--muted);">${a.teacherId ? window.security.escapeHtml(a.teacherId) : ''} · ${window.security.escapeHtml(a.role || '')}</div>
                      </td>
                      <td>
                        <div style="font-weight:600;">${window.security.escapeHtml(a.courseName || 'Curso')}</div>
                        <div style="font-size:0.75rem; color:var(--primary);">${window.security.escapeHtml(a.shortname || '')}</div>
                      </td>
                      <td><span class="badge badge-info">${window.security.escapeHtml(a.cicloAcademico || '—')}</span>
                        <div style="font-size:0.72rem; color:var(--muted); margin-top:2px;">${window.security.escapeHtml(a.startDate || '')} → ${window.security.escapeHtml(a.endDate || '')}</div>
                      </td>
                      <td><span class="badge badge-secondary" style="font-size:0.75rem;">${window.security.escapeHtml(a.platformName || '—')}</span></td>
                      <td style="font-size:0.8125rem; color:var(--muted);">${window.security.escapeHtml(a.categoryName || 'General')}</td>
                      <td>${statusBadgeTeaching(a.status)}</td>
                      <td style="text-align:right; white-space:nowrap;">
                        <button class="btn btn-secondary btn-sm" onclick="window.teachingPage.openAssignmentModal('${a.id}')">Editar</button>
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="window.teachingPage.deleteAssignment('${a.id}')" title="Eliminar"><i data-lucide="trash-2" style="width:15px; height:15px; color:var(--danger);"></i></button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem 1.25rem; border-top:1px solid var(--border); font-size:0.8125rem; color:var(--muted);">
              <div>Mostrando ${total === 0 ? 0 : startIndex + 1} - ${Math.min(startIndex + pageSize, total)} de ${total}</div>
              <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-secondary btn-sm" ${currentPage <= 1 ? 'disabled' : ''} onclick="window.teachingPage.setPage(${currentPage - 1})">Anterior</button>
                <button class="btn btn-secondary btn-sm" ${currentPage >= totalPages ? 'disabled' : ''} onclick="window.teachingPage.setPage(${currentPage + 1})">Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      `;

      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();

      function fClassTeach(list) {
        const c = new Set(list.map(a => a.cicloAcademico)).size;
        return c + ' ciclo(s)';
      }
      function statusBadgeTeaching(s) {
        if (s === 'impartiendo') return '<span class="badge badge-success"><span class="badge-dot pulse"></span> Impartiendo</span>';
        if (s === 'completado') return '<span class="badge badge-neutral">Completado</span>';
        if (s === 'programado') return '<span class="badge badge-primary"><span class="badge-dot"></span> Programado</span>';
        return '<span class="badge badge-neutral">' + window.security.escapeHtml(s || '—') + '</span>';
      }
    },

    _getTeachers: function (state) {
      return (state.users || []).filter(u => ['editingteacher', 'teacher'].includes(u.role));
    },

    _applyFilters: function (assignments) {
      let list = [...assignments];
      if (filterTeacher !== 'all') list = list.filter(a => a.teacherId === filterTeacher);
      if (filterCycle !== 'all') list = list.filter(a => a.cicloAcademico === filterCycle);
      if (filterPlatform !== 'all') list = list.filter(a => a.platformId === filterPlatform);
      if (filterStatus !== 'all') list = list.filter(a => a.status === filterStatus);
      if (filterCategory !== 'all') list = list.filter(a => (a.categoryName || 'General') === filterCategory);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter(a =>
          (a.teacherName || '').toLowerCase().includes(q) ||
          (a.courseName || '').toLowerCase().includes(q) ||
          (a.shortname || '').toLowerCase().includes(q) ||
          (a.cicloAcademico || '').toLowerCase().includes(q)
        );
      }
      return list;
    },

    onSearchInput: function (val) {
      searchQuery = val;
      currentPage = 1;
      this.render(document.getElementById('page-container'));
      const input = document.querySelector('.input-icon-wrapper .form-input');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    },

    onFilter: function (key, val) {
      if (key === 'teacher') filterTeacher = val;
      if (key === 'cycle') filterCycle = val;
      if (key === 'platform') filterPlatform = val;
      if (key === 'status') filterStatus = val;
      if (key === 'category') filterCategory = val;
      currentPage = 1;
      this.render(document.getElementById('page-container'));
    },

    resetFilters: function () {
      filterTeacher = 'all'; filterCycle = 'all'; filterPlatform = 'all';
      filterStatus = 'all'; filterCategory = 'all'; searchQuery = '';
      currentPage = 1;
      this.render(document.getElementById('page-container'));
    },

    setPage: function (p) {
      currentPage = p;
      this.render(document.getElementById('page-container'));
    },

    openAssignmentModal: function (assignmentId) {
      const state = window.store.getState();
      const teachers = this._getTeachers(state);
      const existing = assignmentId ? (state.teachingAssignments || []).find(a => a.id === assignmentId) : null;
      const cycles = [...new Set((state.teachingAssignments || []).map(a => a.cicloAcademico))].sort().reverse();

      const defaultCycle = existing?.cicloAcademico || this._suggestCycle();
      const content = `
        <form id="teaching-form" onsubmit="event.preventDefault(); window.teachingPage.handleSubmit('${assignmentId || ''}');">
          <div class="form-group">
            <label class="form-label required">Docente</label>
            <select class="form-select" id="teach-teacher" required>
              ${teachers.map(t => `<option value="${t.id}" ${existing && existing.teacherId === t.id ? 'selected' : ''}>${window.security.escapeHtml(t.firstname + ' ' + t.lastname)} (${window.security.escapeHtml(t.role)})</option>`).join('')}
            </select>
            <span class="form-helper">Solo docentes del directorio (editingteacher / teacher).</span>
          </div>
          <div class="form-group">
            <label class="form-label required">Curso</label>
            <select class="form-select" id="teach-course" required>
              ${state.courses.map(c => `<option value="${c.id}" ${existing && existing.courseId === c.id ? 'selected' : ''}>${window.security.escapeHtml(c.fullname)} (${window.security.escapeHtml(c.shortname)}) — ${window.security.escapeHtml(c.platformName)}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div class="form-group">
              <label class="form-label required">Ciclo Académico</label>
              <input type="text" class="form-input" id="teach-cycle" list="teach-cycles-list" value="${window.security.escapeHtml(defaultCycle)}" placeholder="Ej: 2026-I" required />
              <datalist id="teach-cycles-list">${cycles.map(cy => `<option value="${window.security.escapeHtml(cy)}">`).join('')}<option value="2026-I"></option><option value="2026-II"></option><option value="2025-I"></option><option value="2025-II"></option></datalist>
            </div>
            <div class="form-group">
              <label class="form-label required">Estado</label>
              <select class="form-select" id="teach-status">
                <option value="impartiendo" ${existing && existing.status === 'impartiendo' ? 'selected' : (!existing ? 'selected' : '')}>Impartiendo</option>
                <option value="completado" ${existing && existing.status === 'completado' ? 'selected' : ''}>Completado</option>
                <option value="programado" ${existing && existing.status === 'programado' ? 'selected' : ''}>Programado</option>
              </select>
            </div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div class="form-group">
              <label class="form-label">Fecha inicio</label>
              <input type="date" class="form-input" id="teach-start" value="${existing?.startDate || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Fecha fin</label>
              <input type="date" class="form-input" id="teach-end" value="${existing?.endDate || ''}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Rol docente en el curso</label>
            <select class="form-select" id="teach-role">
              <option value="editingteacher" ${existing && existing.role === 'editingteacher' ? 'selected' : ''}>Titular (editingteacher)</option>
              <option value="teacher" ${existing && existing.role === 'teacher' ? 'selected' : ''}>Asistente (teacher)</option>
            </select>
          </div>
          <div style="font-size:0.8125rem; color:var(--muted); padding:0.75rem; background:var(--bg-alt); border:1px solid var(--border); border-radius:8px;">
            El <strong>recinto/plataforma</strong> y la <strong>categoría</strong> se heredan automáticamente del curso seleccionado.
          </div>
        </form>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('teaching-form').requestSubmit()">${existing ? 'Guardar cambios' : 'Crear asignación'}</button>
      `;
      window.modal.open({
        title: existing ? 'Editar asignación docente' : 'Nueva asignación docente',
        content, footer
      });
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    _suggestCycle: function () {
      const y = new Date().getFullYear();
      const m = new Date().getMonth() + 1;
      return `${y}-${m <= 6 ? 'I' : 'II'}`;
    },

    handleSubmit: function (assignmentId) {
      const state = window.store.getState();
      const teacherId = document.getElementById('teach-teacher').value;
      const courseId = document.getElementById('teach-course').value;
      const cicloAcademico = document.getElementById('teach-cycle').value.trim();
      const status = document.getElementById('teach-status').value;
      const startDate = document.getElementById('teach-start').value || '';
      const endDate = document.getElementById('teach-end').value || '';
      const role = document.getElementById('teach-role').value;

      if (!teacherId || !courseId || !cicloAcademico) {
        if (window.toast) window.toast.warning('Docente, curso y ciclo son obligatorios');
        return;
      }

      const teacher = state.users.find(u => u.id === teacherId);
      const course = state.courses.find(c => c.id === courseId);
      if (!teacher || !course) {
        if (window.toast) window.toast.error('Docente o curso no encontrado');
        return;
      }

      // Evitar duplicado exacto (mismo docente + curso + ciclo, salvo edición del mismo registro)
      const dup = (state.teachingAssignments || []).find(a =>
        a.teacherId === teacherId && a.courseId === courseId && a.cicloAcademico === cicloAcademico && a.id !== assignmentId
      );
      if (dup) {
        if (window.toast) window.toast.warning(`Ya existe una asignación para ${teacher.firstname} en ${course.shortname} (${cicloAcademico}).`);
        return;
      }

      const base = {
        teacherId,
        teacherName: `${teacher.firstname} ${teacher.lastname}`.trim(),
        courseId: course.id,
        courseName: course.fullname,
        shortname: course.shortname,
        categoryName: course.categoryName || 'General',
        platformId: course.platformId,
        platformName: course.platformName,
        cicloAcademico,
        status,
        role,
        startDate,
        endDate
      };

      let updated;
      let actionLabel;
      if (assignmentId) {
        updated = (state.teachingAssignments || []).map(a => a.id === assignmentId ? { ...a, ...base } : a);
        actionLabel = 'TEACHING_UPDATE';
        if (window.toast) window.toast.success('Asignación actualizada');
      } else {
        const newItem = { id: 'teach-' + Date.now(), ...base };
        updated = [newItem, ...(state.teachingAssignments || [])];
        actionLabel = 'TEACHING_CREATE';
        if (window.toast) window.toast.success(`${teacherNameSafe(teacher)} ahora imparte ${course.shortname} en ${cicloAcademico}`);
      }

      function teacherNameSafe(t) { return `${t.firstname} ${t.lastname}`; }

      const updatedLogs = [{
        id: 'log-' + Date.now(),
        action: actionLabel,
        user: state.auth?.user?.name || 'Administrador',
        ip: '192.168.1.100',
        timestamp: new Date().toISOString(),
        details: `${base.teacherName} → ${course.shortname} (${cicloAcademico}, ${base.platformName}) — ${status}`
      }, ...state.auditLogs];

      window.store.setState({ teachingAssignments: updated, auditLogs: updatedLogs });
      window.modal.close();
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    deleteAssignment: function (id) {
      window.modal.confirm({
        title: 'Eliminar asignación docente',
        message: '¿Eliminar esta asignación? Esto afectará los reportes de docencia.',
        confirmText: 'Eliminar',
        type: 'danger',
        onConfirm: () => {
          const state = window.store.getState();
          window.store.setState({
            teachingAssignments: (state.teachingAssignments || []).filter(a => a.id !== id)
          });
          if (window.toast) window.toast.info('Asignación eliminada');
          this.render(document.getElementById('page-container'));
          if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
        }
      });
    }
  };

  window.teachingPage = teachingPage;
})();
