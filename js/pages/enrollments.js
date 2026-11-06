/**
 * ==============================================================================
 * MOODLIFY - ENROLLMENTS & SCHEDULED BATCHES PAGE (js/pages/enrollments.js)
 * Enrollment Tracking, Scheduled Batch Enrollment at Specific Times,
 * 4 KPIs, CSV Upload, User Selection & Automated Background Batch Processor
 * ==============================================================================
 */

(function () {
  'use strict';

  let currentTab = 'history'; // 'history' | 'batches'
  let currentPlatform = 'all';
  let currentMethod = 'all';
  let batchStatusFilter = 'all';
  let currentPage = 1;
  const pageSize = 10;
  const executingBatchIds = new Set();
  let bulkCsvParsed = null;
  let batchCsvParsed = null;

  const enrollmentsPage = {
    render: async function (container) {
      const state = window.store.getState();
      const batches = state.scheduledBatches || [];

      // Verificar si hay lotes cuya hora ya expiró para ejecutarlos automáticamente
      this.checkScheduledBatchesTrigger();

      container.innerHTML = `
        <div class="animate-fade-in">
          <!-- Page Header -->
          <div class="page-header">
            <div>
              <h1 class="page-title">Matrículas e Inscripciones</h1>
              <p class="page-subtitle">Historial de asignaciones, matriculación masiva y programación por lotes en horarios específicos</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-secondary" onclick="window.enrollmentsPage.openBulkModal()">
                <i data-lucide="upload-cloud"></i> Matrícula Rápida CSV
              </button>
              <button class="btn btn-primary" onclick="window.enrollmentsPage.openScheduleBatchModal()">
                <i data-lucide="calendar-clock"></i> Programar Matrícula por Lote
              </button>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div class="nav-tabs">
            <button class="nav-tab-btn ${currentTab === 'history' ? 'active' : ''}" onclick="window.enrollmentsPage.setTab('history')">
              <i data-lucide="history" style="width: 16px; height: 16px;"></i>
              <span>Historial de Matrículas</span>
              <span class="nav-tab-badge">${state.enrollments.length}</span>
            </button>
            <button class="nav-tab-btn ${currentTab === 'batches' ? 'active' : ''}" onclick="window.enrollmentsPage.setTab('batches')">
              <i data-lucide="layers" style="width: 16px; height: 16px;"></i>
              <span>Lotes Programados (Horarios Específicos)</span>
              <span class="nav-tab-badge">${batches.filter(b => b.status === 'scheduled').length} activos</span>
            </button>
          </div>

          <!-- Tab Content Display -->
          <div id="enrollments-tab-container">
            ${currentTab === 'history' ? this._renderHistoryTab(state) : this._renderBatchesTab(state, batches)}
          </div>
        </div>
      `;

      if (typeof window.lucide !== 'undefined') {
        window.lucide.createIcons();
      }
    },

    setTab: function (tab) {
      currentTab = tab;
      currentPage = 1;
      this.render(document.getElementById('page-container'));
    },

    /* ==========================================================================
       TAB 1: HISTORIAL DE MATRÍCULAS
       ========================================================================== */
    _renderHistoryTab: function (state) {
      let enrollments = [...state.enrollments];

      if (currentPlatform !== 'all') {
        enrollments = enrollments.filter(e => e.platformId === currentPlatform);
      }
      if (currentMethod !== 'all') {
        enrollments = enrollments.filter(e => e.method === currentMethod);
      }

      const total = enrollments.length;
      const totalPages = Math.ceil(total / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      const startIndex = (currentPage - 1) * pageSize;
      const paginated = enrollments.slice(startIndex, startIndex + pageSize);

      const successfulCount = state.enrollments.filter(e => e.status === 'active').length;
      const successRate = ((successfulCount / (state.enrollments.length || 1)) * 100).toFixed(1);

      return `
        <!-- 4 Enrollment KPIs -->
        <div class="metrics-grid">
          ${window.widgets.metricCard({
            label: 'Matrículas Hoy',
            value: '18',
            trend: { value: '+28%', isPositive: true },
            subtext: 'procesadas vía Moodle API',
            icon: '<i data-lucide="check-circle-2"></i>',
            colorClass: 'success'
          })}
          ${window.widgets.metricCard({
            label: 'Matrículas Acumuladas',
            value: state.enrollments.length,
            trend: { value: '+14.5%', isPositive: true },
            subtext: 'en todas las instancias',
            icon: '<i data-lucide="calendar"></i>',
            colorClass: 'primary'
          })}
          ${window.widgets.metricCard({
            label: 'Lotes Programados',
            value: (state.scheduledBatches || []).filter(b => b.status === 'scheduled').length,
            trend: { value: 'En cola', isPositive: true },
            subtext: 'horarios fuera de pico',
            icon: '<i data-lucide="clock"></i>',
            colorClass: 'warning'
          })}
          ${window.widgets.metricCard({
            label: 'Tasa de Éxito API',
            value: `${successRate}%`,
            trend: { value: '+0.5%', isPositive: true },
            subtext: 'sin fallas de conexión',
            icon: '<i data-lucide="trending-up"></i>',
            colorClass: 'info'
          })}
        </div>

        <!-- Filters Toolbar -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.25rem;">
          <div style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text);">Filtrar Registros:</span>
            <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
              <select class="form-select" style="width: auto; padding: 0.45rem 0.85rem;" onchange="window.enrollmentsPage.onPlatformChange(this.value)">
                <option value="all" ${currentPlatform === 'all' ? 'selected' : ''}>Todas las plataformas</option>
                ${state.platforms.map(p => `
                  <option value="${p.id}" ${currentPlatform === p.id ? 'selected' : ''}>${window.security.escapeHtml(p.name)}</option>
                `).join('')}
              </select>

              <select class="form-select" style="width: auto; padding: 0.45rem 0.85rem;" onchange="window.enrollmentsPage.onMethodChange(this.value)">
                <option value="all" ${currentMethod === 'all' ? 'selected' : ''}>Todos los métodos</option>
                <option value="batch" ${currentMethod === 'batch' ? 'selected' : ''}>Lote Programado (Batch)</option>
                <option value="csv" ${currentMethod === 'csv' ? 'selected' : ''}>Importación CSV</option>
                <option value="api" ${currentMethod === 'api' ? 'selected' : ''}>API / Web Service</option>
                <option value="manual" ${currentMethod === 'manual' ? 'selected' : ''}>Manual UI</option>
                <option value="self" ${currentMethod === 'self' ? 'selected' : ''}>Auto-matriculación</option>
              </select>

              ${(currentPlatform !== 'all' || currentMethod !== 'all') ? `
                <button class="btn btn-ghost btn-sm" onclick="window.enrollmentsPage.resetFilters()">
                  <i data-lucide="x"></i> Limpiar Filtros
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Enrollments Table Card -->
        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Curso Receptor</th>
                  <th>Plataforma</th>
                  <th>Rol</th>
                  <th>Método</th>
                  <th>Fecha y Hora</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${paginated.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 2.5rem;">
                      ${window.widgets.emptyState({
                        icon: '<i data-lucide="user-x"></i>',
                        title: 'No se encontraron matrículas',
                        description: 'Ajusta los filtros seleccionados o procesa un nuevo lote de alumnos.'
                      })}
                    </td>
                  </tr>
                ` : paginated.map(enr => `
                  <tr>
                    <td>
                      <div style="font-weight: 600; color: var(--text);">${window.security.escapeHtml(enr.userName || 'Estudiante')}</div>
                      <div style="font-size: 0.775rem; color: var(--muted);">${window.security.escapeHtml(enr.userEmail || '')}</div>
                    </td>
                    <td>
                      <div style="font-weight: 500;">${window.security.escapeHtml(enr.courseName || 'Curso')}</div>
                    </td>
                    <td>
                      <span class="badge badge-secondary" style="font-size: 0.75rem;">
                        ${window.security.escapeHtml(enr.platformName || 'Plataforma')}
                      </span>
                    </td>
                    <td>
                      <span class="badge badge-info" style="font-size: 0.75rem; text-transform: capitalize;">
                        ${window.security.escapeHtml(enr.role)}
                      </span>
                    </td>
                    <td>
                      <span class="badge ${enr.method === 'batch' ? 'badge-primary' : 'badge-neutral'}" style="font-size: 0.75rem; text-transform: uppercase;">
                        ${enr.method === 'batch' ? '⏰ Lote' : window.security.escapeHtml(enr.method)}
                      </span>
                    </td>
                    <td style="font-size: 0.8125rem; color: var(--muted); white-space: nowrap;">
                      ${new Date(enr.enrolledAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      ${enr.status === 'active' 
                        ? window.widgets.statusBadge('active', 'Activo') 
                        : window.widgets.statusBadge('error', 'Fallida')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-top: 1px solid var(--border); font-size: 0.8125rem; color: var(--muted);">
            <div>
              Mostrando ${total === 0 ? 0 : startIndex + 1} - ${Math.min(startIndex + pageSize, total)} de ${total} registros
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" ${currentPage <= 1 ? 'disabled' : ''} onclick="window.enrollmentsPage.setPage(${currentPage - 1})">
                Anterior
              </button>
              <button class="btn btn-secondary btn-sm" ${currentPage >= totalPages ? 'disabled' : ''} onclick="window.enrollmentsPage.setPage(${currentPage + 1})">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      `;
    },

    /* ==========================================================================
       TAB 2: LOTES PROGRAMADOS EN HORARIOS ESPECÍFICOS
       ========================================================================== */
    _renderBatchesTab: function (state, batches) {
      let filtered = [...batches];
      if (batchStatusFilter !== 'all') {
        filtered = filtered.filter(b => b.status === batchStatusFilter);
      }

      return `
        <!-- Automatic Scheduler Status Box -->
        <div class="batch-info-box">
          <i data-lucide="clock" style="width: 24px; height: 24px; color: var(--primary); flex-shrink: 0;"></i>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--text);">Planificador de Matrícula Nocturna & Fuera de Pico Activo</div>
            <div>Los lotes programados ejecutan llamadas en bloque al servicio <code>enrol_manual_enrol_users</code> de Moodle exactamente en la hora indicada, previniendo saturación de CPU y caídas de base de datos durante horario de clases.</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.enrollmentsPage.openScheduleBatchModal()">
            <i data-lucide="plus"></i> Nuevo Lote
          </button>
        </div>

        <!-- Filter Batches by Status -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; align-items: center; flex-wrap: wrap;">
          <span style="font-size: 0.8125rem; font-weight: 600; color: var(--text);">Filtrar por Estado:</span>
          <button class="btn btn-sm ${batchStatusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}" onclick="window.enrollmentsPage.setBatchFilter('all')">Todos (${batches.length})</button>
          <button class="btn btn-sm ${batchStatusFilter === 'scheduled' ? 'btn-primary' : 'btn-ghost'}" onclick="window.enrollmentsPage.setBatchFilter('scheduled')">
            Programados (${batches.filter(b => b.status === 'scheduled').length})
          </button>
          <button class="btn btn-sm ${batchStatusFilter === 'completed' ? 'btn-primary' : 'btn-ghost'}" onclick="window.enrollmentsPage.setBatchFilter('completed')">
            Completados (${batches.filter(b => b.status === 'completed').length})
          </button>
          <button class="btn btn-sm ${batchStatusFilter === 'cancelled' ? 'btn-primary' : 'btn-ghost'}" onclick="window.enrollmentsPage.setBatchFilter('cancelled')">
            Cancelados (${batches.filter(b => b.status === 'cancelled').length})
          </button>
        </div>

        <!-- Batches Table / Cards -->
        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Nombre del Lote y Curso</th>
                  <th>Plataforma Moodle</th>
                  <th>Alumnos</th>
                  <th>Horario Programado</th>
                  <th>Estado</th>
                  <th>Bitácora de Ejecución</th>
                  <th style="text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 2.5rem;">
                      ${window.widgets.emptyState({
                        icon: '<i data-lucide="calendar-x"></i>',
                        title: 'No hay lotes en esta categoría',
                        description: 'Programa una nueva matriculación masiva seleccionando fecha y hora específica.'
                      })}
                    </td>
                  </tr>
                ` : filtered.map(b => {
                  const scheduledDate = new Date(b.scheduledAt);
                  const isFuture = scheduledDate > new Date();
                  const diffMinutes = Math.round((scheduledDate - new Date()) / 60000);
                  let timeLabel = '';

                  if (b.status === 'completed') {
                    timeLabel = `<span style="color: var(--success); font-weight: 500;">Ejecutado el ${scheduledDate.toLocaleDateString()} a las ${scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
                  } else if (b.status === 'scheduled') {
                    if (diffMinutes <= 0) {
                      timeLabel = `<span style="color: var(--warning); font-weight: 700;">¡Ejecución inminente!</span>`;
                    } else if (diffMinutes < 60) {
                      timeLabel = `<span style="color: var(--primary); font-weight: 600;">En ${diffMinutes} minutos</span> (${scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
                    } else if (diffMinutes < 1440) {
                      timeLabel = `<span>Hoy a las ${scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
                    } else {
                      timeLabel = `<span>${scheduledDate.toLocaleDateString()} a las ${scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
                    }
                  } else {
                    timeLabel = `<span style="color: var(--muted);">${scheduledDate.toLocaleString()}</span>`;
                  }

                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 700; color: var(--text);">${window.security.escapeHtml(b.name)}</div>
                        <div style="font-size: 0.775rem; color: var(--primary); display: flex; align-items: center; gap: 0.35rem; margin-top: 2px;">
                          <i data-lucide="book-open" style="width: 14px; height: 14px;"></i>
                          ${(b.courseCount && b.courseCount > 1)
                            ? `<span>Múltiples cursos (${b.courseCount})</span>`
                            : window.security.escapeHtml(b.courseName || 'Curso')}
                        </div>
                        ${(b.enrollmentItems && b.enrollmentItems.length) ? `
                          <div style="display:flex; flex-wrap:wrap; gap:0.25rem; margin-top:0.35rem;">
                            ${[...new Set(b.enrollmentItems.map(i => i.shortname || i.courseName))].slice(0,4).map(cn => `<span class="badge badge-secondary" style="font-size:0.65rem;">${window.security.escapeHtml(cn)}</span>`).join('')}
                            ${(b.courseCount || 0) > 4 ? `<span class="badge badge-neutral" style="font-size:0.65rem;">+${b.courseCount - 4}</span>` : ''}
                          </div>
                        ` : ''}
                      </td>
                      <td>
                        <span class="badge badge-secondary" style="font-size: 0.75rem;">
                          ${window.security.escapeHtml(b.platformName || 'Plataformas varias')}
                        </span>
                      </td>
                      <td>
                        <div style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600; color: var(--text);">
                          <i data-lucide="users" style="width: 15px; height: 15px; color: var(--muted);"></i>
                          ${(b.studentCount || b.enrollmentCount || (b.targetStudentIds ? b.targetStudentIds.length : 0))} alumnos${(b.courseCount && b.courseCount > 1) ? ` → ${b.courseCount} cursos` : ''}
                        </div>
                      </td>
                      <td style="font-size: 0.8125rem;">
                        ${timeLabel}
                      </td>
                      <td>
                        ${b.status === 'completed' 
                          ? '<span class="badge badge-success"><span class="badge-dot"></span> Completado</span>'
                          : b.status === 'scheduled'
                          ? '<span class="badge badge-primary"><span class="badge-dot pulse"></span> Programado</span>'
                          : '<span class="badge badge-neutral">Cancelado</span>'}
                      </td>
                      <td style="font-size: 0.775rem; color: var(--muted); max-width: 220px;">
                        ${window.security.escapeHtml(b.executionLog || 'En espera')}
                      </td>
                      <td style="text-align: right; white-space: nowrap;">
                        ${b.status === 'scheduled' ? `
                          <button class="btn btn-primary btn-sm" onclick="window.enrollmentsPage.executeBatchNow('${b.id}')" title="Ejecutar inmediatamente sin esperar al horario">
                            <i data-lucide="play"></i> Ejecutar Ahora
                          </button>
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="window.enrollmentsPage.cancelBatch('${b.id}')" title="Cancelar Lote">
                            <i data-lucide="x-circle" style="width: 16px; height: 16px; color: var(--danger);"></i>
                          </button>
                        ` : `
                          <button class="btn btn-ghost btn-sm" onclick="window.enrollmentsPage.deleteBatch('${b.id}')" title="Eliminar del historial">
                            <i data-lucide="trash-2" style="width: 15px; height: 15px; color: var(--muted);"></i>
                          </button>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    onPlatformChange: function (val) {
      currentPlatform = val;
      currentPage = 1;
      this.render(document.getElementById('page-container'));
    },

    onMethodChange: function (val) {
      currentMethod = val;
      currentPage = 1;
      this.render(document.getElementById('page-container'));
    },

    resetFilters: function () {
      currentPlatform = 'all';
      currentMethod = 'all';
      currentPage = 1;
      this.render(document.getElementById('page-container'));
    },

    setBatchFilter: function (filter) {
      batchStatusFilter = filter;
      this.render(document.getElementById('page-container'));
    },

    setPage: function (p) {
      currentPage = p;
      this.render(document.getElementById('page-container'));
    },

    /* ==========================================================================
       CSV MULTI-CURSO: Parser + Resolución por username + nombre de curso
       Formato esperado: username,email,curso_nombre[,rol,plataforma]
       El curso sale de cada fila (no hay curso único destino).
       ========================================================================== */
    _splitCsvLine: function (line, delimiter) {
      const out = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === delimiter && !inQuotes) {
          out.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur.trim());
      return out;
    },

    _parseCsvText: function (text) {
      const clean = String(text || '').replace(/^\uFEFF/, '');
      const rawLines = clean.split(/\r?\n/);
      const lines = rawLines.filter(l => l.trim().length > 0);
      if (lines.length === 0) return { headers: [], rows: [] };
      const first = lines[0];
      const delimiter = (first.split(';').length > first.split(',').length) ? ';' : ',';
      const headers = this._splitCsvLine(first, delimiter).map(h => h.trim().toLowerCase());
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = this._splitCsvLine(lines[i], delimiter);
        const row = { _rowNumber: i + 1 };
        headers.forEach((h, idx) => { row[h] = (cols[idx] ?? '').trim(); });
        rows.push(row);
      }
      // Si no hay encabezado reconocible, intentar formato posicional: col1=username, col2=email, col3=curso
      const hasRecognizable = headers.some(h => ['username','usuario','email','correo','curso','curso_nombre','curso_codigo','course','course_name','fullname','shortname'].includes(h));
      if (!hasRecognizable) {
        return { headers: ['username','email','curso_nombre'], rows: lines.map((l, idx) => {
          const cols = this._splitCsvLine(l, delimiter);
          return { _rowNumber: idx + 1, username: cols[0] || '', email: cols[1] || '', curso_nombre: cols[2] || cols[1] || '' };
        }) };
      }
      return { headers, rows };
    },

    _pick: function (row, aliases) {
      for (const a of aliases) {
        if (row[a] !== undefined && String(row[a]).trim() !== '') return String(row[a]).trim();
      }
      return '';
    },

    _norm: function (s) {
      return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    },

    _resolveCsvEnrollments: function (text, defaultRole) {
      const state = window.store.getState();
      const { rows } = this._parseCsvText(text);
      const items = [];
      const errors = [];
      if (rows.length === 0) {
        errors.push('El CSV no contiene filas de datos.');
        return { items, errors };
      }
      rows.forEach((row) => {
        const rowNum = row._rowNumber;
        const username = this._pick(row, ['username','usuario','user','usuario_moodle','login']);
        const email = this._pick(row, ['email','correo','correo_electronico','mail']);
        const courseRef = this._pick(row, ['curso_nombre','curso','course_name','coursename','fullname','nombre_curso','course','curso_codigo','codigo_curso','cod_curso','shortname','course_id','id_curso','id']);
        const role = this._pick(row, ['rol','role']) || defaultRole || 'student';
        const platformRef = this._pick(row, ['plataforma','platform','platform_name','campus']);

        if (!username && !email) {
          errors.push(`Fila ${rowNum}: falta username/email.`);
          return;
        }
        if (!courseRef) {
          errors.push(`Fila ${rowNum}: falta nombre/código de curso.`);
          return;
        }
        // Resolución de usuario: primero por username (regla elegida), luego por email
        let user = null;
        if (username) {
          user = state.users.find(u => this._norm(u.username) === this._norm(username));
        }
        if (!user && email) {
          user = state.users.find(u => this._norm(u.email) === this._norm(email));
        }
        if (!user && username && username.includes('@')) {
          user = state.users.find(u => this._norm(u.email) === this._norm(username));
        }
        if (!user) {
          errors.push(`Fila ${rowNum}: usuario no encontrado (${username || email}).`);
          return;
        }
        // Resolución de curso: fullname / shortname / id (insensible a mayúsculas y tildes)
        const refNorm = this._norm(courseRef);
        let course = state.courses.find(c =>
          this._norm(c.fullname) === refNorm ||
          this._norm(c.shortname) === refNorm ||
          this._norm(c.id) === refNorm
        );
        // Fallback: coincidencia parcial por fullname
        if (!course) {
          course = state.courses.find(c => this._norm(c.fullname).includes(refNorm) || refNorm.includes(this._norm(c.fullname)));
        }
        if (!course) {
          errors.push(`Fila ${rowNum}: curso no encontrado («${courseRef}»).`);
          return;
        }
        // Plataforma opcional del CSV
        let platform = state.platforms.find(p => p.id === course.platformId);
        if (platformRef) {
          const platNorm = this._norm(platformRef);
          const foundPlat = state.platforms.find(p => this._norm(p.name) === platNorm || p.id === platformRef);
          if (foundPlat && foundPlat.id !== course.platformId) {
            errors.push(`Fila ${rowNum}: el curso «${course.shortname}» pertenece a «${course.platformName}», no a «${platformRef}». Se usará la plataforma del curso.`);
          }
        }
        items.push({
          userId: user.id,
          userName: `${user.firstname} ${user.lastname}`.trim(),
          userEmail: user.email,
          username: user.username,
          courseId: course.id,
          courseName: course.fullname,
          shortname: course.shortname,
          platformId: course.platformId,
          platformName: course.platformName,
          role,
          sourceRow: rowNum
        });
      });
      return { items, errors };
    },

    _renderCsvMultiCoursePreview: function (parsed, fileName) {
      const items = (parsed && parsed.items) || [];
      const errors = (parsed && parsed.errors) || [];
      const grouped = {};
      items.forEach(it => {
        grouped[it.courseId] = grouped[it.courseId] || { courseName: it.courseName, shortname: it.shortname, platformName: it.platformName, count: 0 };
        grouped[it.courseId].count++;
      });
      const courseList = Object.values(grouped);
      return `
        <div style="margin-top:0.75rem; border:1px solid var(--border); border-radius:8px; padding:0.75rem; background:var(--card); font-size:0.8125rem;">
          <div style="font-weight:700; color:var(--text); margin-bottom:0.25rem;">${window.security.escapeHtml(fileName || 'Archivo CSV')}</div>
          <div style="color:var(--muted); margin-bottom:0.5rem;">
            ${items.length} matrícula${items.length !== 1 ? 's' : ''} válida${items.length !== 1 ? 's' : ''} → ${courseList.length} curso${courseList.length !== 1 ? 's' : ''} detectado${courseList.length !== 1 ? 's' : ''}
            ${errors.length ? ` · <span style="color:var(--danger); font-weight:700;">${errors.length} error${errors.length !== 1 ? 'es' : ''}</span>` : ''}
          </div>
          ${courseList.length ? `
            <div style="display:flex; flex-direction:column; gap:0.3rem; max-height:150px; overflow-y:auto;">
              ${courseList.map(c => `
                <div style="display:flex; justify-content:space-between; gap:0.5rem; align-items:center;">
                  <span><strong>${window.security.escapeHtml(c.shortname)}</strong> — ${window.security.escapeHtml(c.courseName)}</span>
                  <span class="badge badge-primary">${c.count} alumno${c.count !== 1 ? 's' : ''}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${errors.length ? `
            <div style="margin-top:0.5rem; padding:0.6rem; border-radius:6px; background:var(--danger-light, #fef2f2); color:var(--danger); font-size:0.775rem; max-height:120px; overflow-y:auto;">
              ${errors.slice(0, 8).map(e => `<div>• ${window.security.escapeHtml(e)}</div>`).join('')}
              ${errors.length > 8 ? `<div>… y ${errors.length - 8} error(es) más.</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    },

    downloadCsvTemplate: function (where) {
      const state = window.store.getState();
      const examples = state.courses.slice(0, 3).map(c => `${state.users[3]?.username || 's.navarro'},${state.users[3]?.email || 's.navarro@estudiantes.edu'},${c.fullname},student`).join('\r\n');
      const csv = `username,email,curso_nombre,rol\r\n${examples}\r\n`;
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `plantilla_matriculas_multicurso_${where || 'moodlify'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    /* ==========================================================================
       BACKGROUND TRIGGER: REVISA Y DISPARA LOTES CUYA HORA LLEGÓ
       ========================================================================== */
    checkScheduledBatchesTrigger: function () {
      const state = window.store.getState();
      const batches = state.scheduledBatches || [];
      const now = new Date();

      batches.forEach(b => {
        if (b.status === 'scheduled' && new Date(b.scheduledAt) <= now && !executingBatchIds.has(b.id)) {
          executingBatchIds.add(b.id);
          console.info(`[Moodlify Scheduler] Disparando lote programado: ${b.name}`);
          window.api.request('executeScheduledBatch', { batchId: b.id }).then(res => {
            executingBatchIds.delete(b.id);
            if (res.success) {
              if (window.toast) {
                window.toast.success(`⏰ Lote programado ejecutado: "${b.name}" (${res.data.enrolled} matriculados)`);
              }
              // Refrescar en vivo si el usuario sigue en la página de Matrículas
              const container = document.getElementById('page-container');
              if (container && window.location.hash === '#enrollments') {
                this.render(container);
              }
            }
          }).catch(() => {
            executingBatchIds.delete(b.id);
          });
        }
      });
    },

    /* ==========================================================================
       EJECUCIÓN INMEDIATA O CANCELACIÓN DE LOTE
       ========================================================================== */
    executeBatchNow: async function (batchId) {
      const res = await window.api.request('executeScheduledBatch', { batchId });
      if (res.success) {
        if (window.toast) window.toast.success(res.message);
        this.render(document.getElementById('page-container'));
      } else {
        if (window.toast) window.toast.error(res.error?.message || 'Error al ejecutar lote');
      }
    },

    cancelBatch: async function (batchId) {
      const res = await window.api.request('cancelScheduledBatch', { batchId });
      if (res.success) {
        if (window.toast) window.toast.info('Lote cancelado correctamente');
        this.render(document.getElementById('page-container'));
      }
    },

    deleteBatch: async function (batchId) {
      const res = await window.api.request('deleteScheduledBatch', { batchId });
      if (res.success) {
        if (window.toast) window.toast.info('Lote eliminado del historial');
        this.render(document.getElementById('page-container'));
      }
    },

    /* ==========================================================================
       MODAL 1: PROGRAMAR MATRÍCULA POR LOTE EN HORARIO ESPECÍFICO
       ========================================================================== */
    openScheduleBatchModal: function () {
      const state = window.store.getState();

      // Formato para datetime-local por defecto (+1 hora)
      const defaultTime = new Date(Date.now() + 60 * 60000);
      defaultTime.setMinutes(0);
      defaultTime.setSeconds(0);
      const isoLocal = new Date(defaultTime.getTime() - defaultTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

      const content = `
        <form id="schedule-batch-form" onsubmit="event.preventDefault(); window.enrollmentsPage.handleScheduleBatchSubmit();">
          <!-- Título y Curso -->
          <div class="form-group">
            <label class="form-label required">Nombre Identificador del Lote</label>
            <input type="text" class="form-input" id="batch-name-input" placeholder="Ej: Matrícula Masiva - Nuevos Ingresos Semestre 2026-I" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;" id="batch-target-fields">
            <div class="form-group">
              <label class="form-label required">Plataforma Moodle <span style="font-weight:400; font-size:0.75rem; color:var(--muted);">(modo Directorio)</span></label>
              <select class="form-select" id="batch-platform-select" required onchange="window.enrollmentsPage.updateCourseOptions(this.value)">
                ${state.platforms.map(p => `
                  <option value="${p.id}">${window.security.escapeHtml(p.name)}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Curso destino <span style="font-weight:400; font-size:0.75rem; color:var(--muted);">(modo Directorio)</span></label>
              <select class="form-select" id="batch-course-select" required>
                ${state.courses.map(c => `
                  <option value="${c.id}">${window.security.escapeHtml(c.fullname)} (${window.security.escapeHtml(c.shortname)})</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div id="batch-csv-multi-note" style="display:none; padding:0.75rem 1rem; border-radius:8px; background:var(--primary-light); border:1px solid var(--border-hover); font-size:0.8125rem; color:var(--text-secondary); margin-bottom:1rem;">
            <strong>Modo multi-curso activado:</strong> la plataforma y los cursos se tomarán de <strong>cada fila del CSV</strong> (columna <code>curso_nombre</code>). No se usará un único curso destino. El rol por fila (<code>rol</code>) prevalece sobre el rol general si está presente.
          </div>

          <div class="form-group">
            <label class="form-label required">Rol a Asignar en Moodle</label>
            <select class="form-select" id="batch-role-select">
              <option value="student">Estudiante (student)</option>
              <option value="editingteacher">Profesor Titular (editingteacher)</option>
              <option value="teacher">Profesor Asistente sin permiso de edición (teacher)</option>
            </select>
          </div>

          <!-- Selección o carga de alumnos -->
          <div class="form-group" style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem; background: var(--bg-alt);">
            <label class="form-label required" style="margin-bottom: 0.5rem;">Origen de los Alumnos del Lote</label>
            <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8125rem; cursor: pointer;">
                <input type="radio" name="batch-source" value="select" checked onchange="window.enrollmentsPage.toggleSourceMode('select')" />
                Seleccionar del Directorio de Usuarios
              </label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8125rem; cursor: pointer;">
                <input type="radio" name="batch-source" value="csv" onchange="window.enrollmentsPage.toggleSourceMode('csv')" />
                Cargar Archivo CSV
              </label>
            </div>

            <!-- Panel Directorio -->
            <div id="source-select-panel" style="max-height: 140px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem; background: var(--card);">
              ${state.users.map(u => `
                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.4rem; font-size: 0.8125rem; border-bottom: 1px solid var(--border-hover); cursor: pointer;">
                  <input type="checkbox" name="batch-user-item" value="${u.id}" checked />
                  <span style="font-weight: 600;">${window.security.escapeHtml(u.firstname + ' ' + u.lastname)}</span>
                  <span style="color: var(--muted); font-size: 0.75rem;">(${window.security.escapeHtml(u.email)})</span>
                </label>
              `).join('')}
            </div>

            <!-- Panel CSV -->
            <div id="source-csv-panel" style="display: none;">
              <input type="file" class="form-input" id="batch-csv-file" accept=".csv" onchange="window.enrollmentsPage.onBatchCsvSelected(this)" />
              <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-top:0.5rem; flex-wrap:wrap;">
                <span class="form-helper" style="margin:0;">Formato: <code>username,email,curso_nombre[,rol]</code> — un curso por fila.</span>
                <button type="button" class="btn btn-ghost btn-sm" onclick="window.enrollmentsPage.downloadCsvTemplate('lote')">Descargar plantilla</button>
              </div>
              <div id="batch-csv-preview" style="margin-top: 0.5rem; font-size: 0.775rem; color: var(--muted);">
                Sube un CSV con <code>username</code>, <code>email</code> y <code>curso_nombre</code> (nombre completo, código corto o ID).
              </div>
            </div>
          </div>

          <!-- Programación de Horario Específico -->
          <div class="form-group" style="background: var(--primary-light); border: 1px solid var(--border-hover); border-radius: var(--radius-md); padding: 1rem;">
            <label class="form-label required" style="color: var(--primary-dark); font-weight: 700; display: flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="clock" style="width: 16px; height: 16px;"></i> Horario de Ejecución de la Matrícula
            </label>

            <div style="display: flex; gap: 1.25rem; margin-bottom: 0.75rem;">
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
                <input type="radio" name="batch-schedule-mode" value="scheduled" checked onchange="document.getElementById('datetime-picker-wrap').style.display='block'" />
                Programar en Horario Específico (Recomendado)
              </label>
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8125rem; font-weight: 600; cursor: pointer;">
                <input type="radio" name="batch-schedule-mode" value="immediate" onchange="document.getElementById('datetime-picker-wrap').style.display='none'" />
                Ejecutar Inmediatamente (Ahora)
              </label>
            </div>

            <div id="datetime-picker-wrap">
              <input type="datetime-local" class="form-input" id="batch-datetime-input" value="${isoLocal}" required />
              
              <!-- Presets rápidos de 1-click -->
              <div class="schedule-presets">
                <span style="font-size: 0.725rem; color: var(--text-secondary); margin-right: 4px; align-self: center;">Atajos rápidos:</span>
                <button type="button" class="schedule-preset-btn" onclick="window.enrollmentsPage.setDateTimePreset(30)">+30 min</button>
                <button type="button" class="schedule-preset-btn" onclick="window.enrollmentsPage.setDateTimePreset(120)">+2 horas</button>
                <button type="button" class="schedule-preset-btn" onclick="window.enrollmentsPage.setDateTimePreset('tonight')">Esta noche (23:00)</button>
                <button type="button" class="schedule-preset-btn" onclick="window.enrollmentsPage.setDateTimePreset('night')">Madrugada (02:00 Ventana)</button>
                <button type="button" class="schedule-preset-btn" onclick="window.enrollmentsPage.setDateTimePreset('tomorrow_morning')">Mañana 08:00 AM</button>
              </div>
            </div>
          </div>

          <!-- Opciones Adicionales -->
          <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.8125rem; color: var(--text-secondary);">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="batch-notify-check" checked />
              <span>Notificar a los estudiantes por correo electrónico una vez completada la matrícula</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="batch-retry-check" checked />
              <span>Reintentar con backoff exponencial si la API de Moodle reporta latencia de conexión</span>
            </label>
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('schedule-batch-form').requestSubmit()">
          <i data-lucide="check"></i> Confirmar y Programar Lote
        </button>
      `;

      window.modal.open({
        title: 'Programar Matrícula por Lote en Horario Específico',
        content,
        footer
      });

      if (typeof window.lucide !== 'undefined') {
        window.lucide.createIcons();
      }
    },

    toggleSourceMode: function (mode) {
      const selectPanel = document.getElementById('source-select-panel');
      const csvPanel = document.getElementById('source-csv-panel');
      const targetFields = document.getElementById('batch-target-fields');
      const multiNote = document.getElementById('batch-csv-multi-note');
      const platformSelect = document.getElementById('batch-platform-select');
      const courseSelect = document.getElementById('batch-course-select');
      if (mode === 'csv') {
        if (selectPanel) selectPanel.style.display = 'none';
        if (csvPanel) csvPanel.style.display = 'block';
        if (targetFields) targetFields.style.display = 'none';
        if (multiNote) multiNote.style.display = 'block';
        if (platformSelect) platformSelect.required = false;
        if (courseSelect) courseSelect.required = false;
      } else {
        if (selectPanel) selectPanel.style.display = 'block';
        if (csvPanel) csvPanel.style.display = 'none';
        if (targetFields) targetFields.style.display = 'grid';
        if (multiNote) multiNote.style.display = 'none';
        if (platformSelect) platformSelect.required = true;
        if (courseSelect) courseSelect.required = true;
        batchCsvParsed = null;
      }
    },

    setDateTimePreset: function (preset) {
      const input = document.getElementById('batch-datetime-input');
      if (!input) return;

      const target = new Date();
      if (typeof preset === 'number') {
        target.setTime(target.getTime() + preset * 60000);
      } else if (preset === 'tonight') {
        target.setHours(23, 0, 0, 0);
      } else if (preset === 'night') {
        target.setDate(target.getDate() + 1);
        target.setHours(2, 0, 0, 0);
      } else if (preset === 'tomorrow_morning') {
        target.setDate(target.getDate() + 1);
        target.setHours(8, 0, 0, 0);
      }

      const isoLocal = new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      input.value = isoLocal;
    },

    onBatchCsvSelected: function (input) {
      const preview = document.getElementById('batch-csv-preview');
      batchCsvParsed = null;
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const defaultRole = document.getElementById('batch-role-select')?.value || 'student';
        const reader = new FileReader();
        reader.onload = (e) => {
          batchCsvParsed = this._resolveCsvEnrollments(e.target.result, defaultRole);
          preview.innerHTML = this._renderCsvMultiCoursePreview(batchCsvParsed, file.name);
        };
        reader.readAsText(file);
      }
    },

    updateCourseOptions: function (platformId) {
      const state = window.store.getState();
      const select = document.getElementById('batch-course-select');
      if (!select) return;

      const filtered = state.courses.filter(c => c.platformId === platformId);
      const coursesToShow = filtered.length > 0 ? filtered : state.courses;

      select.innerHTML = coursesToShow.map(c => `
        <option value="${c.id}">${window.security.escapeHtml(c.fullname)} (${window.security.escapeHtml(c.shortname)})</option>
      `).join('');
    },

    handleScheduleBatchSubmit: async function () {
      const name = document.getElementById('batch-name-input').value.trim();
      const sourceMode = document.querySelector('input[name="batch-source"]:checked')?.value || 'select';
      const role = document.getElementById('batch-role-select').value;
      const scheduleMode = document.querySelector('input[name="batch-schedule-mode"]:checked')?.value || 'scheduled';
      const isImmediate = scheduleMode === 'immediate';
      const scheduledAt = isImmediate ? new Date().toISOString() : new Date(document.getElementById('batch-datetime-input').value).toISOString();
      const notifyStudents = document.getElementById('batch-notify-check')?.checked !== false;
      const retryOnFailure = document.getElementById('batch-retry-check')?.checked !== false;

      let payloadBase;

      if (sourceMode === 'csv') {
        // Modo multi-curso: los cursos salen del CSV, no de un selector único
        if (!batchCsvParsed) {
          const fileInput = document.getElementById('batch-csv-file');
          if (!fileInput.files || fileInput.files.length === 0) {
            if (window.toast) window.toast.warning('Adjunta un archivo CSV para continuar');
            return;
          }
          // Parse sincrono de respaldo si el preview aun no se genero
          const text = await fileInput.files[0].text();
          batchCsvParsed = this._resolveCsvEnrollments(text, role);
        }
        if (!batchCsvParsed.items || batchCsvParsed.items.length === 0) {
          const msg = (batchCsvParsed.errors && batchCsvParsed.errors[0]) || 'El CSV no contiene matrículas válidas';
          if (window.toast) window.toast.error(msg);
          return;
        }
        const first = batchCsvParsed.items[0];
        payloadBase = {
          name,
          platformId: first.platformId,
          courseId: first.courseId,
          role,
          enrollmentItems: batchCsvParsed.items,
          targetStudentIds: batchCsvParsed.items.map(i => i.userId),
          scheduledAt,
          isImmediate,
          notifyStudents,
          retryOnFailure,
          _csvErrors: batchCsvParsed.errors
        };
      } else {
        const platformId = document.getElementById('batch-platform-select').value;
        const courseId = document.getElementById('batch-course-select').value;
        const checkboxes = document.querySelectorAll('input[name="batch-user-item"]:checked');
        const targetUserIds = Array.from(checkboxes).map(cb => cb.value);
        if (targetUserIds.length === 0) {
          if (window.toast) window.toast.warning('Selecciona al menos un alumno para el lote');
          return;
        }
        payloadBase = {
          name,
          platformId,
          courseId,
          role,
          targetStudentIds: targetUserIds,
          scheduledAt,
          isImmediate,
          notifyStudents,
          retryOnFailure
        };
      }

      const res = await window.api.request('createScheduledBatch', payloadBase);

      if (res.success) {
        const errCount = (payloadBase._csvErrors || []).length;
        if (window.toast) window.toast.success(res.message + (errCount ? ` (${errCount} fila(s) con error ignorada(s))` : ''));
        if (errCount && window.toast) window.toast.warning(`${errCount} fila(s) del CSV no se pudieron procesar. Revisa el aviso en Lotes Programados.`);
        batchCsvParsed = null;
        window.modal.close();
        currentTab = 'batches';
        this.render(document.getElementById('page-container'));
      } else {
        if (window.toast) window.toast.error(res.error?.message || 'Error al programar lote');
      }
    },

    /* ==========================================================================
       MODAL 2: MATRÍCULA RÁPIDA CSV — MULTI-CURSO
       Sin curso único: cada fila define su curso vía curso_nombre.
       ========================================================================== */
    openBulkModal: function () {
      bulkCsvParsed = null;
      const content = `
        <form id="bulk-enroll-form" onsubmit="event.preventDefault(); window.enrollmentsPage.handleBulkSubmit();">
          <div style="padding:0.75rem 1rem; border-radius:8px; background:var(--primary-light); border:1px solid var(--border-hover); font-size:0.8125rem; color:var(--text-secondary); margin-bottom:1rem;">
            <strong>Matrícula multi-curso:</strong> el curso destino sale de <strong>cada fila del CSV</strong> (columna <code>curso_nombre</code>). Puedes matricular a varios cursos en una sola carga.
          </div>
          <div class="form-group">
            <label class="form-label required">Archivo CSV de Matrícula</label>
            <input type="file" class="form-input" id="bulk-csv-file" accept=".csv" required onchange="window.enrollmentsPage.onBulkCsvSelected(this)" />
            <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-top:0.5rem; flex-wrap:wrap;">
              <span class="form-helper" style="margin:0;">Formato: <code>username,email,curso_nombre[,rol]</code></span>
              <button type="button" class="btn btn-ghost btn-sm" onclick="window.enrollmentsPage.downloadCsvTemplate('rapida')">Descargar plantilla</button>
            </div>
            <div id="bulk-csv-preview" style="margin-top:0.25rem; font-size:0.775rem; color:var(--muted);"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Rol por defecto <span style="font-weight:400; color:var(--muted);">(si el CSV no indica rol)</span></label>
            <select class="form-select" id="bulk-role-select">
              <option value="student">Estudiante (student)</option>
              <option value="editingteacher">Profesor Titular (editingteacher)</option>
              <option value="teacher">Profesor Asistente (teacher)</option>
            </select>
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('bulk-enroll-form').requestSubmit()">Procesar Matrículas Ahora</button>
      `;

      window.modal.open({
        title: 'Matriculación Rápida desde CSV — Multi-curso',
        content,
        footer
      });
    },

    onBulkCsvSelected: function (input) {
      const preview = document.getElementById('bulk-csv-preview');
      bulkCsvParsed = null;
      if (!input.files || !input.files[0]) return;
      const file = input.files[0];
      const defaultRole = document.getElementById('bulk-role-select')?.value || 'student';
      const reader = new FileReader();
      reader.onload = (e) => {
        bulkCsvParsed = this._resolveCsvEnrollments(e.target.result, defaultRole);
        preview.innerHTML = this._renderCsvMultiCoursePreview(bulkCsvParsed, file.name);
      };
      reader.readAsText(file);
    },

    handleBulkSubmit: async function () {
      const roleId = document.getElementById('bulk-role-select')?.value || 'student';
      const fileInput = document.getElementById('bulk-csv-file');

      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        if (window.toast) window.toast.warning('Adjunta un archivo CSV para continuar');
        return;
      }

      let parsed = bulkCsvParsed;
      if (!parsed) {
        const text = await fileInput.files[0].text();
        parsed = this._resolveCsvEnrollments(text, roleId);
      }

      if (!parsed.items || parsed.items.length === 0) {
        if (window.toast) window.toast.error((parsed.errors && parsed.errors[0]) || 'El CSV no contiene matrículas válidas');
        return;
      }

      const res = await window.api.request('enrollUsersMultiCourse', {
        items: parsed.items,
        role_id: roleId,
        method: 'csv'
      });

      if (res.success) {
        const errCount = (parsed.errors || []).length;
        if (window.toast) window.toast.success(res.message + (errCount ? ` (${errCount} fila(s) con error ignorada(s))` : ''));
        if (errCount && window.toast) window.toast.warning(`${errCount} fila(s) no procesada(s). Revisa usuario y curso_nombre.`);
        bulkCsvParsed = null;
        window.modal.close();
        currentTab = 'history';
        this.render(document.getElementById('page-container'));
      } else {
        if (window.toast) window.toast.error(res.error?.message || 'Error al procesar CSV');
      }
    }
  };

  window.enrollmentsPage = enrollmentsPage;
})();
