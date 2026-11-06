/**
 * ==============================================================================
 * MOODLIFY - DASHBOARD PAGE (js/pages/dashboard.js)
 * High-level overview: 4 KPIs, 2 Chart.js visualizations, Period selector,
 * Recent Platforms summary table & Live Activity Feed
 * ==============================================================================
 */

(function () {
  'use strict';

  let charts = {
    activityChart: null,
    enrollmentsChart: null
  };

  const dashboardPage = {
    render: async function (container) {
      const state = window.store.getState();
      const stats = await this._getStats();

      container.innerHTML = `
        <div class="animate-fade-in">
          <!-- Page Header -->
          <div class="page-header">
            <div>
              <h1 class="page-title">Panel de Control</h1>
              <p class="page-subtitle">Supervisión centralizada de infraestructura educativa y alumnos activos</p>
            </div>
            <div class="page-actions">
              <div style="display: flex; gap: 0.35rem; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 0.2rem;">
                <button class="btn btn-ghost btn-sm active-period-btn" onclick="window.dashboardPage.setPeriod('7d', this)">7D</button>
                <button class="btn btn-ghost btn-sm" onclick="window.dashboardPage.setPeriod('30d', this)">30D</button>
                <button class="btn btn-ghost btn-sm" onclick="window.dashboardPage.setPeriod('90d', this)">90D</button>
                <button class="btn btn-ghost btn-sm" onclick="window.dashboardPage.setPeriod('1y', this)">1A</button>
              </div>
              <button class="btn btn-secondary" onclick="window.dashboardPage.syncAll()">
                <i data-lucide="refresh-cw"></i> Sincronizar Todo
              </button>
              <button class="btn btn-primary" onclick="window.router.navigate('#platforms')">
                <i data-lucide="plus"></i> Nueva Plataforma
              </button>
            </div>
          </div>

          <!-- 4 KPIs Grid -->
          <div class="metrics-grid">
            ${window.widgets.metricCard({
              label: 'Plataformas Moodle',
              value: stats.total_platforms,
              trend: { value: '+1 este mes', isPositive: true },
              subtext: `${state.platforms.filter(p => p.status === 'active').length} activas`,
              icon: '<i data-lucide="server"></i>',
              colorClass: 'primary'
            })}
            ${window.widgets.metricCard({
              label: 'Usuarios Registrados',
              value: stats.total_users.toLocaleString(),
              trend: { value: '+5.4%', isPositive: true },
              subtext: 'en todas las instancias',
              icon: '<i data-lucide="users"></i>',
              colorClass: 'success'
            })}
            ${window.widgets.metricCard({
              label: 'Cursos Activos',
              value: stats.total_courses,
              trend: { value: '+3 nuevos', isPositive: true },
              subtext: 'periodo académico 2026',
              icon: '<i data-lucide="book-open"></i>',
              colorClass: 'info'
            })}
            ${window.widgets.metricCard({
              label: 'Incidencias Abiertas',
              value: stats.open_incidences,
              trend: { value: '-2 resueltas', isPositive: true },
              subtext: 'tiempo prom. 1.8h',
              icon: '<i data-lucide="alert-triangle"></i>',
              colorClass: stats.open_incidences > 2 ? 'warning' : 'success'
            })}
          </div>

          <!-- 2 Interactive Charts -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 1.5rem; margin-bottom: 1.75rem;">
            <!-- Chart 1: Matrículas Mensuales -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Tendencia de Matrículas</h3>
                  <div class="card-description">Evolución de inscripciones en los últimos meses</div>
                </div>
                <span class="badge badge-success">En crecimiento</span>
              </div>
              <div class="card-body">
                <div style="position: relative; height: 280px; width: 100%;">
                  <canvas id="dashboard-enrollments-chart"></canvas>
                </div>
              </div>
            </div>

            <!-- Chart 2: Distribución por Plataforma -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Distribución de Usuarios</h3>
                  <div class="card-description">Carga de alumnos por campus conectado</div>
                </div>
                <span class="badge badge-info">Balanceado</span>
              </div>
              <div class="card-body">
                <div style="position: relative; height: 280px; width: 100%;">
                  <canvas id="dashboard-distribution-chart"></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Grid: Recent Platforms & Activity Feed -->
          <div style="display: grid; grid-template-columns: 2fr 1.2fr; gap: 1.5rem; align-items: start;">
            <!-- Recent Platforms Table -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Instancias Moodle Conectadas</h3>
                  <div class="card-description">Salud, latencia y última sincronización de nodos</div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="window.router.navigate('#platforms')">Ver Todas →</button>
              </div>
              <div class="table-container" style="border: none; border-radius: 0;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Plataforma</th>
                      <th>Estado</th>
                      <th>Usuarios</th>
                      <th>Cursos</th>
                      <th>Latencia</th>
                      <th style="text-align: right;">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${state.platforms.map(p => `
                      <tr>
                        <td>
                          <div style="font-weight: 600; color: var(--text);">${window.security.escapeHtml(p.name)}</div>
                          <small style="color: var(--muted);">${window.security.escapeHtml(p.url)}</small>
                        </td>
                        <td>${window.widgets.statusBadge(p.status)}</td>
                        <td><strong>${p.usersCount}</strong></td>
                        <td>${p.coursesCount}</td>
                        <td><span style="font-family: monospace; font-size: 0.8rem; color: ${p.responseTimeMs < 200 ? 'var(--success)' : 'var(--warning)'};">${p.responseTimeMs}ms</span></td>
                        <td style="text-align: right;">
                          <button class="btn btn-secondary btn-sm" onclick="window.dashboardPage.testConnection('${p.id}')">Probar</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Activity Feed -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Actividad Reciente</h3>
                  <div class="card-description">Registro de eventos y tareas automáticas</div>
                </div>
                <i data-lucide="activity" style="width: 18px; height: 18px; color: var(--muted);"></i>
              </div>
              <div class="card-body" style="padding: 1rem 1.25rem;">
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                  ${state.auditLogs.slice(0, 4).map(log => `
                    <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
                      <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-hover); display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; margin-top: 2px;">
                        <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
                      </div>
                      <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.85rem; font-weight: 600; color: var(--text);">${window.security.escapeHtml(log.action)}</div>
                        <div style="font-size: 0.775rem; color: var(--muted);">${window.security.escapeHtml(log.details)}</div>
                        <div style="font-size: 0.7rem; color: var(--muted-light); margin-top: 0.2rem;">${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${window.security.escapeHtml(log.user)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Renderizar Gráficos con Chart.js
      this._renderCharts(state);
    },

    _getStats: async function () {
      const res = await window.api.request('getDashboardStats');
      return res.data;
    },

    _renderCharts: function (state) {
      if (typeof window.Chart === 'undefined') return;

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const textColor = isDark ? '#94a3b8' : '#64748b';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

      // 1. Chart Matrículas Mensuales
      const ctxEnroll = document.getElementById('dashboard-enrollments-chart');
      if (ctxEnroll) {
        if (charts.enrollmentsChart) charts.enrollmentsChart.destroy();
        charts.enrollmentsChart = new window.Chart(ctxEnroll, {
          type: 'line',
          data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'],
            datasets: [
              {
                label: 'Matrículas 2026',
                data: [180, 240, 680, 520, 310, 420, 490, 610, 720, 850, 940],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { padding: 10, cornerRadius: 8 }
            },
            scales: {
              x: { grid: { color: gridColor }, ticks: { color: textColor } },
              y: { grid: { color: gridColor }, ticks: { color: textColor } }
            }
          }
        });
      }

      // 2. Chart Distribución
      const ctxDist = document.getElementById('dashboard-distribution-chart');
      if (ctxDist) {
        if (charts.activityChart) charts.activityChart.destroy();
        charts.activityChart = new window.Chart(ctxDist, {
          type: 'doughnut',
          data: {
            labels: state.platforms.map(p => p.name),
            datasets: [
              {
                data: state.platforms.map(p => p.usersCount),
                backgroundColor: ['#2563eb', '#0ea5e9', '#f59e0b', '#10b981'],
                borderWidth: 0,
                hoverOffset: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: textColor, padding: 14, usePointStyle: true }
              }
            },
            cutout: '72%'
          }
        });
      }
    },

    setPeriod: function (period, btnEl) {
      if (btnEl && btnEl.parentNode) {
        btnEl.parentNode.querySelectorAll('button').forEach(b => b.classList.remove('active-period-btn', 'btn-primary'));
        btnEl.classList.add('active-period-btn');
      }
      if (window.toast) window.toast.info(`Filtro ajustado a período: ${period}`);
    },

    syncAll: async function () {
      if (window.toast) window.toast.info('Iniciando sincronización de todas las instancias...');
      const platforms = window.store.getState().platforms;
      for (const p of platforms) {
        await window.api.request('syncPlatform', { id: p.id });
      }
      if (window.toast) window.toast.success('Todas las plataformas sincronizadas');
      this.render(document.getElementById('page-container'));
    },

    testConnection: async function (platformId) {
      const res = await window.api.request('testPlatformConnection', { id: platformId });
      if (res.success) {
        if (window.toast) window.toast.success(`${res.message} (${res.data.latencyMs}ms - ${res.data.version})`);
      }
    }
  };

  window.dashboardPage = dashboardPage;
})();

