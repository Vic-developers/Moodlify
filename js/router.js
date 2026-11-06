/**
 * ==============================================================================
 * MOODLIFY - SPA ROUTER (js/router.js)
 * Hash-based Single Page App router, Auth Guards, Dynamic Breadcrumbs,
 * Document Title Synchronizer, Page Transitions & Sidebar Drawer Auto-Close
 * ==============================================================================
 */

(function () {
  'use strict';

  const ROUTE_CONFIG = {
    '#dashboard': {
      id: 'dashboard',
      title: 'Panel General',
      breadcrumb: ['Inicio', 'Dashboard'],
      pageModule: 'dashboardPage'
    },
    '#platforms': {
      id: 'platforms',
      title: 'Instancias Moodle',
      breadcrumb: ['Administración', 'Plataformas'],
      pageModule: 'platformsPage'
    },
    '#users': {
      id: 'users',
      title: 'Gestión de Usuarios',
      breadcrumb: ['Directorio', 'Usuarios'],
      pageModule: 'usersPage'
    },
    '#courses': {
      id: 'courses',
      title: 'Catálogo de Cursos',
      breadcrumb: ['Académico', 'Cursos'],
      pageModule: 'coursesPage'
    },
    '#teaching': {
      id: 'teaching',
      title: 'Data Docente',
      breadcrumb: ['Académico', 'Data Docente'],
      pageModule: 'teachingPage'
    },
    '#periods': {
      id: 'periods',
      title: 'Periodos Académicos',
      breadcrumb: ['Académico', 'Periodos'],
      pageModule: 'periodsPage'
    },
    '#cohorts': {
      id: 'cohorts',
      title: 'Cohortes y Horarios',
      breadcrumb: ['Académico', 'Cohortes'],
      pageModule: 'cohortsPage'
    },
    '#enrollments': {
      id: 'enrollments',
      title: 'Matrículas y Admisión',
      breadcrumb: ['Académico', 'Matrículas'],
      pageModule: 'enrollmentsPage'
    },
    '#activity': {
      id: 'activity',
      title: 'Actividad y Progreso',
      breadcrumb: ['Académico', 'Actividad'],
      pageModule: 'activityPage'
    },
    '#importer': {
      id: 'importer',
      title: 'Importador CSV',
      breadcrumb: ['Sistema', 'Importador'],
      pageModule: 'importerPage'
    },
    '#automations': {
      id: 'automations',
      title: 'Automatizaciones y Tareas',
      breadcrumb: ['Sistema', 'Automatizaciones'],
      pageModule: 'automationsPage'
    },
    '#reports': {
      id: 'reports',
      title: 'Analíticas y Reportes',
      breadcrumb: ['Métricas', 'Reportes'],
      pageModule: 'reportsPage'
    },
    '#integrations': {
      id: 'integrations',
      title: 'Integraciones',
      breadcrumb: ['Sistema', 'Integraciones'],
      pageModule: 'integrationsPage'
    },
    '#backups': {
      id: 'backups',
      title: 'Backups',
      breadcrumb: ['Sistema', 'Backups'],
      pageModule: 'backupsPage'
    },
    '#academic-cases': {
      id: 'academic-cases',
      title: 'Mesa Académica',
      breadcrumb: ['Académico', 'Mesa Académica'],
      pageModule: 'academicCasesPage'
    },
    '#incidences': {
      id: 'incidences',
      title: 'Gestión de Incidencias',
      breadcrumb: ['Soporte', 'Incidencias'],
      pageModule: 'incidencesPage'
    },
    '#settings': {
      id: 'settings',
      title: 'Configuración del Sistema',
      breadcrumb: ['Ajustes', 'Configuración'],
      pageModule: 'settingsPage'
    }
  };

  class SpaRouter {
    constructor() {
      this.currentRoute = '#dashboard';
      this.routes = ROUTE_CONFIG;
      this.container = null;
      this._bindEvents();
    }

    _bindEvents() {
      window.addEventListener('hashchange', () => this._handleNavigation());
      window.addEventListener('DOMContentLoaded', () => {
        this.container = document.getElementById('page-container');
        this._handleNavigation();
      });
    }

    /**
     * Resuelve el hash actual o asigna la ruta por defecto
     */
    getCurrentHash() {
      const hash = window.location.hash || '#dashboard';
      return this.routes[hash] ? hash : '#dashboard';
    }

    /**
     * Navega programáticamente a un hash determinado
     */
    navigate(hash) {
      if (window.location.hash === hash) {
        this._handleNavigation();
      } else {
        window.location.hash = hash;
      }
    }

    /**
     * Manejador central de navegación y renderizado de vista
     */
    async _handleNavigation() {
      // 1. Guard de Autenticación
      if (window.auth && typeof window.auth.guardRoute === 'function') {
        const canProceed = window.auth.guardRoute();
        if (!canProceed) return;
      }

      const hash = this.getCurrentHash();
      this.currentRoute = hash;
      const routeInfo = this.routes[hash];

      // 2. Actualizar Título del Documento
      document.title = `${window.CONFIG?.APP_NAME || 'Moodlify'} | ${routeInfo.title}`;

      // 3. Scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' });

      // 4. Actualizar Estado Global
      if (window.store) {
        const state = window.store.getState();
        window.store.setState({
          ui: {
            ...state.ui,
            currentRoute: hash,
            sidebarOpen: false // Cerrar drawer en móvil
          }
        });
      }

      // 5. Actualizar Breadcrumbs en la Topbar
      this._updateBreadcrumbs(routeInfo.breadcrumb);

      // 6. Actualizar enlaces activos en la Sidebar
      this._updateNavHighlight(hash);

      // 7. Telemetría de página
      if (window.analytics) {
        window.analytics.trackPageView(hash, routeInfo.title);
      }

      // 8. Renderizar la página correspondiente
      await this._renderPage(routeInfo);
    }

    /**
     * Renderiza el módulo de página correspondiente con transición de entrada
     */
    async _renderPage(routeInfo) {
      const container = this.container || document.getElementById('page-container');
      if (!container) return;

      // Animación suave de salida/entrada
      container.innerHTML = `
        <div class="animate-fade-in" style="width: 100%;">
          <div class="skeleton-card" style="margin-bottom: 1.5rem; height: 100px;"></div>
          <div class="metrics-grid">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
          </div>
        </div>
      `;

      // Cargar el módulo de página
      const pageModuleName = routeInfo.pageModule;
      const pageModule = window[pageModuleName];

      if (pageModule && typeof pageModule.render === 'function') {
        try {
          await pageModule.render(container);
          
          // Re-inicializar iconos Lucide en el nuevo DOM generado
          if (typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        } catch (err) {
          if (window.errorHandler) {
            window.errorHandler.handle(err, 'code', { route: routeInfo.id });
          }
          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon" style="color: var(--danger);">
                <i data-lucide="alert-triangle"></i>
              </div>
              <h3 class="empty-state-title">Error al cargar la página</h3>
              <p class="empty-state-description">${err.message || 'No se pudo inicializar la vista seleccionada.'}</p>
              <button class="btn btn-primary" onclick="window.router.navigate('#dashboard')">Volver al Dashboard</button>
            </div>
          `;
          if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
        }
      } else {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <i data-lucide="construction"></i>
            </div>
            <h3 class="empty-state-title">${routeInfo.title}</h3>
            <p class="empty-state-description">El módulo [${routeInfo.pageModule}] está en proceso de compilación.</p>
          </div>
        `;
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    }

    /**
     * Actualiza la ruta de navegación (Breadcrumbs)
     */
    _updateBreadcrumbs(crumbs = []) {
      const el = document.getElementById('topbar-breadcrumbs');
      if (!el) return;

      el.innerHTML = crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        if (isLast) {
          return `<span class="breadcrumb-active">${window.security ? window.security.escapeHtml(crumb) : crumb}</span>`;
        }
        return `
          <span class="breadcrumb-item">${window.security ? window.security.escapeHtml(crumb) : crumb}</span>
          <span class="breadcrumb-separator">/</span>
        `;
      }).join('');
    }

    /**
     * Resalta el ítem activo en la barra lateral
     */
    _updateNavHighlight(hash) {
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
        const targetHash = link.getAttribute('href');
        if (targetHash === hash) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  }

  window.router = new SpaRouter();
})();

