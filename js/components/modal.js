/**
 * ==============================================================================
 * MOODLIFY - MODAL SYSTEM (js/components/modal.js)
 * Accessible Modals, Confirmation Dialogs, Backdrop Blur, Keyboard Trap & Escape Handling,
 * Loading Button States & Double-Submit Protection
 * ==============================================================================
 */

(function () {
  'use strict';

  class ModalSystem {
    constructor() {
      this.activeModal = null;
      this.previousActiveElement = null;
      this._bindGlobalKeys();
    }

    _bindGlobalKeys() {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.activeModal) {
          this.close();
        }
      });
    }

    /**
     * Abre un modal personalizado o con formulario
     */
    open({
      title = '',
      content = '',
      size = 'normal', // 'normal' | 'lg'
      footer = '',
      onOpen = null,
      onClose = null
    }) {
      this.close(); // Cerrar modal previo si existiese

      this.previousActiveElement = document.activeElement;

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');

      const safeTitle = window.security ? window.security.escapeHtml(title) : title;
      const modalSizeClass = size === 'lg' ? 'modal-lg' : '';

      backdrop.innerHTML = `
        <div class="modal-container ${modalSizeClass}">
          <div class="modal-header">
            <h3 class="modal-title">${safeTitle}</h3>
            <button class="modal-close-btn" aria-label="Cerrar modal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
          ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
      `;

      document.body.appendChild(backdrop);
      document.body.style.overflow = 'hidden';

      // Eventos de cierre
      const closeBtn = backdrop.querySelector('.modal-close-btn');
      closeBtn.addEventListener('click', () => this.close());

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close();
        }
      });

      // Animación de entrada
      requestAnimationFrame(() => {
        backdrop.classList.add('open');
      });

      this.activeModal = {
        element: backdrop,
        onClose
      };

      if (typeof onOpen === 'function') {
        onOpen(backdrop);
      }

      // Reinicializar iconos si existen
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();

      return backdrop;
    }

    /**
     * Modal rápido de confirmación con icono contextual y acción asíncrona
     */
    confirm({
      title = '¿Confirmar Acción?',
      message = 'Esta operación no se puede revertir.',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      type = 'primary', // 'primary' | 'danger' | 'warning'
      onConfirm = null,
      onCancel = null
    }) {
      let iconColor = 'var(--primary)';
      let iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
      let btnClass = 'btn-primary';

      if (type === 'danger') {
        iconColor = 'var(--danger)';
        iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
        btnClass = 'btn-danger';
      } else if (type === 'warning') {
        iconColor = 'var(--warning)';
        btnClass = 'btn-warning';
      }

      const content = `
        <div style="display: flex; gap: 1.25rem; align-items: flex-start; padding: 0.5rem 0;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; color: ${iconColor}; flex-shrink: 0;">
            <div style="width: 24px; height: 24px;">${iconSvg}</div>
          </div>
          <div>
            <p style="font-size: 0.925rem; color: var(--text); line-height: 1.5;">${message}</p>
          </div>
        </div>
      `;

      const footer = `
        <button class="btn btn-secondary modal-btn-cancel">${cancelText}</button>
        <button class="btn ${btnClass} modal-btn-confirm">${confirmText}</button>
      `;

      const backdrop = this.open({
        title,
        content,
        footer,
        onOpen: (modalEl) => {
          const confirmBtn = modalEl.querySelector('.modal-btn-confirm');
          const cancelBtn = modalEl.querySelector('.modal-btn-cancel');

          let isSubmitting = false;

          confirmBtn.addEventListener('click', async () => {
            if (isSubmitting) return;
            if (typeof onConfirm === 'function') {
              try {
                isSubmitting = true;
                confirmBtn.classList.add('btn-loading');
                confirmBtn.setAttribute('disabled', 'true');
                cancelBtn.setAttribute('disabled', 'true');

                await onConfirm();
                this.close();
              } catch (err) {
                isSubmitting = false;
                confirmBtn.classList.remove('btn-loading');
                confirmBtn.removeAttribute('disabled');
                cancelBtn.removeAttribute('disabled');
                if (window.toast) window.toast.error(err.message || 'Error al procesar la acción');
              }
            } else {
              this.close();
            }
          });

          cancelBtn.addEventListener('click', () => {
            if (typeof onCancel === 'function') onCancel();
            this.close();
          });

          // Focus al botón de cancelar por defecto para seguridad
          setTimeout(() => cancelBtn.focus(), 50);
        }
      });

      return backdrop;
    }

    /**
     * Cierra el modal activo
     */
    close() {
      if (!this.activeModal) return;

      const { element, onClose } = this.activeModal;
      element.classList.remove('open');

      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        document.body.style.overflow = '';

        if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
          this.previousActiveElement.focus();
        }

        if (typeof onClose === 'function') {
          onClose();
        }

        this.activeModal = null;
      }, 250);
    }
  }

  window.modal = new ModalSystem();
})();

