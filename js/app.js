/**
 * ==============================================================================
 * MOODLIFY - APP BOOTSTRAPPER (js/app.js)
 * Master Lifecycle Orchestrator: Service Worker Registration, DOM Event Binding,
 * Mobile Sidebar Drawer, Topbar Actions & Lucide Icons Initialization
 * ==============================================================================
 */

(function () {
  'use strict';

  class MoodlifyApp {
    constructor() {
      this.isInitialized = false;
      this._init();
    }

    _init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.bootstrap());
      } else {
        this.bootstrap();
      }
    }

    /**
     * Secuencia de arranque principal
     */
    async bootstrap() {
      if (this.isInitialized) return;
      this.isInitialized = true;

      console.log(`%c🎓 ${window.CONFIG?.APP_NAME || 'Moodlify'} v${window.CONFIG?.VERSION || '2.0.0'}`, 'color: #2563eb; font-weight: bold; font-size: 14px;');

      // 1. Verificar Estado de Autenticación
      if (window.location.pathname.indexOf('login.html') === -1) {
        if (window.auth && !window.auth.isAuthenticated()) {
          window.location.href = window.CONFIG?.ROUTES?.LOGIN || 'login.html';
          return;
        }
      }

      // 2. Vincular Interacciones de la Interfaz (Sidebar, Topbar)
      this._bindSidebarInteractions();
      this._bindTopbarInteractions();
      this._bindGlobalShortcuts();

      // 3. Registrar Service Worker para PWA si el navegador lo soporta
      this._registerServiceWorker();

      // 4. Inicializar Iconos Lucide
      if (typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }

      // 5. Suscribirse a cambios del Almacén para actualizar perfil
      this._syncUserProfile();
      this._syncNavBadges();

      // 6. Mensaje de bienvenida inicial en consola / telemetría
      if (window.analytics) {
        window.analytics.trackEvent('app_initialized', {
          version: window.CONFIG?.VERSION || '2.0.0',
          env: window.CONFIG?.ENV || 'production'
        });
      }

      // 7. Cron runner en segundo plano para lotes de matrícula programados
      this._startScheduledBatchWatcher();
    }

    /**
     * Revisa periódicamente si hay lotes programados en cola
     */
    _startScheduledBatchWatcher() {
      setInterval(() => {
        if (window.enrollmentsPage && typeof window.enrollmentsPage.checkScheduledBatchesTrigger === 'function') {
          window.enrollmentsPage.checkScheduledBatchesTrigger();
        }
      }, 15000);
    }

    /**
     * Vincula el comportamiento del menú lateral móvil
     */
    _bindSidebarInteractions() {
      const toggleBtn = document.getElementById('sidebar-toggle-btn');
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.querySelector('.sidebar-overlay');

      const closeSidebar = () => {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
      };

      const openSidebar = () => {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
      };

      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (sidebar && sidebar.classList.contains('open')) {
            closeSidebar();
          } else {
            openSidebar();
          }
        });
      }

      if (overlay) {
        overlay.addEventListener('click', closeSidebar);
      }

      // Cerrar drawer al hacer clic en enlaces de navegación en móvil
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 1024) {
            closeSidebar();
          }
        });
      });
    }

    /**
     * Vincula acciones de la barra superior (Buscador, Tema, Notificaciones)
     */
    _bindTopbarInteractions() {
      // Disparador de Command Palette
      const searchTrigger = document.getElementById('topbar-search-trigger');
      if (searchTrigger) {
        searchTrigger.addEventListener('click', () => {
          if (window.commandPalette) window.commandPalette.open();
        });
      }

      // Botón de alternancia de tema (Claro / Oscuro / Alto Contraste)
      const themeBtn = document.getElementById('theme-toggle-btn');
      if (themeBtn) {
        themeBtn.addEventListener('click', () => {
          if (window.themeManager) window.themeManager.cycleTheme();
        });
      }

      // Botón de campana de notificaciones
      const notifBtn = document.getElementById('notifications-trigger-btn');
      if (notifBtn) {
        notifBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.widgets) window.widgets.toggleNotificationsDrawer();
        });
      }

      // Botón de cierre de sesión en sidebar
      const logoutBtn = document.getElementById('sidebar-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.auth) window.auth.logout(true);
        });
      }
    }

    /**
     * Atajos de teclado adicionales
     */
    _bindGlobalShortcuts() {
      window.addEventListener('keydown', (e) => {
        // Atajo '?' para abrir Command Palette o ayuda
        if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          e.preventDefault();
          if (window.commandPalette) window.commandPalette.open();
        }
      });
    }

    /**
     * Sincroniza el nombre y rol del usuario en la barra lateral
     */
    _syncUserProfile() {
      const updateDom = () => {
        const state = window.store ? window.store.getState() : null;
        const user = state?.auth?.user;

        const nameEl = document.getElementById('sidebar-user-name');
        const roleEl = document.getElementById('sidebar-user-role');
        const avatarEl = document.getElementById('sidebar-user-avatar');

        if (user) {
          if (nameEl) nameEl.textContent = user.name || user.username || 'Usuario';
          if (roleEl) roleEl.textContent = user.institution || 'Administrador TI';
          if (avatarEl) {
            const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            avatarEl.textContent = initials;
          }
        }
      };

      updateDom();
      if (window.store) {
        window.store.subscribe(() => updateDom());
      }
    }

    /**
     * Sincroniza badges vivos en el Sidebar (Matrículas, Mesa Académica)
     */
    _syncNavBadges() {
      const updateDom = () => {
        const state = window.store ? window.store.getState() : null;
        if (!state) return;
        const enrollBadge = document.getElementById('nav-badge-enrollments');
        if (enrollBadge) {
          const activeLots = (state.scheduledBatches || []).filter(b => b.status === 'scheduled').length;
          enrollBadge.textContent = activeLots ? `${state.enrollments.length} · ${activeLots}⚡` : String(state.enrollments.length);
          enrollBadge.style.display = '';
        }
        const casesBadge = document.getElementById('nav-badge-cases');
        if (casesBadge) {
          const openCases = (state.academicCases || []).filter(c => c.status === 'open' || c.status === 'in_progress').length;
          casesBadge.textContent = String(openCases);
          casesBadge.style.display = openCases ? '' : 'none';
        }
      };
      updateDom();
      if (window.store) {
        window.store.subscribe(() => updateDom());
      }
    }

    /**
     * Registra el Service Worker de la PWA
     */
    _registerServiceWorker() {
      if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/service-worker.js')
            .then(reg => {
              console.log('✅ [PWA] Service Worker registrado exitosamente en ámbito:', reg.scope);
            })
            .catch(err => {
              console.warn('⚠️ [PWA] No se pudo registrar Service Worker (esperable en contextos locales sin servidor estático):', err.message);
            });
        });
      }
    }
  }

  // Instanciar la aplicación
  window.app = new MoodlifyApp();
})();

