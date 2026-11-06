/**
 * ==============================================================================
 * MOODLIFY - ADVANCED ANALYTICS & REPORTS MODULE (js/pages/reports.js)
 * Multi-view Reporting Suite: Executive SLA, Academic Enrollments & Retention,
 * Security Audit, Custom Report Builder with Real CSV Export & Formatted Print/PDF
 * ==============================================================================
 */

(function () {
  'use strict';

  let currentTab = 'executive'; // 'executive' | 'enrollments' | 'security' | 'builder'
  let activePeriod = '30d'; // '7d' | '30d' | '90d' | '1y'
  let selectedPlatform = 'all';

  // Almacén de instancias de Chart.js para destrucción y recreación limpia
  const charts = {
    uptime: null,
    enrolTrend: null,
    completion: null,
    mttr: null,
    methodDonut: null,
    topCourses: null,
    securityActivity: null,
    builderPreview: null
  };

  const reportsPage = {
    render: async function (container) {
      const state = window.store.getState();

      container.innerHTML = `
        <div class="animate-fade-in">
          <!-- Page Header -->
          <div class="page-header">
            <div>
              <h1 class="page-title">Módulo de Reportes & Analíticas</h1>
              <p class="page-subtitle">Informes ejecutivos, métricas de retención, disponibilidad de campus y generador a medida</p>
            </div>
            <div class="page-actions">
              <!-- Period Selector -->
              <div style="display: flex; gap: 0.25rem; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.2rem;">
                <button class="btn btn-ghost btn-sm ${activePeriod === '7d' ? 'active-period-btn' : ''}" onclick="window.reportsPage.setPeriod('7d')">7D</button>
                <button class="btn btn-ghost btn-sm ${activePeriod === '30d' ? 'active-period-btn' : ''}" onclick="window.reportsPage.setPeriod('30d')">30D</button>
                <button class="btn btn-ghost btn-sm ${activePeriod === '90d' ? 'active-period-btn' : ''}" onclick="window.reportsPage.setPeriod('90d')">90D</button>
                <button class="btn btn-ghost btn-sm ${activePeriod === '1y' ? 'active-period-btn' : ''}" onclick="window.reportsPage.setPeriod('1y')">1A</button>
              </div>

              <!-- Platform Selector Filter -->
              <select class="form-select" style="width: auto; padding: 0.4rem 0.75rem; font-size: 0.8125rem;" onchange="window.reportsPage.setPlatformFilter(this.value)">
                <option value="all" ${selectedPlatform === 'all' ? 'selected' : ''}>Todos los campus</option>
                ${state.platforms.map(p => `
                  <option value="${p.id}" ${selectedPlatform === p.id ? 'selected' : ''}>${window.security.escapeHtml(p.name)}</option>
                `).join('')}
              </select>

              <button class="btn btn-secondary" onclick="window.reportsPage.exportCurrentTabCSV()">
                <i data-lucide="file-spreadsheet"></i> Exportar CSV
              </button>
              <button class="btn btn-primary" onclick="window.print()">
                <i data-lucide="printer"></i> Imprimir / PDF
              </button>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div class="nav-tabs">
            <button class="nav-tab-btn ${currentTab === 'executive' ? 'active' : ''}" onclick="window.reportsPage.setTab('executive')">
              <i data-lucide="bar-chart-3" style="width: 16px; height: 16px;"></i>
              <span>Resumen Ejecutivo & SLA</span>
            </button>
            <button class="nav-tab-btn ${currentTab === 'enrollments' ? 'active' : ''}" onclick="window.reportsPage.setTab('enrollments')">
              <i data-lucide="graduation-cap" style="width: 16px; height: 16px;"></i>
              <span>Matrículas & Cursos</span>
            </button>
            <button class="nav-tab-btn ${currentTab === 'security' ? 'active' : ''}" onclick="window.reportsPage.setTab('security')">
              <i data-lucide="shield-alert" style="width: 16px; height: 16px;"></i>
              <span>Auditoría & Seguridad</span>
            </button>
            <button class="nav-tab-btn ${currentTab === 'builder' ? 'active' : ''}" onclick="window.reportsPage.setTab('builder')">
              <i data-lucide="file-cog" style="width: 16px; height: 16px;"></i>
              <span>Generador a Medida</span>
            </button>
          </div>

          <!-- Report Panels -->
          <div id="report-tab-body">
            ${this._renderCurrentTab(state)}
          </div>
        </div>
      `;

      if (typeof window.lucide !== 'undefined') {
        window.lucide.createIcons();
      }

      // Inicializar gráficos según el tab activo
      setTimeout(() => this._initCharts(state), 80);
    },

    setTab: function (tab) {
      currentTab = tab;
      this.destroyAllCharts();
      this.render(document.getElementById('page-container'));
    },

    setPeriod: function (period) {
      activePeriod = period;
      this.destroyAllCharts();
      this.render(document.getElementById('page-container'));
      if (window.toast) window.toast.info(`Período de reporte actualizado a ${period.toUpperCase()}`);
    },

    setPlatformFilter: function (platId) {
      selectedPlatform = platId;
      this.destroyAllCharts();
      this.render(document.getElementById('page-container'));
    },

    _renderCurrentTab: function (state) {
      switch (currentTab) {
        case 'executive':
          return this._renderExecutiveTab(state);
        case 'enrollments':
          return this._renderEnrollmentsTab(state);
        case 'security':
          return this._renderSecurityTab(state);
        case 'builder':
          return this._renderBuilderTab(state);
        default:
          return this._renderExecutiveTab(state);
      }
    },

    /* ==========================================================================
       TAB 1: RESUMEN EJECUTIVO & SLA
       ========================================================================== */
    _renderExecutiveTab: function (state) {
      const platforms = selectedPlatform === 'all' 
        ? state.platforms 
        : state.platforms.filter(p => p.id === selectedPlatform);

      return `
        <!-- 4 Global KPIs -->
        <div class="metrics-grid">
          ${window.widgets.metricCard({
            label: 'Disponibilidad (Uptime SLA)',
            value: '99.88%',
            trend: { value: '+0.12%', isPositive: true },
            subtext: `acumulado ${activePeriod}`,
            icon: '<i data-lucide="shield-check"></i>',
            colorClass: 'success'
          })}
          ${window.widgets.metricCard({
            label: 'Nuevas Matrículas',
            value: state.enrollments.length,
            trend: { value: '+16.4%', isPositive: true },
            subtext: 'en todas las instancias',
            icon: '<i data-lucide="user-plus"></i>',
            colorClass: 'primary'
          })}
          ${window.widgets.metricCard({
            label: 'Tasa de Finalización',
            value: '84.8%',
            trend: { value: '+3.1%', isPositive: true },
            subtext: 'cursos evaluados',
            icon: '<i data-lucide="award"></i>',
            colorClass: 'info'
          })}
          ${window.widgets.metricCard({
            label: 'MTTR Incidencias',
            value: '1.2 hrs',
            trend: { value: '-40 min', isPositive: true },
            subtext: 'tiempo de resolución',
            icon: '<i data-lucide="zap"></i>',
            colorClass: 'warning'
          })}
        </div>

        <!-- 4 Charts Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 1.5rem; margin-bottom: 1.75rem;">
          <!-- Chart 1: Uptime por Plataforma -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Disponibilidad por Plataforma (%)</h3>
                <div class="card-description">Uptime acumulado en el período ${activePeriod.toUpperCase()}</div>
              </div>
            </div>
            <div class="card-body">
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas id="report-uptime-chart"></canvas>
              </div>
            </div>
          </div>

          <!-- Chart 2: Tendencia de Matrículas -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Evolución de Matrículas en el Tiempo</h3>
                <div class="card-description">Inscripciones registradas por semana</div>
              </div>
            </div>
            <div class="card-body">
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas id="report-enrol-chart"></canvas>
              </div>
            </div>
          </div>

          <!-- Chart 3: Tasa de Finalización por Categoría -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Retención y Finalización por Área (%)</h3>
                <div class="card-description">Alumnos que completan actividades y exámenes</div>
              </div>
            </div>
            <div class="card-body">
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas id="report-completion-chart"></canvas>
              </div>
            </div>
          </div>

          <!-- Chart 4: Tiempo de Respuesta de Incidencias -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Tiempo Medio de Resolución (MTTR)</h3>
                <div class="card-description">Horas de respuesta por categoría de ticket</div>
              </div>
            </div>
            <div class="card-body">
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas id="report-mttr-chart"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Comparative Platform Summary Table -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Comparativa de Salud & Rendimiento por Campus Moodle</h3>
              <div class="card-description">Resumen consolidado para comités académicos y de auditoría de TI</div>
            </div>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Plataforma / Campus</th>
                  <th>Versión Moodle</th>
                  <th>Uptime SLA</th>
                  <th>Latencia Media</th>
                  <th>Usuarios Registrados</th>
                  <th>Cursos Activos</th>
                  <th>Certificado SSL</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${platforms.map(p => `
                  <tr>
                    <td>
                      <div style="font-weight: 700; color: var(--text);">${window.security.escapeHtml(p.name)}</div>
                      <div style="font-size: 0.775rem; color: var(--muted);">${window.security.escapeHtml(p.institution || 'Universidad')}</div>
                    </td>
                    <td>
                      <span class="badge badge-secondary" style="font-size: 0.75rem;">
                        ${window.security.escapeHtml(p.version)}
                      </span>
                    </td>
                    <td>
                      <div style="font-weight: 700; color: var(--success);">
                        ${p.id === 'plat-3' ? '99.45%' : '99.92%'}
                      </div>
                    </td>
                    <td>
                      <span style="font-family: monospace; font-size: 0.8125rem;">${p.responseTimeMs || 150} ms</span>
                    </td>
                    <td style="font-weight: 600;">
                      ${(p.usersCount || 0).toLocaleString()}
                    </td>
                    <td style="font-weight: 600;">
                      ${p.coursesCount || 0}
                    </td>
                    <td>
                      ${p.sslValid 
                        ? '<span class="badge badge-success"><i data-lucide="lock" style="width: 12px; height: 12px;"></i> Válido</span>' 
                        : '<span class="badge badge-error">Expirado</span>'}
                    </td>
                    <td>
                      ${p.status === 'active' 
                        ? window.widgets.statusBadge('active', 'Operativo')
                        : window.widgets.statusBadge('maintenance', 'En Mantenimiento')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    /* ==========================================================================
       TAB 2: MATRÍCULAS & CURSOS
       ========================================================================== */
    _renderEnrollmentsTab: function (state) {
      const scheduledCount = (state.scheduledBatches || []).filter(b => b.status === 'scheduled').length;

      return `
        <div class="metrics-grid">
          ${window.widgets.metricCard({
            label: 'Matrículas Totales',
            value: state.enrollments.length,
            trend: { value: '+18.2%', isPositive: true },
            subtext: 'en el período seleccionado',
            icon: '<i data-lucide="users"></i>',
            colorClass: 'primary'
          })}
          ${window.widgets.metricCard({
            label: 'Lotes en Horario Específico',
            value: (state.scheduledBatches || []).length,
            trend: { value: `${scheduledCount} pendientes`, isPositive: true },
            subtext: 'programados fuera de pico',
            icon: '<i data-lucide="clock"></i>',
            colorClass: 'warning'
          })}
          ${window.widgets.metricCard({
            label: 'Cursos con Alta Demanda',
            value: state.courses.filter(c => c.studentsCount > 50).length,
            trend: { value: 'Capacidad >80%', isPositive: true },
            subtext: 'de un total de ' + state.courses.length,
            icon: '<i data-lucide="book-open"></i>',
            colorClass: 'success'
          })}
          ${window.widgets.metricCard({
            label: 'Tasa de Éxito en Inscripción',
            value: '98.5%',
            trend: { value: '0 rechazos', isPositive: true },
            subtext: 'sincronización con Moodle API',
            icon: '<i data-lucide="check-check"></i>',
            colorClass: 'info'
          })}
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 1.5rem; margin-bottom: 1.75rem;">
          <!-- Chart Donut: Métodos de Matrícula -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Distribución por Método de Matrícula</h3>
                <div class="card-description">Porcentaje de alumnos según canal de asignación</div>
              </div>
            </div>
            <div class="card-body">
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas id="report-method-donut"></canvas>
              </div>
            </div>
          </div>

          <!-- Chart Bar: Top Cursos -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Top Cursos con Mayor Volumen</h3>
                <div class="card-description">Asignaturas con mayor número de alumnos activos</div>
              </div>
            </div>
            <div class="card-body">
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas id="report-top-courses"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Cursos Table -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Desglose Detallado de Cursos y Ratios de Matrícula</h3>
              <div class="card-description">Métricas de ocupación, profesores asignados y categoría académica</div>
            </div>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Asignatura</th>
                  <th>Campus Moodle</th>
                  <th>Categoría</th>
                  <th>Alumnos Matriculados</th>
                  <th>Docentes</th>
                  <th>Ratio Alumno/Docente</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${state.courses.map(c => `
                  <tr>
                    <td>
                      <div style="font-weight: 700; color: var(--text);">${window.security.escapeHtml(c.fullname)}</div>
                      <div style="font-size: 0.75rem; color: var(--primary);">${window.security.escapeHtml(c.shortname)}</div>
                    </td>
                    <td>
                      <span class="badge badge-secondary" style="font-size: 0.75rem;">
                        ${window.security.escapeHtml(c.platformName)}
                      </span>
                    </td>
                    <td style="font-size: 0.8125rem; color: var(--muted);">
                      ${window.security.escapeHtml(c.categoryName || 'General')}
                    </td>
                    <td>
                      <div style="font-weight: 700; color: var(--text);">
                        ${c.studentsCount || 0} alumnos
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-info" style="font-size: 0.75rem;">
                        ${c.teachersCount || 1} docentes
                      </span>
                    </td>
                    <td style="font-weight: 600; font-family: monospace;">
                      1 : ${Math.round((c.studentsCount || 0) / (c.teachersCount || 1))}
                    </td>
                    <td>
                      ${c.status === 'active' 
                        ? window.widgets.statusBadge('active', 'Activo') 
                        : window.widgets.statusBadge('inactive', 'Borrador')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    /* ==========================================================================
       TAB 3: AUDITORÍA & SEGURIDAD
       ========================================================================== */
    _renderSecurityTab: function (state) {
      return `
        <div class="metrics-grid">
          ${window.widgets.metricCard({
            label: 'Eventos de Auditoría',
            value: state.auditLogs.length,
            trend: { value: '100% trazables', isPositive: true },
            subtext: 'registros inmutables',
            icon: '<i data-lucide="shield"></i>',
            colorClass: 'primary'
          })}
          ${window.widgets.metricCard({
            label: 'Tokens Web Service',
            value: 'Activos (Válidos)',
            trend: { value: 'Expiran en 78d', isPositive: true },
            subtext: 'cifrado SHA-256',
            icon: '<i data-lucide="key"></i>',
            colorClass: 'success'
          })}
          ${window.widgets.metricCard({
            label: 'Intentos Fallidos Bloqueados',
            value: '0',
            trend: { value: 'Seguridad óptima', isPositive: true },
            subtext: 'rate limiting activo',
            icon: '<i data-lucide="lock"></i>',
            colorClass: 'info'
          })}
          ${window.widgets.metricCard({
            label: 'Webhooks Salientes',
            value: '42 entregados',
            trend: { value: '100% ack', isPositive: true },
            subtext: 'firmados HMAC',
            icon: '<i data-lucide="webhook"></i>',
            colorClass: 'warning'
          })}
        </div>

        <!-- Security Activity Timeline Chart -->
        <div class="card" style="margin-bottom: 1.75rem;">
          <div class="card-header">
            <div>
              <h3 class="card-title">Distribución Horaria de Peticiones y Accesos</h3>
              <div class="card-description">Monitoreo de tráfico a través de la API para prevención de anomalías</div>
            </div>
          </div>
          <div class="card-body">
            <div style="position: relative; height: 260px; width: 100%;">
              <canvas id="report-security-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Audit Logs Table -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Bitácora Reciente de Operaciones del Sistema</h3>
              <div class="card-description">Registro forense de accesos, creación de lotes, modificaciones y sincronizaciones</div>
            </div>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Operador / Usuario</th>
                  <th>IP Origen</th>
                  <th>Fecha y Hora</th>
                  <th>Detalles del Evento</th>
                </tr>
              </thead>
              <tbody>
                ${state.auditLogs.map(log => `
                  <tr>
                    <td>
                      <span class="badge ${log.action.includes('LOGIN') ? 'badge-info' : log.action.includes('CREATE') ? 'badge-primary' : 'badge-secondary'}" style="font-size: 0.725rem; font-family: monospace;">
                        ${window.security.escapeHtml(log.action)}
                      </span>
                    </td>
                    <td style="font-weight: 600; color: var(--text);">
                      ${window.security.escapeHtml(log.user || 'Sistema')}
                    </td>
                    <td style="font-family: monospace; font-size: 0.8125rem; color: var(--muted);">
                      ${window.security.escapeHtml(log.ip || '127.0.0.1')}
                    </td>
                    <td style="font-size: 0.8125rem; color: var(--muted); white-space: nowrap;">
                      ${new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style="font-size: 0.8125rem; color: var(--text-secondary);">
                      ${window.security.escapeHtml(log.details || '')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    /* ==========================================================================
       TAB 4: GENERADOR DE REPORTES A MEDIDA — FILTRABLE POR ÍTEMS
       Permite elegir categoría, rol, plataforma y agrupación (curso/categoría/rol).
       ========================================================================== */
    _renderBuilderTab: function (state) {
      const categories = [...new Set((state.courses || []).map(c => c.categoryName || 'General'))].sort();
      const roles = [
        { id: 'student', label: 'Estudiante' },
        { id: 'editingteacher', label: 'Profesor Titular' },
        { id: 'teacher', label: 'Profesor Asistente' },
        { id: 'admin', label: 'Administrador' }
      ];
      const teachers = (state.users || []).filter(u => ['editingteacher', 'teacher'].includes(u.role));
      const cycles = [...new Set(((state.teachingAssignments || []).map(a => a.cicloAcademico)) )].sort().reverse();
      return `
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-header">
            <div>
              <h3 class="card-title">Constructor de Informes por Ítems Seleccionados</h3>
              <div class="card-description">Elige categoría, rol, plataforma y agrupación para obtener totales por curso, por categoría y por rol</div>
            </div>
          </div>
          <div class="card-body">
            <form id="custom-report-form" onsubmit="event.preventDefault(); window.reportsPage.generateCustomReport();">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label required">Tipo de Reporte</label>
                  <select class="form-select" id="builder-metric-type" onchange="window.reportsPage.builderMetricChanged(this.value)">
                    <option value="enrollments_by_course">Matrículas por Curso (totales por curso)</option>
                    <option value="enrollments_by_category">Cantidad de Matrículas por Categoría</option>
                    <option value="enrollments_by_role">Matrículas por Rol</option>
                    <option value="enrollments_by_platform">Matrículas por Plataforma / Campus</option>
                    <option value="courses_by_category">Total de Cursos por Categoría</option>
                    <option value="general_summary">Resumen General (totales a nivel global)</option>
                    <option value="teaching_by_teacher">Docencia por Docente (cursos impartidos)</option>
                    <option value="teaching_by_cycle">Docencia por Ciclo Académico</option>
                    <option value="teaching_by_campus">Docencia por Recinto / Plataforma</option>
                    <option value="teaching_detail">Detalle de Docencia (fila por fila)</option>
                    <option value="activity_by_course">Progreso Promedio por Curso</option>
                    <option value="activity_at_risk">Estudiantes en Riesgo</option>
                    <option value="academic_by_category">Casos Académicos por Categoría</option>
                    <option value="academic_by_teacher">Casos por Docente (trazabilidad)</option>
                    <option value="academic_sla">Cumplimiento de SLA Académico</option>
                    <option value="enrollments">Detalle de Matrículas (fila por fila)</option>
                    <option value="scheduled_batches">Lotes de Matrícula Programados</option>
                    <option value="platforms_health">Salud y Disponibilidad de Moodle</option>
                    <option value="courses_catalog">Detalle de Cursos con Totales</option>
                    <option value="security_audit">Auditoría Forense y Accesos</option>
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Agrupar por</label>
                  <select class="form-select" id="builder-groupby">
                    <option value="auto">Automática (según tipo)</option>
                    <option value="course">Curso</option>
                    <option value="category">Categoría</option>
                    <option value="role">Rol</option>
                    <option value="platform">Plataforma / Campus</option>
                    <option value="method">Método de matrícula</option>
                    <option value="detail">Sin agrupar (detalle fila por fila)</option>
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label required">Campus / Plataforma</label>
                  <select class="form-select" id="builder-platform">
                    <option value="all">Todos los Campus</option>
                    ${state.platforms.map(p => `
                      <option value="${p.id}">${window.security.escapeHtml(p.name)}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label required">Rango Temporal</label>
                  <select class="form-select" id="builder-range">
                    <option value="7d">Últimos 7 Días</option>
                    <option value="30d" selected>Últimos 30 Días</option>
                    <option value="90d">Último Trimestre (90 Días)</option>
                    <option value="1y">Año Académico Completo</option>
                    <option value="all">Todo el historial</option>
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label required">Formato de Salida</label>
                  <select class="form-select" id="builder-format">
                    <option value="screen">Visualización en Pantalla</option>
                    <option value="csv">Descargar Archivo CSV / Excel</option>
                    <option value="pdf">Vista Previa para Impresión / PDF</option>
                  </select>
                </div>
              </div>

              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1rem; margin-bottom:1rem;">
                <div class="form-group" style="margin-bottom:0; border:1px solid var(--border); border-radius:8px; padding:0.75rem; background:var(--bg-alt);">
                  <label class="form-label" style="margin-bottom:0.5rem;">Categorías a incluir <span style="font-weight:400; color:var(--muted);">(vacío = todas)</span></label>
                  <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                    ${categories.map(cat => `
                      <label style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.8125rem; cursor:pointer; background:var(--card); border:1px solid var(--border); border-radius:999px; padding:0.25rem 0.6rem;">
                        <input type="checkbox" class="builder-cat" value="${window.security.escapeHtml(cat)}" checked /> ${window.security.escapeHtml(cat)}
                      </label>
                    `).join('')}
                  </div>
                  <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="window.reportsPage.builderToggleFilters('builder-cat', true)">Marcar todas</button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="window.reportsPage.builderToggleFilters('builder-cat', false)">Limpiar</button>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom:0; border:1px solid var(--border); border-radius:8px; padding:0.75rem; background:var(--bg-alt);">
                  <label class="form-label" style="margin-bottom:0.5rem;">Roles a incluir <span style="font-weight:400; color:var(--muted);">(vacío = todos)</span></label>
                  <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                    ${roles.map(r => `
                      <label style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.8125rem; cursor:pointer; background:var(--card); border:1px solid var(--border); border-radius:999px; padding:0.25rem 0.6rem;">
                        <input type="checkbox" class="builder-role" value="${r.id}" checked /> ${r.label}
                      </label>
                    `).join('')}
                  </div>
                  <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="window.reportsPage.builderToggleFilters('builder-role', true)">Marcar todos</button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="window.reportsPage.builderToggleFilters('builder-role', false)">Limpiar</button>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom:0; border:1px solid var(--border); border-radius:8px; padding:0.75rem; background:var(--bg-alt);">
                  <label class="form-label" style="margin-bottom:0.5rem;">Docentes (Data Docente) <span style="font-weight:400; color:var(--muted);">(solo reportes de docencia)</span></label>
                  <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                    ${teachers.length ? teachers.map(t => `
                      <label style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.8125rem; cursor:pointer; background:var(--card); border:1px solid var(--border); border-radius:999px; padding:0.25rem 0.6rem;">
                        <input type="checkbox" class="builder-teacher" value="${t.id}" checked /> ${window.security.escapeHtml(t.firstname + ' ' + t.lastname)}
                      </label>
                    `).join('') : '<span style="font-size:0.8125rem; color:var(--muted);">Sin docentes registrados.</span>'}
                  </div>
                  <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="window.reportsPage.builderToggleFilters('builder-teacher', true)">Marcar todos</button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="window.reportsPage.builderToggleFilters('builder-teacher', false)">Limpiar</button>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom:0; border:1px solid var(--border); border-radius:8px; padding:0.75rem; background:var(--bg-alt);">
                  <label class="form-label" style="margin-bottom:0.5rem;">Ciclos académicos <span style="font-weight:400; color:var(--muted);">(solo reportes de docencia)</span></label>
                  <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                    ${cycles.length ? cycles.map(cy => `
                      <label style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.8125rem; cursor:pointer; background:var(--card); border:1px solid var(--border); border-radius:999px; padding:0.25rem 0.6rem;">
                        <input type="checkbox" class="builder-cycle" value="${window.security.escapeHtml(cy)}" checked /> ${window.security.escapeHtml(cy)}
                      </label>
                    `).join('') : '<span style="font-size:0.8125rem; color:var(--muted);">Sin ciclos registrados.</span>'}
                  </div>
                  <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="window.reportsPage.builderToggleFilters('builder-cycle', true)">Marcar todos</button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="window.reportsPage.builderToggleFilters('builder-cycle', false)">Limpiar</button>
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                <button type="submit" class="btn btn-primary">
                  <i data-lucide="play"></i> Generar Reporte
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Builder Results Container -->
        <div id="builder-results-area" class="card" style="display: none;">
          <div class="card-header" style="justify-content: space-between; align-items: center;">
            <div>
              <h3 class="card-title" id="builder-results-title">Resultados del Informe Generado</h3>
              <div class="card-description" id="builder-results-meta">Filtro aplicado</div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="window.reportsPage.downloadBuilderCSV()">
                <i data-lucide="download"></i> Descargar CSV
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.print()">
                <i data-lucide="printer"></i> Imprimir Reporte
              </button>
            </div>
          </div>
          <div class="card-body" style="padding-top: 0;">
            <div id="builder-kpi-wrap" style="margin-bottom:1rem;"></div>
            <div id="builder-chart-wrap" style="position:relative; height:280px; width:100%; margin-bottom:1rem; display:none;">
              <canvas id="builder-chart"></canvas>
            </div>
            <div id="builder-table-wrap" class="table-container"></div>
          </div>
        </div>
      `;
    },

    builderToggleFilters: function (cls, check) {
      document.querySelectorAll('.' + cls).forEach(el => { el.checked = check; });
    },

    builderMetricChanged: function (type) {
      const map = {
        enrollments_by_course: 'course',
        enrollments_by_category: 'category',
        enrollments_by_role: 'role',
        enrollments_by_platform: 'platform',
        courses_by_category: 'category',
        general_summary: 'auto',
        teaching_by_teacher: 'course',
        teaching_by_cycle: 'category',
        teaching_by_campus: 'platform',
        teaching_detail: 'detail',
        activity_by_course: 'course',
        activity_at_risk: 'detail',
        academic_by_category: 'category',
        academic_by_teacher: 'course',
        academic_sla: 'detail'
      };
      const groupEl = document.getElementById('builder-groupby');
      if (groupEl && map[type]) groupEl.value = map[type];
    },

    _builderSelectedSet: function (selector) {
      const s = new Set();
      document.querySelectorAll(selector + ':checked').forEach(el => s.add(el.value));
      return s;
    },

    _builderInRange: function (isoDate, range) {
      if (!isoDate || range === 'all') return true;
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const days = daysMap[range];
      if (!days) return true;
      const cutoff = Date.now() - days * 86400000;
      return new Date(isoDate).getTime() >= cutoff;
    },

    _builderSumRows: function (rows, colIdx) {
      return rows.reduce((acc, r) => acc + (parseInt(r[colIdx], 10) || 0), 0);
    },

    /* ==========================================================================
       GENERACIÓN DINÁMICA: filtro por categoría/rol + agrupación + totales
       ========================================================================== */
    generateCustomReport: function () {
      const type = document.getElementById('builder-metric-type').value;
      const groupBy = document.getElementById('builder-groupby')?.value || 'auto';
      const platformId = document.getElementById('builder-platform').value;
      const range = document.getElementById('builder-range').value;
      const format = document.getElementById('builder-format').value;

      const state = window.store.getState();
      const resultsArea = document.getElementById('builder-results-area');
      const resultsTitle = document.getElementById('builder-results-title');
      const resultsMeta = document.getElementById('builder-results-meta');
      const tableWrap = document.getElementById('builder-table-wrap');
      const kpiWrap = document.getElementById('builder-kpi-wrap');
      const chartWrap = document.getElementById('builder-chart-wrap');

      const selectedCats = this._builderSelectedSet('.builder-cat');
      const selectedRoles = this._builderSelectedSet('.builder-role');
      const courseById = new Map((state.courses || []).map(c => [c.id, c]));

      const filterCourses = (list) => list.filter(c => {
        if (platformId !== 'all' && c.platformId !== platformId) return false;
        if (selectedCats.size > 0 && selectedCats.size < [...new Set((state.courses || []).map(x => x.categoryName || 'General'))].length) {
          // Solo filtra si el usuario desmarcó al menos una (para evitar filtrar todo cuando nada marcado en vista parcial)
          // Si ninguno marcado, considerar vacío = todas. Si todos marcados, todas.
          // Detectamos: si checked < total, aplicar filtro; si checked == 0, tratar como todas.
        }
        return true;
      });

      // Helper: ¿aplica filtro de categoría? (vacío de checks = todas)
      const totalCats = [...new Set((state.courses || []).map(c => c.categoryName || 'General'))].length;
      const useCatFilter = selectedCats.size > 0 && selectedCats.size < totalCats;
      const totalRoles = 4;
      const useRoleFilter = selectedRoles.size > 0 && selectedRoles.size < totalRoles;

      const catOfCourse = (courseId) => {
        const c = courseById.get(courseId);
        return c ? (c.categoryName || 'General') : 'General';
      };
      const catOfEnrollment = (e) => {
        if (e.courseId && courseById.has(e.courseId)) return courseById.get(e.courseId).categoryName || 'General';
        return e.categoryName || 'General';
      };

      const applyEnrollmentFilters = (list) => list.filter(e => {
        if (platformId !== 'all' && e.platformId !== platformId) return false;
        if (useCatFilter && !selectedCats.has(catOfEnrollment(e))) return false;
        if (useRoleFilter && !selectedRoles.has(e.role)) return false;
        if (!this._builderInRange(e.enrolledAt, range)) return false;
        return true;
      });

      const applyCourseFilters = (list) => list.filter(c => {
        if (platformId !== 'all' && c.platformId !== platformId) return false;
        if (useCatFilter && !selectedCats.has(c.categoryName || 'General')) return false;
        return true;
      });

      let rows = [];
      let headers = [];
      let title = '';
      let chartLabels = [];
      let chartValues = [];
      let kpis = null;

      // Resolver agrupación efectiva
      const effectiveGroup = groupBy === 'auto'
        ? ({ enrollments_by_course: 'course', enrollments_by_category: 'category', enrollments_by_role: 'role', enrollments_by_platform: 'platform', courses_by_category: 'category', teaching_by_teacher: 'course', teaching_by_cycle: 'category', teaching_by_campus: 'platform', teaching_detail: 'detail' }[type] || 'detail')
        : groupBy;

      // Filtros docencia: docentes y ciclos (si no hay checks, se consideran todos)
      const selectedTeachers = this._builderSelectedSet('.builder-teacher');
      const selectedCycles = this._builderSelectedSet('.builder-cycle');
      const totalTeachers = (state.users || []).filter(u => ['editingteacher', 'teacher'].includes(u.role)).length;
      const totalCycles = [...new Set((state.teachingAssignments || []).map(a => a.cicloAcademico))].length;
      const useTeacherFilter = selectedTeachers.size > 0 && selectedTeachers.size < totalTeachers;
      const useCycleFilter = selectedCycles.size > 0 && selectedCycles.size < totalCycles;
      const applyTeachingFilters = (list) => list.filter(a => {
        if (platformId !== 'all' && a.platformId !== platformId) return false;
        if (useCatFilter && !selectedCats.has(a.categoryName || 'General')) return false;
        if (useTeacherFilter && !selectedTeachers.has(a.teacherId)) return false;
        if (useCycleFilter && !selectedCycles.has(a.cicloAcademico)) return false;
        return true;
      });

      if (type === 'academic_by_category' || type === 'academic_by_teacher' || type === 'academic_sla') {
        const cases = (state.academicCases || []).filter(c => {
          if (platformId!=='all' && c.platformId!==platformId) return false;
          if (useCatFilter && !selectedCats.has((courseById.get(c.courseId)?.categoryName || 'General'))) return false;
          if (useTeacherFilter && !selectedTeachers.has(c.teacherId)) return false;
          if (useCycleFilter && !selectedCycles.has(c.cicloAcademico)) return false;
          return true;
        });
        const SLA_HOURS_R = { critical: 4, high: 24, medium: 48, low: 96 };
        const slaState = (c) => {
          const hours = c.slaHours || SLA_HOURS_R[c.priority] || 48;
          const due = c.slaDue ? new Date(c.slaDue).getTime() : (new Date(c.createdAt).getTime() + hours*3600000);
          const breached = c.status!=='resolved' && Date.now()>due;
          return { breached, due };
        };
        if (type === 'academic_by_category') {
          title = 'Casos Académicos por Categoría';
          headers = ['Categoría', 'Casos', 'Abiertos', 'Resueltos', 'Incumplen SLA'];
          const grouped = new Map();
          cases.forEach(a=>{
            const key = a.category || 'general';
            if (!grouped.has(key)) grouped.set(key, { cat:key, total:0, open:0, resolved:0, breached:0 });
            const g = grouped.get(key);
            g.total++; if (a.status==='open') g.open++; if (a.status==='resolved') g.resolved++; if (slaState(a).breached) g.breached++;
          });
          const catLabels = { duda_academica:'Duda académica', reclamo_notas:'Reclamo de notas', reincorporacion:'Reincorporación', reclamo_matricula:'Reclamo de matrícula', certificado:'Certificado', desercion:'Riesgo de deserción', general:'General' };
          rows = [...grouped.values()].sort((a,b)=>b.total-a.total).map(g=>[catLabels[g.cat]||g.cat, String(g.total), String(g.open), String(g.resolved), String(g.breached)]);
          chartLabels = rows.map(r=>r[0]); chartValues = rows.map(r=>parseInt(r[1],10)||0);
          kpis = { totalLabel:'Casos totales', total:String(cases.length), extra:`${rows.length} categoría(s) • ${cases.filter(c=>slaState(c).breached).length} incumplen SLA` };
        } else if (type === 'academic_by_teacher') {
          title = 'Casos por Docente (trazabilidad a Data Docente)';
          headers = ['Docente', 'Casos', 'Abiertos', 'En seguimiento', 'Resueltos', 'Incumplen SLA'];
          const grouped = new Map();
          cases.forEach(a=>{
            const key = a.teacherId || 'sin-docente';
            if (!grouped.has(key)) grouped.set(key, { teacher:a.teacherName||'Sin docente', total:0, open:0, prog:0, resolved:0, breached:0 });
            const g = grouped.get(key);
            g.total++; if (a.status==='open') g.open++; if (a.status==='in_progress' || a.status==='waiting_student') g.prog++; if (a.status==='resolved') g.resolved++; if (slaState(a).breached) g.breached++;
          });
          rows = [...grouped.values()].sort((a,b)=>b.total-a.total).map(g=>[g.teacher, String(g.total), String(g.open), String(g.prog), String(g.resolved), String(g.breached)]);
          chartLabels = rows.map(r=>r[0].length>22? r[0].slice(0,22)+'…': r[0]); chartValues = rows.map(r=>parseInt(r[1],10)||0);
          kpis = { totalLabel:'Casos totales', total:String(cases.length), extra:`${rows.length} docente(s)` };
        } else {
          title = 'Cumplimiento de SLA Académico';
          headers = ['Caso', 'Estudiante', 'Docente', 'Categoría', 'Prioridad', 'Estado', 'Vence', 'SLA'];
          rows = cases.map(a=>{ const s=slaState(a); return [a.title, a.studentName, a.teacherName||'—', a.category, a.priority, a.status, new Date(a.slaDue||a.createdAt).toLocaleString(), s.breached? 'INCUMPLIDO' : 'OK']; });
          chartLabels = []; chartValues = [];
          const breached = cases.filter(c=>slaState(c).breached).length;
          kpis = { totalLabel:'Casos totales', total:String(cases.length), extra:`${breached} incumplen SLA` };
        }
      } else if (type === 'activity_by_course' || type === 'activity_at_risk') {
        // Progreso derivado de enrollments + fallback determinista
        const courseMap2 = new Map((state.courses||[]).map(c=>[c.id,c]));
        const enriched = [...(state.enrollments||[])].filter(e=>e.status!=='failed').map(e=>{
          const lastAccessAt = e.lastAccessAt || e.enrolledAt || new Date().toISOString();
          const hoursAgo = Math.max(0, (Date.now()-new Date(lastAccessAt).getTime())/3600000);
          const progress = e.progressPercent!=null? e.progressPercent : 0;
          let risk = 'Bajo';
          if (progress < 40 && hoursAgo > 72) risk='Alto';
          else if (progress < 70 && hoursAgo > 48) risk='Medio';
          else if (progress < 30) risk='Medio';
          return { ...e, progress, hoursAgo, risk };
        });
        let filteredAct = enriched.filter(e=>{
          if (platformId!=='all' && e.platformId!==platformId) return false;
          if (useCatFilter) {
            const cat = courseMap2.get(e.courseId)?.categoryName || 'General';
            if (!selectedCats.has(cat)) return false;
          }
          if (useRoleFilter && !selectedRoles.has(e.role)) return false;
          return true;
        });
        if (type === 'activity_by_course') {
          title = 'Progreso Promedio por Curso';
          headers = ['Código curso', 'Curso', 'Matrículas', 'Progreso promedio %', 'En riesgo', 'Nota prom.'];
          const grouped = new Map();
          filteredAct.forEach(e=>{
            const key = e.courseId || e.courseName;
            if (!grouped.has(key)) grouped.set(key, { courseId:e.courseId, courseName:e.courseName, platformName:e.platformName, sums:0, count:0, risk:0, grades:[] });
            const g = grouped.get(key);
            g.sums += (e.progress||0); g.count++; if (e.risk==='Alto') g.risk++;
            if (e.grade!=null) g.grades.push(e.grade);
          });
          rows = [...grouped.values()].sort((a,b)=> (b.sums/b.count)-(a.sums/a.count)).map(g=>{
            const c = courseMap2.get(g.courseId);
            const avgP = g.count? Math.round(g.sums/g.count) : 0;
            const avgG = g.grades.length? (g.grades.reduce((a,b)=>a+b,0)/g.grades.length).toFixed(1) : '—';
            return [c? c.shortname : '—', g.courseName, String(g.count), String(avgP)+'%', String(g.risk), String(avgG)];
          });
          chartLabels = rows.map(r=>r[0]); chartValues = rows.map(r=>parseInt(r[3],10)||0);
          kpis = { totalLabel:'Progreso promedio global', total: String(filteredAct.length? Math.round(filteredAct.reduce((a,e)=>a+(e.progress||0),0)/filteredAct.length) : 0)+'%', extra:`${rows.length} curso(s)` };
        } else {
          title = 'Estudiantes en Riesgo (progreso bajo / inactivos)';
          headers = ['Estudiante', 'Email', 'Curso', 'Progreso %', 'Última actividad', 'Riesgo'];
          const atRisk = filteredAct.filter(e=> e.risk!=='Bajo').sort((a,b)=> (a.progress||0)-(b.progress||0));
          rows = atRisk.map(e=> [e.userName, e.userEmail, e.courseName, String(e.progress)+'%', `hace ${Math.round(e.hoursAgo)}h`, e.risk]);
          chartLabels = rows.slice(0,10).map(r=>r[0].length>18? r[0].slice(0,18)+'…': r[0]);
          chartValues = rows.slice(0,10).map(r=>parseInt(r[3],10)||0);
          kpis = { totalLabel:'En riesgo', total: String(rows.length), extra:'requieren seguimiento' };
        }
      } else if (type === 'teaching_by_teacher' || type === 'teaching_by_cycle' || type === 'teaching_by_campus' || type === 'teaching_detail') {
        const teachingList = applyTeachingFilters([...(state.teachingAssignments || [])]);
        if (type === 'teaching_detail') {
          title = 'Detalle de Docencia (fila por fila)';
          headers = ['Docente', 'Curso', 'Ciclo Académico', 'Recinto / Plataforma', 'Categoría', 'Estado', 'Periodo'];
          rows = teachingList.map(a => [
            a.teacherName || a.teacherId, `${a.shortname || ''} — ${a.courseName || ''}`.trim(), a.cicloAcademico || '—',
            a.platformName || '—', a.categoryName || 'General', a.status || '—',
            `${a.startDate || ''} → ${a.endDate || ''}`
          ]);
          chartLabels = []; chartValues = [];
          kpis = { totalLabel: 'Asignaciones totales', total: String(teachingList.length), extra: `${new Set(teachingList.map(a => a.teacherId)).size} docente(s) • ${new Set(teachingList.map(a => a.cicloAcademico)).size} ciclo(s)` };
        } else if (type === 'teaching_by_teacher') {
          title = 'Cursos Impartidos por Docente';
          headers = ['Docente', 'Cursos totales', 'Cursos impartiendo', 'Cursos completados', 'Ciclos', 'Recintos', 'Cursos impartidos (detalle)'];
          const grouped = new Map();
          teachingList.forEach(a => {
            const key = a.teacherId || a.teacherName;
            if (!grouped.has(key)) grouped.set(key, { teacher: a.teacherName || key, total: 0, impartiendo: 0, completado: 0, ciclos: new Set(), recintos: new Set(), detalle: [] });
            const g = grouped.get(key);
            g.total++; if (a.status === 'impartiendo') g.impartiendo++; if (a.status === 'completado') g.completado++;
            g.ciclos.add(a.cicloAcademico); g.recintos.add(a.platformName); g.detalle.push(`${a.shortname} (${a.cicloAcademico})`);
          });
          rows = [...grouped.values()].sort((a, b) => b.total - a.total).map(g => [
            g.teacher, String(g.total), String(g.impartiendo), String(g.completado),
            [...g.ciclos].join(', '), [...g.recintos].join(', '), g.detalle.join(' • ')
          ]);
          chartLabels = rows.map(r => r[0].length > 22 ? r[0].slice(0, 22) + '…' : r[0]);
          chartValues = rows.map(r => parseInt(r[1], 10) || 0);
          kpis = { totalLabel: 'Asignaciones totales', total: String(teachingList.length), extra: `${rows.length} docente(s)` };
        } else if (type === 'teaching_by_cycle') {
          title = 'Docencia por Ciclo Académico';
          headers = ['Ciclo Académico', 'Asignaciones', 'Docentes distintos', 'Cursos distintos', 'Impartiendo', 'Completados'];
          const grouped = new Map();
          teachingList.forEach(a => {
            const key = a.cicloAcademico || 'Sin ciclo';
            if (!grouped.has(key)) grouped.set(key, { ciclo: key, total: 0, docentes: new Set(), cursos: new Set(), impartiendo: 0, completado: 0 });
            const g = grouped.get(key);
            g.total++; g.docentes.add(a.teacherId); g.cursos.add(a.courseId);
            if (a.status === 'impartiendo') g.impartiendo++; if (a.status === 'completado') g.completado++;
          });
          rows = [...grouped.values()].sort((a, b) => b.total - a.total).map(g => [
            g.ciclo, String(g.total), String(g.docentes.size), String(g.cursos.size), String(g.impartiendo), String(g.completado)
          ]);
          chartLabels = rows.map(r => r[0]); chartValues = rows.map(r => parseInt(r[1], 10) || 0);
          kpis = { totalLabel: 'Asignaciones totales', total: String(teachingList.length), extra: `${rows.length} ciclo(s)` };
        } else if (type === 'teaching_by_campus') {
          title = 'Docencia por Recinto / Plataforma';
          headers = ['Recinto / Plataforma', 'Asignaciones', 'Docentes distintos', 'Cursos distintos', 'Categorías', 'Ciclos'];
          const grouped = new Map();
          teachingList.forEach(a => {
            const key = a.platformName || 'Sin recinto';
            if (!grouped.has(key)) grouped.set(key, { recinto: key, total: 0, docentes: new Set(), cursos: new Set(), cats: new Set(), ciclos: new Set() });
            const g = grouped.get(key);
            g.total++; g.docentes.add(a.teacherId); g.cursos.add(a.courseId); g.cats.add(a.categoryName || 'General'); g.ciclos.add(a.cicloAcademico);
          });
          rows = [...grouped.values()].sort((a, b) => b.total - a.total).map(g => [
            g.recinto, String(g.total), String(g.docentes.size), String(g.cursos.size), [...g.cats].join(', '), [...g.ciclos].join(', ')
          ]);
          chartLabels = rows.map(r => r[0].length > 20 ? r[0].slice(0, 20) + '…' : r[0]);
          chartValues = rows.map(r => parseInt(r[1], 10) || 0);
          kpis = { totalLabel: 'Asignaciones totales', total: String(teachingList.length), extra: `${rows.length} recinto(s)` };
        }
      } else if (type === 'enrollments_by_course' || (type === 'enrollments' && effectiveGroup === 'course')) {
        title = 'Matrículas por Curso — Totales por curso';
        headers = ['Código curso', 'Curso', 'Categoría', 'Plataforma', 'Total matrículas', 'Participación %'];
        const list = applyEnrollmentFilters([...state.enrollments]);
        const grouped = new Map();
        list.forEach(e => {
          const key = e.courseId || e.courseName;
          if (!grouped.has(key)) grouped.set(key, { courseId: e.courseId, courseName: e.courseName, platformName: e.platformName, count: 0 });
          grouped.get(key).count++;
        });
        const total = list.length || 1;
        rows = [...grouped.values()].sort((a, b) => b.count - a.count).map(g => {
          const c = courseById.get(g.courseId);
          return [c ? c.shortname : '—', g.courseName, catOfCourse(g.courseId), g.platformName, String(g.count), ((g.count / total) * 100).toFixed(1) + '%'];
        });
        chartLabels = rows.map(r => r[0]);
        chartValues = rows.map(r => parseInt(r[4], 10) || 0);
        kpis = { totalLabel: 'Matrículas (suma de grupos)', total: String(list.length), extra: `${rows.length} curso(s)` };
      } else if (type === 'enrollments_by_category' || (type === 'enrollments' && effectiveGroup === 'category')) {
        title = 'Cantidad de Matrículas por Categoría';
        headers = ['Categoría', 'Cursos', 'Matrículas', 'Participación %'];
        const list = applyEnrollmentFilters([...state.enrollments]);
        const grouped = new Map();
        list.forEach(e => {
          const cat = catOfEnrollment(e);
          if (!grouped.has(cat)) grouped.set(cat, { cat, count: 0, courses: new Set() });
          grouped.get(cat).count++;
          if (e.courseId) grouped.get(cat).courses.add(e.courseId);
        });
        const total = list.length || 1;
        rows = [...grouped.values()].sort((a, b) => b.count - a.count).map(g => [
          g.cat, String(g.courses.size), String(g.count), ((g.count / total) * 100).toFixed(1) + '%'
        ]);
        chartLabels = rows.map(r => r[0]);
        chartValues = rows.map(r => parseInt(r[2], 10) || 0);
        kpis = { totalLabel: 'Matrículas totales', total: String(list.length), extra: `${rows.length} categoría(s)` };
      } else if (type === 'enrollments_by_role' || (type === 'enrollments' && effectiveGroup === 'role')) {
        title = 'Matrículas por Rol';
        headers = ['Rol', 'Matrículas', 'Participación %'];
        const roleLabels = { student: 'Estudiante', editingteacher: 'Profesor Titular', teacher: 'Profesor Asistente', admin: 'Administrador' };
        const list = applyEnrollmentFilters([...state.enrollments]);
        const grouped = new Map();
        list.forEach(e => {
          const r = e.role || 'student';
          grouped.set(r, (grouped.get(r) || 0) + 1);
        });
        const total = list.length || 1;
        rows = [...grouped.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => [
          roleLabels[r] || r, String(n), ((n / total) * 100).toFixed(1) + '%'
        ]);
        chartLabels = rows.map(r => r[0]);
        chartValues = rows.map(r => parseInt(r[1], 10) || 0);
        kpis = { totalLabel: 'Matrículas totales', total: String(list.length), extra: `${rows.length} rol(es)` };
      } else if (type === 'enrollments_by_platform' || (type === 'enrollments' && effectiveGroup === 'platform')) {
        title = 'Matrículas por Plataforma / Campus';
        headers = ['Plataforma', 'Cursos distintos', 'Matrículas', 'Participación %'];
        const list = applyEnrollmentFilters([...state.enrollments]);
        const grouped = new Map();
        list.forEach(e => {
          const key = e.platformName || e.platformId;
          if (!grouped.has(key)) grouped.set(key, { name: key, count: 0, courses: new Set() });
          grouped.get(key).count++;
          if (e.courseId) grouped.get(key).courses.add(e.courseId);
        });
        const total = list.length || 1;
        rows = [...grouped.values()].sort((a, b) => b.count - a.count).map(g => [
          g.name, String(g.courses.size), String(g.count), ((g.count / total) * 100).toFixed(1) + '%'
        ]);
        chartLabels = rows.map(r => r[0]);
        chartValues = rows.map(r => parseInt(r[2], 10) || 0);
        kpis = { totalLabel: 'Matrículas totales', total: String(list.length), extra: `${rows.length} plataforma(s)` };
      } else if (type === 'courses_by_category') {
        title = 'Total de Cursos por Categoría';
        headers = ['Categoría', 'Total cursos', 'Alumnos (suma studentsCount)', 'Docentes (suma)', 'Prom. alumnos/curso'];
        const list = applyCourseFilters([...state.courses]);
        const grouped = new Map();
        list.forEach(c => {
          const cat = c.categoryName || 'General';
          if (!grouped.has(cat)) grouped.set(cat, { cat, courses: 0, students: 0, teachers: 0 });
          const g = grouped.get(cat);
          g.courses++; g.students += (c.studentsCount || 0); g.teachers += (c.teachersCount || 0);
        });
        rows = [...grouped.values()].sort((a, b) => b.courses - a.courses).map(g => [
          g.cat, String(g.courses), String(g.students), String(g.teachers),
          g.courses ? (g.students / g.courses).toFixed(1) : '0'
        ]);
        chartLabels = rows.map(r => r[0]);
        chartValues = rows.map(r => parseInt(r[1], 10) || 0);
        kpis = { totalLabel: 'Cursos totales', total: String(list.length), extra: `${rows.length} categoría(s) • ${this._builderSumRows(rows, 2)} alumnos` };
      } else if (type === 'general_summary') {
        title = 'Resumen General de Matrículas y Cursos';
        const enrollFiltered = applyEnrollmentFilters([...state.enrollments]);
        const coursesFiltered = applyCourseFilters([...state.courses]);
        const groupedByCat = new Map();
        enrollFiltered.forEach(e => {
          const cat = catOfEnrollment(e);
          groupedByCat.set(cat, (groupedByCat.get(cat) || 0) + 1);
        });
        const groupedByRole = new Map();
        enrollFiltered.forEach(e => groupedByRole.set(e.role || 'student', (groupedByRole.get(e.role || 'student') || 0) + 1));
        headers = ['Métrica', 'Valor'];
        rows = [
          ['Total matrículas (en el rango y filtros)', String(enrollFiltered.length)],
          ['Total cursos (con filtros)', String(coursesFiltered.length)],
          ['Total alumnos (suma studentsCount de cursos filtrados)', String(coursesFiltered.reduce((a, c) => a + (c.studentsCount || 0), 0))],
          ['Total plataformas (con filtros)', String(platformId === 'all' ? state.platforms.length : 1)],
          ['Categorías representadas', String(new Set(coursesFiltered.map(c => c.categoryName || 'General')).size)],
          ['Roles representados en matrículas', String(groupedByRole.size)],
          ...[...groupedByCat.entries()].sort((a, b) => b[1] - a[1]).map(([cat, n]) => [`Matrículas — ${cat}`, String(n)]),
          ...[...groupedByRole.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => [`Matrículas rol ${r}`, String(n)])
        ];
        chartLabels = rows.slice(0, 8).map(r => r[0].length > 28 ? r[0].slice(0, 28) + '…' : r[0]);
        chartValues = rows.slice(0, 8).map(r => parseInt(r[1], 10) || 0);
        kpis = { totalLabel: 'Matrículas totales', total: String(enrollFiltered.length), extra: `${coursesFiltered.length} curso(s)` };
      } else if (type === 'enrollments' || (type === 'enrollments' && effectiveGroup === 'detail')) {
        title = 'Detalle de Matrículas (fila por fila)';
        headers = ['ID', 'Estudiante', 'Email', 'Curso', 'Categoría', 'Plataforma', 'Rol', 'Método', 'Fecha', 'Estado'];
        const list = applyEnrollmentFilters([...state.enrollments]);
        rows = list.map(e => [
          e.id, e.userName, e.userEmail, e.courseName, catOfEnrollment(e), e.platformName, e.role, e.method,
          new Date(e.enrolledAt).toLocaleString(), e.status
        ]);
        chartLabels = []; chartValues = [];
        kpis = { totalLabel: 'Filas mostradas', total: String(rows.length), extra: 'detalle fila por fila' };
      } else if (type === 'scheduled_batches') {
        title = 'Reporte de Lotes de Matrícula Programados';
        headers = ['ID Lote', 'Nombre', 'Curso(s)', 'Plataforma', 'Alumnos', 'Horario Programado', 'Estado', 'Bitácora'];
        let list = [...(state.scheduledBatches || [])];
        if (platformId !== 'all') list = list.filter(b => b.platformId === platformId);
        if (useCatFilter) list = list.filter(b => {
          // Lotes sin items usan courseId; con items, cualquier ítem en cat seleccionada
          if (Array.isArray(b.enrollmentItems) && b.enrollmentItems.length) {
            return b.enrollmentItems.some(i => selectedCats.has(catOfCourse(i.courseId)));
          }
          return selectedCats.has(b.categoryName || catOfCourse(b.courseId));
        });
        rows = list.map(b => [
          b.id, b.name,
          (b.courseCount && b.courseCount > 1) ? `Múltiples cursos (${b.courseCount})` : (b.courseName || ''),
          b.platformName,
          String(b.studentCount || b.enrollmentCount || (b.targetStudentIds ? b.targetStudentIds.length : 0)),
          new Date(b.scheduledAt).toLocaleString(), b.status, b.executionLog || 'En cola'
        ]);
        chartLabels = rows.map(r => r[1].length > 20 ? r[1].slice(0, 20) + '…' : r[1]);
        chartValues = rows.map(r => parseInt(r[4], 10) || 0);
        kpis = { totalLabel: 'Lotes totales', total: String(rows.length), extra: 'programados y ejecutados' };
      } else if (type === 'platforms_health') {
        title = 'Reporte de Disponibilidad y SLA de Plataformas';
        headers = ['ID', 'Campus', 'Versión Moodle', 'Latencia (ms)', 'Uptime SLA', 'Usuarios', 'Cursos', 'Estado'];
        let list = [...state.platforms];
        if (platformId !== 'all') list = list.filter(p => p.id === platformId);
        rows = list.map(p => [
          p.id, p.name, p.version, p.responseTimeMs || 150,
          p.id === 'plat-3' ? '99.45%' : '99.92%', p.usersCount, p.coursesCount, p.status
        ]);
        chartLabels = rows.map(r => r[1].length > 18 ? r[1].slice(0, 18) + '…' : r[1]);
        chartValues = rows.map(r => parseInt(r[5], 10) || 0);
        kpis = { totalLabel: 'Campus', total: String(rows.length), extra: 'disponibilidad SLA' };
      } else if (type === 'courses_catalog') {
        // Detalle de cursos + totales, o agrupado según groupBy
        if (effectiveGroup === 'category') {
          title = 'Cursos agrupados por Categoría (con totales)';
          headers = ['Categoría', 'Total cursos', 'Alumnos (suma)', 'Docentes (suma)', 'Prom. alumnos/curso'];
          const list = applyCourseFilters([...state.courses]);
          const grouped = new Map();
          list.forEach(c => {
            const cat = c.categoryName || 'General';
            if (!grouped.has(cat)) grouped.set(cat, { cat, courses: 0, students: 0, teachers: 0 });
            const g = grouped.get(cat);
            g.courses++; g.students += (c.studentsCount || 0); g.teachers += (c.teachersCount || 0);
          });
          rows = [...grouped.values()].sort((a, b) => b.courses - a.courses).map(g => [
            g.cat, String(g.courses), String(g.students), String(g.teachers), g.courses ? (g.students / g.courses).toFixed(1) : '0'
          ]);
          chartLabels = rows.map(r => r[0]); chartValues = rows.map(r => parseInt(r[1], 10) || 0);
          kpis = { totalLabel: 'Cursos totales', total: String(list.length), extra: `${rows.length} categoría(s)` };
        } else if (effectiveGroup === 'platform') {
          title = 'Cursos agrupados por Plataforma';
          headers = ['Plataforma', 'Total cursos', 'Alumnos (suma)', 'Docentes (suma)', 'Prom. alumnos/curso'];
          const list = applyCourseFilters([...state.courses]);
          const grouped = new Map();
          list.forEach(c => {
            const key = c.platformName || c.platformId;
            if (!grouped.has(key)) grouped.set(key, { plat: key, courses: 0, students: 0, teachers: 0 });
            const g = grouped.get(key);
            g.courses++; g.students += (c.studentsCount || 0); g.teachers += (c.teachersCount || 0);
          });
          rows = [...grouped.values()].sort((a, b) => b.courses - a.courses).map(g => [
            g.plat, String(g.courses), String(g.students), String(g.teachers), g.courses ? (g.students / g.courses).toFixed(1) : '0'
          ]);
          chartLabels = rows.map(r => r[0].length > 18 ? r[0].slice(0, 18) + '…' : r[0]); chartValues = rows.map(r => parseInt(r[1], 10) || 0);
          kpis = { totalLabel: 'Cursos totales', total: String(list.length), extra: `${rows.length} plataforma(s)` };
        } else {
          title = 'Detalle de Cursos con Totales';
          headers = ['Código', 'Asignatura', 'Campus', 'Categoría', 'Alumnos', 'Docentes', 'Estado'];
          const list = applyCourseFilters([...state.courses]);
          rows = list.map(c => [
            c.shortname, c.fullname, c.platformName, c.categoryName, String(c.studentsCount || 0), String(c.teachersCount || 0), c.status
          ]);
          chartLabels = rows.map(r => r[0]); chartValues = rows.map(r => parseInt(r[4], 10) || 0);
          kpis = { totalLabel: 'Cursos totales', total: String(list.length), extra: `${this._builderSumRows(rows, 4)} alumnos` };
        }
      } else if (type === 'security_audit') {
        title = 'Reporte Forense y Auditoría de Seguridad';
        headers = ['ID Log', 'Acción Registrada', 'Usuario / Operador', 'IP', 'Fecha y Hora', 'Detalles'];
        rows = state.auditLogs.map(l => [
          l.id, l.action, l.user, l.ip, new Date(l.timestamp).toLocaleString(), l.details
        ]);
        chartLabels = []; chartValues = [];
        kpis = { totalLabel: 'Eventos', total: String(rows.length), extra: 'trazabilidad completa' };
      }

      // Fila de total cuando hay columna numérica clara (última fila con TOTAL)
      let footerRow = null;
      if (headers.length >= 2 && rows.length > 0) {
        // Detecta columna numérica: buscamos la primera columna con valores enteros en mayoría de filas
        for (let col = headers.length - 1; col >= 0; col--) {
          const numericCount = rows.filter(r => !isNaN(parseInt(r[col], 10)) && String(r[col]).trim() !== '' && String(r[col]).includes(String(parseInt(r[col], 10)))).length;
          if (numericCount >= Math.ceil(rows.length * 0.6)) {
            const total = this._builderSumRows(rows, col);
            // Solo agregar total si el header sugiere conteo/suma
            const head = headers[col].toLowerCase();
            if (head.includes('total') || head.includes('matr') || head.includes('alumno') || head.includes('curso') || head.includes('usuario') || head.includes('cantidad')) {
              footerRow = headers.map((h, i) => i === 0 ? `TOTAL (${rows.length} fila(s))` : (i === col ? String(total) : ''));
              break;
            }
          }
        }
      }

      this._lastBuilderData = { title, headers, rows, footerRow };

      if (format === 'csv') {
        this.downloadBuilderCSV();
        if (window.toast) window.toast.success('Archivo CSV exportado exitosamente');
        return;
      }

      // Mostrar en pantalla
      resultsArea.style.display = 'block';
      resultsTitle.textContent = title;
      const rangeLabel = range === 'all' ? 'TODO EL HISTORIAL' : range.toUpperCase();
      const catMeta = useCatFilter ? ` • Categorías: ${[...selectedCats].join(', ')}` : ' • Todas las categorías';
      const roleMeta = useRoleFilter ? ` • Roles: ${[...selectedRoles].join(', ')}` : ' • Todos los roles';
      const teachMeta = (type.startsWith('teaching_'))
        ? ` • Docentes: ${useTeacherFilter ? [...selectedTeachers].join(', ') : 'todos'} • Ciclos: ${useCycleFilter ? [...selectedCycles].join(', ') : 'todos'}`
        : '';
      resultsMeta.textContent = `Generado el ${new Date().toLocaleString()} • Período: ${rangeLabel}${catMeta}${roleMeta}${teachMeta} • Total: ${rows.length} registros`;

      if (kpiWrap && kpis) {
        kpiWrap.innerHTML = window.widgets.metricCard({
          label: kpis.totalLabel,
          value: kpis.total,
          trend: null,
          subtext: kpis.extra,
          icon: '<i data-lucide="calculator"></i>',
          colorClass: 'primary'
        });
      } else if (kpiWrap) {
        kpiWrap.innerHTML = '';
      }

      let tableHtml = `
        <table class="table">
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr>${r.map(col => `<td>${window.security.escapeHtml(String(col))}</td>`).join('')}</tr>
            `).join('') : `<tr><td colspan="${headers.length}" style="text-align:center; padding:2rem; color:var(--muted);">Sin registros para los filtros seleccionados.</td></tr>`}
          </tbody>
          ${footerRow ? `<tfoot><tr>${footerRow.map((col, i) => `<td style="${i === 0 ? 'font-weight:800; color:var(--primary);' : 'font-weight:800;'}">${window.security.escapeHtml(String(col))}</td>`).join('')}</tr></tfoot>` : ''}
        </table>
      `;
      tableWrap.innerHTML = tableHtml;

      // Gráfico de vista previa cuando hay datos agrupados
      if (chartWrap) {
        if (chartLabels.length && typeof Chart !== 'undefined') {
          chartWrap.style.display = 'block';
          if (charts.builderPreview) { try { charts.builderPreview.destroy(); } catch (e) {} charts.builderPreview = null; }
          const canvas = document.getElementById('builder-chart');
          if (canvas) {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#94a3b8' : '#64748b';
            const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
            charts.builderPreview = new Chart(canvas, {
              type: 'bar',
              data: {
                labels: chartLabels,
                datasets: [{ label: 'Total', data: chartValues, backgroundColor: '#2563eb', borderRadius: 6 }]
              },
              options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                  y: { ticks: { color: textColor }, grid: { color: gridColor } },
                  x: { ticks: { color: textColor }, grid: { display: false } }
                },
                plugins: { legend: { display: false } }
              }
            });
          }
        } else {
          chartWrap.style.display = 'none';
        }
      }

      if (format === 'pdf') {
        window.print();
      } else {
        resultsArea.scrollIntoView({ behavior: 'smooth' });
      }

      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    downloadBuilderCSV: function () {
      if (!this._lastBuilderData) return;
      const { title, headers, rows, footerRow } = this._lastBuilderData;
      const csvRows = footerRow ? [...rows, footerRow] : rows;
      this._generateAndDownloadCsv(`${title.toLowerCase().replace(/\s+/g, '_')}.csv`, headers, csvRows);
    },

    /* ==========================================================================
       EXPORTACIÓN CSV UNIVERSAL CON SOPORTE UTF-8 BOM
       ========================================================================== */
    exportCurrentTabCSV: function () {
      const state = window.store.getState();
      let filename = `moodlify_reporte_${currentTab}_${activePeriod}.csv`;
      let headers = [];
      let rows = [];

      if (currentTab === 'executive') {
        headers = ['Campus Moodle', 'Versión', 'Uptime SLA', 'Latencia (ms)', 'Usuarios', 'Cursos', 'Estado'];
        rows = state.platforms.map(p => [
          p.name,
          p.version,
          p.id === 'plat-3' ? '99.45%' : '99.92%',
          p.responseTimeMs || 150,
          p.usersCount,
          p.coursesCount,
          p.status
        ]);
      } else if (currentTab === 'enrollments') {
        headers = ['ID Matrícula', 'Estudiante', 'Email', 'Curso Receptor', 'Plataforma', 'Método', 'Fecha', 'Estado'];
        rows = state.enrollments.map(e => [
          e.id,
          e.userName,
          e.userEmail,
          e.courseName,
          e.platformName,
          e.method,
          e.enrolledAt,
          e.status
        ]);
      } else if (currentTab === 'security') {
        headers = ['ID Log', 'Acción', 'Usuario', 'IP', 'Timestamp', 'Detalles'];
        rows = state.auditLogs.map(l => [
          l.id,
          l.action,
          l.user,
          l.ip,
          l.timestamp,
          l.details
        ]);
      } else {
        if (this._lastBuilderData) {
          this.downloadBuilderCSV();
          return;
        }
        headers = ['Métrica', 'Valor'];
        rows = [['Total Plataformas', state.platforms.length], ['Total Usuarios', state.users.length], ['Total Cursos', state.courses.length]];
      }

      this._generateAndDownloadCsv(filename, headers, rows);
      if (window.toast) window.toast.success(`Archivo ${filename} descargado exitosamente`);
    },

    _generateAndDownloadCsv: function (filename, headers, rows) {
      const csvRows = [];
      // Escapar celdas para CSV estándar
      const escapeCell = (val) => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      csvRows.push(headers.map(escapeCell).join(','));
      rows.forEach(r => {
        csvRows.push(r.map(escapeCell).join(','));
      });

      // Añadir BOM (\uFEFF) para forzar detección correcta de caracteres UTF-8 en Excel
      const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    /* ==========================================================================
       INICIALIZADOR DE GRÁFICOS CHART.JS
       ========================================================================== */
    _initCharts: function (state) {
      if (typeof Chart === 'undefined') return;

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const textColor = isDark ? '#94a3b8' : '#64748b';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

      if (currentTab === 'executive') {
        // Chart 1: Uptime
        const uptimeCtx = document.getElementById('report-uptime-chart');
        if (uptimeCtx) {
          charts.uptime = new Chart(uptimeCtx, {
            type: 'bar',
            data: {
              labels: state.platforms.map(p => p.name.split(' ')[0] + ' ' + (p.name.split(' ')[1] || '')),
              datasets: [{
                label: 'Disponibilidad SLA (%)',
                data: [99.92, 99.85, 99.45],
                backgroundColor: ['#2563eb', '#0ea5e9', '#10b981'],
                borderRadius: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { min: 98, max: 100, ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
              },
              plugins: { legend: { display: false } }
            }
          });
        }

        // Chart 2: Enrolment Trend
        const enrolCtx = document.getElementById('report-enrol-chart');
        if (enrolCtx) {
          charts.enrolTrend = new Chart(enrolCtx, {
            type: 'line',
            data: {
              labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'],
              datasets: [{
                label: 'Matrículas',
                data: [42, 68, 95, 120, 185, 210],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                tension: 0.35,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
              },
              plugins: { legend: { display: false } }
            }
          });
        }

        // Chart 3: Completion Rate
        const compCtx = document.getElementById('report-completion-chart');
        if (compCtx) {
          charts.completion = new Chart(compCtx, {
            type: 'bar',
            data: {
              labels: ['Ingeniería', 'Salud', 'Posgrados', 'Extensión', 'Negocios'],
              datasets: [{
                label: 'Tasa de Finalización (%)',
                data: [88, 92, 85, 78, 81],
                backgroundColor: '#10b981',
                borderRadius: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { min: 50, max: 100, ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
              },
              plugins: { legend: { display: false } }
            }
          });
        }

        // Chart 4: MTTR
        const mttrCtx = document.getElementById('report-mttr-chart');
        if (mttrCtx) {
          charts.mttr = new Chart(mttrCtx, {
            type: 'line',
            data: {
              labels: ['Acceso', 'Matrículas', 'Cursos', 'Base de Datos', 'Webhooks'],
              datasets: [{
                label: 'Horas MTTR',
                data: [0.8, 1.4, 1.1, 2.3, 0.9],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                tension: 0.25,
                fill: true,
                pointRadius: 5
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
              },
              plugins: { legend: { display: false } }
            }
          });
        }
      } else if (currentTab === 'enrollments') {
        // Donut: Métodos — calculado desde datos reales del Store
        const donutCtx = document.getElementById('report-method-donut');
        if (donutCtx) {
          const methodLabels = {
            batch: 'Lote Programado',
            csv: 'Carga CSV',
            api: 'API REST',
            manual: 'Manual UI',
            self: 'Auto-enrol'
          };
          const methodColors = {
            batch: '#2563eb',
            csv: '#0ea5e9',
            api: '#10b981',
            manual: '#f59e0b',
            self: '#8b5cf6'
          };
          const methodCounts = {};
          (state.enrollments || []).forEach(e => {
            const m = e.method || 'manual';
            methodCounts[m] = (methodCounts[m] || 0) + 1;
          });
          // Incluir métodos con 0 para mantener leyenda estable si no hay datos
          Object.keys(methodLabels).forEach(m => {
            if (!(m in methodCounts)) methodCounts[m] = 0;
          });
          const donutLabels = Object.keys(methodLabels).map(k => methodLabels[k]);
          const donutData = Object.keys(methodLabels).map(k => methodCounts[k]);
          charts.methodDonut = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
              labels: donutLabels,
              datasets: [{
                data: donutData,
                backgroundColor: Object.keys(methodLabels).map(k => methodColors[k]),
                borderWidth: 2,
                borderColor: isDark ? '#1e293b' : '#ffffff'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { color: textColor, padding: 15 } }
              }
            }
          });
        }

        // Top Cursos
        const topCtx = document.getElementById('report-top-courses');
        if (topCtx) {
          const sorted = [...state.courses].sort((a, b) => b.studentsCount - a.studentsCount).slice(0, 5);
          charts.topCourses = new Chart(topCtx, {
            type: 'bar',
            data: {
              labels: sorted.map(c => c.shortname),
              datasets: [{
                label: 'Alumnos Matriculados',
                data: sorted.map(c => c.studentsCount),
                backgroundColor: '#2563eb',
                borderRadius: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
              },
              plugins: { legend: { display: false } }
            }
          });
        }
      } else if (currentTab === 'security') {
        // Security Timeline
        const secCtx = document.getElementById('report-security-chart');
        if (secCtx) {
          charts.securityActivity = new Chart(secCtx, {
            type: 'line',
            data: {
              labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
              datasets: [{
                label: 'Peticiones API Web Service / hora',
                data: [120, 45, 890, 1450, 1280, 750, 310],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.3
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
              },
              plugins: { legend: { display: false } }
            }
          });
        }
      }
    },

    destroyAllCharts: function () {
      Object.keys(charts).forEach(key => {
        if (charts[key]) {
          try {
            charts[key].destroy();
          } catch (e) {}
          charts[key] = null;
        }
      });
    }
  };

  window.reportsPage = reportsPage;
})();
