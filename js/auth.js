/**
 * ==============================================================================
 * MOODLIFY - AUTHENTICATION SERVICE (js/auth.js)
 * Session lifecycle, JWT Access/Refresh tokens, Google OAuth 2.0 Mock,
 * Route Guards, Auto-refresh timer & Logout Confirmation
 * ==============================================================================
 */

(function () {
  'use strict';

  class AuthService {
    constructor() {
      this.refreshTimer = null;
      this._init();
    }

    _init() {
      // Si ya hay sesión guardada en store/localStorage, programar auto-refresh
      const token = this.getToken();
      if (token) {
        this._scheduleTokenRefresh();
      }
    }

    /**
     * Retorna el token de acceso JWT actual
     */
    getToken() {
      const state = window.store ? window.store.getState() : null;
      return state?.auth?.token || localStorage.getItem(window.CONFIG?.STORAGE_KEYS?.AUTH_TOKEN || 'moodlify_access_token');
    }

    /**
     * Retorna el refresh token actual
     */
    getRefreshToken() {
      const state = window.store ? window.store.getState() : null;
      return state?.auth?.refreshToken || localStorage.getItem(window.CONFIG?.STORAGE_KEYS?.REFRESH_TOKEN || 'moodlify_refresh_token');
    }

    /**
     * Retorna el usuario autenticado actual
     */
    getCurrentUser() {
      const state = window.store ? window.store.getState() : null;
      return state?.auth?.user || null;
    }

    /**
     * Verifica si la sesión actual es válida
     */
    isAuthenticated() {
      const state = window.store ? window.store.getState() : null;
      const token = this.getToken();
      return !!(state?.auth?.isAuthenticated && token);
    }

    /**
     * Inicia sesión con email y contraseña
     */
    async login(email, password, rememberMe = false) {
      try {
        const response = await window.api.request('login', { email, password });

        if (!response.success) {
          throw new Error(response.error?.message || 'Error en autenticación');
        }

        const { token, refreshToken, user, expiresIn } = response.data;
        this._setSession(token, refreshToken, user, expiresIn, rememberMe);

        // Disparar evento de auditoría
        if (window.analytics) {
          window.analytics.trackEvent('auth_login_success', { email, role: user.role });
        }

        if (window.toast) {
          window.toast.success(`Bienvenido de nuevo, ${user.name}`);
        }

        return { success: true, user };
      } catch (err) {
        if (window.errorHandler) {
          window.errorHandler.handle(err, 'auth');
        }
        throw err;
      }
    }

    /**
     * Simula o integra inicio de sesión con Google OAuth 2.0
     */
    async loginWithGoogle() {
      try {
        // En producción se abriría ventana popup a Google Accounts OAuth
        // Para demo y despliegue rápido, autenticamos con cuenta institucional mock
        const mockGoogleUser = {
          email: 'admin.institucional@universidad.edu',
          password: 'google_oauth_authorized_pass_2026'
        };

        const result = await this.login(mockGoogleUser.email, mockGoogleUser.password, true);
        return result;
      } catch (err) {
        if (window.errorHandler) {
          window.errorHandler.handle(err, 'auth');
        }
        throw err;
      }
    }

    /**
     * Guarda tokens, datos de usuario y programa la renovación
     */
    _setSession(token, refreshToken, user, expiresIn = 3600, rememberMe = false) {
      const expiresAt = Date.now() + (expiresIn * 1000);

      // Actualizar localStorage
      localStorage.setItem(window.CONFIG?.STORAGE_KEYS?.AUTH_TOKEN || 'moodlify_access_token', token);
      if (refreshToken) {
        localStorage.setItem(window.CONFIG?.STORAGE_KEYS?.REFRESH_TOKEN || 'moodlify_refresh_token', refreshToken);
      }
      localStorage.setItem(window.CONFIG?.STORAGE_KEYS?.REMEMBER_ME || 'moodlify_remember_me', String(rememberMe));

      // Actualizar store global
      if (window.store) {
        window.store.setState({
          auth: {
            isAuthenticated: true,
            user,
            token,
            refreshToken,
            expiresAt
          }
        });
      }

      this._scheduleTokenRefresh(expiresIn);
    }

    /**
     * Programa renovación automática de token antes de su caducidad
     */
    _scheduleTokenRefresh(expiresInSeconds = 3600) {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);

      const marginSec = window.CONFIG?.TOKEN_REFRESH_MARGIN_SEC || 120;
      const delayMs = Math.max((expiresInSeconds - marginSec) * 1000, 10000);

      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshToken();
        } catch (err) {
          console.warn('[Auth] No se pudo refrescar el token automáticamente:', err);
        }
      }, delayMs);
    }

    /**
     * Refresca el access token utilizando el refresh token
     */
    async refreshToken() {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;

      try {
        const res = await window.api.request('refreshToken', { refresh: refreshToken });
        if (res.success && res.data?.token) {
          const state = window.store.getState();
          this._setSession(res.data.token, refreshToken, state.auth.user, res.data.expiresIn || 3600);
          return true;
        }
      } catch (err) {
        console.error('[Auth] Error refrescando token:', err);
      }
      return false;
    }

    /**
     * Cierra la sesión activa con confirmación modal opcional
     */
    async logout(withConfirmation = true) {
      const doLogout = () => {
        if (this.refreshTimer) clearTimeout(this.refreshTimer);

        // Limpieza de claves de sesión en localStorage
        localStorage.removeItem(window.CONFIG?.STORAGE_KEYS?.AUTH_TOKEN || 'moodlify_access_token');
        localStorage.removeItem(window.CONFIG?.STORAGE_KEYS?.REFRESH_TOKEN || 'moodlify_refresh_token');

        // Reset estado de autenticación en store
        if (window.store) {
          window.store.setState({
            auth: {
              isAuthenticated: false,
              user: null,
              token: null,
              refreshToken: null,
              expiresAt: null
            }
          });
        }

        if (window.toast) {
          window.toast.info('Has cerrado sesión correctamente');
        }

        // Redirigir a login
        if (window.location.pathname.indexOf('login.html') === -1) {
          window.location.href = window.CONFIG?.ROUTES?.LOGIN || 'login.html';
        }
      };

      if (withConfirmation && window.modal) {
        window.modal.confirm({
          title: 'Cerrar Sesión',
          message: '¿Estás seguro de que deseas salir del panel de administración de Moodlify?',
          confirmText: 'Cerrar Sesión',
          cancelText: 'Cancelar',
          type: 'danger',
          onConfirm: doLogout
        });
      } else {
        doLogout();
      }
    }

    /**
     * Maneja respuestas 401 no autorizadas
     */
    handleUnauthorized() {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      if (window.toast) {
        window.toast.warning('Tu sesión ha expirado. Por favor, identifícate nuevamente.');
      }
      this.logout(false);
    }

    /**
     * Guard para rutas SPA que requieren login previo
     */
    guardRoute() {
      if (!this.isAuthenticated()) {
        const currentHash = window.location.hash;
        sessionStorage.setItem('moodlify_redirect_after_login', currentHash);
        window.location.href = window.CONFIG?.ROUTES?.LOGIN || 'login.html';
        return false;
      }
      return true;
    }
  }

  window.auth = new AuthService();
})();

