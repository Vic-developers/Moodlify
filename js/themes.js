/**
 * ==============================================================================
 * MOODLIFY - THEME MANAGER (js/themes.js)
 * Light, Dark, High-Contrast & Auto modes.
 * Features: LocalStorage persistence, System preference listener, Cross-tab sync,
 * Dynamic [data-theme] application and Store integration.
 * ==============================================================================
 */

(function () {
  'use strict';

  const VALID_THEMES = ['light', 'dark', 'high-contrast', 'auto'];

  class ThemeManager {
    constructor() {
      this.storageKey = window.CONFIG?.STORAGE_KEYS?.THEME || 'moodlify_theme';
      this.currentTheme = this._getPersistedTheme();
      this.mediaQueryDark = window.matchMedia('(prefers-color-scheme: dark)');

      this._init();
    }

    _init() {
      // Aplicar tema inmediatamente al cargar
      this.applyTheme(this.currentTheme, false);

      // Escuchar cambios de preferencia del sistema si está en modo auto
      if (this.mediaQueryDark && this.mediaQueryDark.addEventListener) {
        this.mediaQueryDark.addEventListener('change', () => {
          if (this.currentTheme === 'auto') {
            this.applyTheme('auto', false);
          }
        });
      }

      // Sincronización entre pestañas abiertas del navegador
      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey && e.newValue) {
          if (VALID_THEMES.includes(e.newValue)) {
            this.applyTheme(e.newValue, false);
          }
        }
      });
    }

    /**
     * Recupera el tema guardado o 'light' por defecto
     */
    _getPersistedTheme() {
      try {
        const saved = localStorage.getItem(this.storageKey);
        if (saved && VALID_THEMES.includes(saved)) {
          return saved;
        }
      } catch (e) {
        console.warn('[Themes] No se pudo leer tema de localStorage:', e);
      }
      return 'light';
    }

    /**
     * Resuelve el tema visual real a aplicar en el DOM
     */
    resolveTheme(theme) {
      if (theme === 'auto') {
        return this.mediaQueryDark.matches ? 'dark' : 'light';
      }
      return theme;
    }

    /**
     * Aplica el tema seleccionado al elemento <html>
     */
    applyTheme(theme, save = true) {
      if (!VALID_THEMES.includes(theme)) theme = 'light';
      this.currentTheme = theme;

      const effectiveTheme = this.resolveTheme(theme);
      const root = document.documentElement;

      // Asignar atributo para variables CSS
      root.setAttribute('data-theme', effectiveTheme);

      // Si es auto, guardar el meta-indicador
      if (theme === 'auto') {
        root.setAttribute('data-theme-mode', 'auto');
      } else {
        root.removeAttribute('data-theme-mode');
      }

      if (save) {
        try {
          localStorage.setItem(this.storageKey, theme);
        } catch (e) {}
      }

      // Sincronizar con el store reactivo
      if (window.store) {
        const state = window.store.getState();
        if (state.ui && state.ui.theme !== theme) {
          window.store.setState({ ui: { ...state.ui, theme } });
        }
      }

      // Actualizar Chart.js global defaults si está presente
      this._updateChartDefaults(effectiveTheme);

      // Notificar componentes
      window.dispatchEvent(new CustomEvent('moodlify:theme-changed', {
        detail: { theme, effectiveTheme }
      }));
    }

    /**
     * Cicla secuencialmente: light -> dark -> high-contrast -> auto -> light
     */
    cycleTheme() {
      const order = ['light', 'dark', 'high-contrast'];
      const currentIndex = order.indexOf(this.currentTheme);
      const nextIndex = (currentIndex + 1) % order.length;
      const nextTheme = order[nextIndex];
      this.applyTheme(nextTheme);

      if (window.toast) {
        const names = {
          light: 'Modo Claro activado',
          dark: 'Modo Oscuro activado',
          'high-contrast': 'Modo Alto Contraste (Accesibilidad) activado'
        };
        window.toast.info(names[nextTheme] || 'Tema actualizado');
      }

      return nextTheme;
    }

    /**
     * Alterna rápidamente entre light y dark
     */
    toggleTheme() {
      const next = this.resolveTheme(this.currentTheme) === 'dark' ? 'light' : 'dark';
      this.applyTheme(next);
      return next;
    }

    /**
     * Retorna el tema actual configurado
     */
    getTheme() {
      return this.currentTheme;
    }

    /**
     * Ajusta los colores predeterminados de Chart.js según el tema activo
     */
    _updateChartDefaults(effectiveTheme) {
      if (typeof window.Chart !== 'undefined') {
        const isDark = effectiveTheme === 'dark' || effectiveTheme === 'high-contrast';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

        window.Chart.defaults.color = textColor;
        window.Chart.defaults.scale.grid.color = gridColor;
      }
    }
  }

  window.themeManager = new ThemeManager();
})();

