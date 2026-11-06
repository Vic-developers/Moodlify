/**
 * ==============================================================================
 * MOODLIFY - TOAST NOTIFICATIONS COMPONENT (js/components/toast.js)
 * 4 Semantic Types (success, error, warning, info), Visual Progress Bar,
 * Hover-pause, Stacking Cap (max 5), Dismiss Button & Slide-in Animation
 * ==============================================================================
 */

(function () {
  'use strict';

  class ToastSystem {
    constructor() {
      this.container = null;
      this.toasts = [];
      this.maxToasts = 5;
      this.defaultDuration = 4500;
      this._init();
    }

    _init() {
      // Crear el contenedor de toasts en el DOM si no existe
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._ensureContainer());
      } else {
        this._ensureContainer();
      }
    }

    _ensureContainer() {
      if (!this.container) {
        let existing = document.querySelector('.toast-container');
        if (!existing) {
          existing = document.createElement('div');
          existing.className = 'toast-container';
          existing.setAttribute('aria-live', 'polite');
          existing.setAttribute('role', 'region');
          existing.setAttribute('aria-label', 'Notificaciones del sistema');
          document.body.appendChild(existing);
        }
        this.container = existing;
      }
    }

    _getIconSvg(type) {
      switch (type) {
        case 'success':
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
        case 'error':
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
        case 'warning':
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        case 'info':
        default:
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
      }
    }

    /**
     * Muestra un nuevo toast
     */
    show(options) {
      this._ensureContainer();

      const {
        type = 'info',
        title = '',
        message = '',
        duration = this.defaultDuration
      } = typeof options === 'string' ? { message: options } : options;

      // Limitar a un máximo de 5 toasts activos a la vez
      if (this.toasts.length >= this.maxToasts) {
        const oldest = this.toasts.shift();
        this._removeToast(oldest.element);
      }

      const toastEl = document.createElement('div');
      toastEl.className = `toast toast-${type}`;
      toastEl.setAttribute('role', 'status');

      const safeTitle = window.security ? window.security.escapeHtml(title) : title;
      const safeMessage = window.security ? window.security.escapeHtml(message) : message;

      toastEl.innerHTML = `
        <div class="toast-icon">
          ${this._getIconSvg(type)}
        </div>
        <div class="toast-content">
          ${safeTitle ? `<div class="toast-title">${safeTitle}</div>` : ''}
          <div class="toast-message">${safeMessage}</div>
        </div>
        <button class="toast-close-btn" aria-label="Cerrar notificación">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="toast-progress"></div>
      `;

      this.container.appendChild(toastEl);

      const progressBar = toastEl.querySelector('.toast-progress');
      const closeBtn = toastEl.querySelector('.toast-close-btn');

      let startTime = Date.now();
      let remaining = duration;
      let timerId = null;
      let isPaused = false;

      // Iniciar animación de la barra de progreso
      progressBar.style.transition = `transform ${duration}ms linear`;
      requestAnimationFrame(() => {
        progressBar.style.transform = 'scaleX(0)';
      });

      const dismiss = () => {
        this._removeToast(toastEl);
      };

      const resumeTimer = () => {
        if (!isPaused) return;
        isPaused = false;
        startTime = Date.now();
        progressBar.style.transition = `transform ${remaining}ms linear`;
        progressBar.style.transform = 'scaleX(0)';
        timerId = setTimeout(dismiss, remaining);
      };

      const pauseTimer = () => {
        if (isPaused) return;
        isPaused = true;
        clearTimeout(timerId);
        remaining -= Date.now() - startTime;
        // Congelar barra en su posición actual
        const computedWidth = window.getComputedStyle(progressBar).transform;
        progressBar.style.transition = 'none';
        progressBar.style.transform = computedWidth;
      };

      // Hover para pausar
      toastEl.addEventListener('mouseenter', pauseTimer);
      toastEl.addEventListener('mouseleave', resumeTimer);

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
      });

      timerId = setTimeout(dismiss, duration);

      const toastRecord = { element: toastEl, timerId };
      this.toasts.push(toastRecord);

      return toastRecord;
    }

    _removeToast(toastEl) {
      if (!toastEl || !toastEl.parentNode) return;

      toastEl.classList.add('removing');
      this.toasts = this.toasts.filter(t => t.element !== toastEl);

      setTimeout(() => {
        if (toastEl.parentNode) {
          toastEl.parentNode.removeChild(toastEl);
        }
      }, 250);
    }

    success(message, title = 'Operación Exitosa', duration) {
      return this.show({ type: 'success', title, message, duration });
    }

    error(message, title = 'Error', duration = 6000) {
      return this.show({ type: 'error', title, message, duration });
    }

    warning(message, title = 'Atención', duration) {
      return this.show({ type: 'warning', title, message, duration });
    }

    info(message, title = 'Información', duration) {
      return this.show({ type: 'info', title, message, duration });
    }
  }

  window.toast = new ToastSystem();
})();

