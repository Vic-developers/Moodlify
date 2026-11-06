/**
 * ==============================================================================
 * MOODLIFY - ERROR HANDLER (js/error-handler.js)
 * Global window.onerror & unhandled rejection capture, error taxonomy,
 * friendly toast notifications, Sentry telemetry hook & stack trace preservation
 * ==============================================================================
 */

(function () {
  'use strict';

  class GlobalErrorHandler {
    constructor() {
      this.errorHistory = [];
      this.maxHistory = 50;
      this._bindGlobalListeners();
    }

    _bindGlobalListeners() {
      // Captura global de errores sincrónicos de script
      window.onerror = (message, source, lineno, colno, error) => {
        this.handle(error || new Error(String(message)), 'code', {
          source,
          lineno,
          colno,
          message
        });
        return false;
      };

      // Captura global de promesas rechazadas no capturadas
      window.onunhandledrejection = (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Unhandled Promise Rejection'));
        this.handle(error, 'unhandled_promise', { reason: event.reason });
      };
    }

    /**
     * Clasifica el tipo de error según su origen y mensaje
     */
    classify(error, hint = 'code') {
      const msg = (error?.message || '').toLowerCase();

      if (hint === 'auth' || msg.includes('401') || msg.includes('token') || msg.includes('sesión') || msg.includes('unauthorized')) {
        return 'auth';
      }
      if (hint === 'network' || !navigator.onLine || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('abort')) {
        return 'network';
      }
      if (hint === 'validation' || msg.includes('requerido') || msg.includes('inválid') || msg.includes('validation')) {
        return 'validation';
      }
      if (msg.includes('500') || msg.includes('server') || msg.includes('gateway') || msg.includes('502') || msg.includes('503')) {
        return 'server';
      }
      return 'code';
    }

    /**
     * Genera un mensaje comprensible y amigable para el usuario en español
     */
    getUserFriendlyMessage(category, error) {
      switch (category) {
        case 'network':
          return 'Problema de conexión con los servidores Moodle. Revisa tu acceso a internet.';
        case 'auth':
          return 'Error de autenticación o permisos insuficientes para esta operación.';
        case 'validation':
          return error?.message || 'Los datos ingresados no cumplen con el formato solicitado.';
        case 'server':
          return 'El servicio web de la plataforma educativa respondió con un error temporal.';
        case 'code':
        default:
          return 'Ocurrió un error inesperado. Hemos registrado el incidente.';
      }
    }

    /**
     * Procesa y centraliza cualquier error de la aplicación
     */
    handle(error, typeHint = 'code', context = {}) {
      const category = this.classify(error, typeHint);
      const friendlyMessage = this.getUserFriendlyMessage(category, error);

      const errorRecord = {
        id: 'err-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        category,
        message: error?.message || 'Error no especificado',
        friendlyMessage,
        stack: error?.stack || null,
        context,
        timestamp: new Date().toISOString()
      };

      // Guardar en buffer local
      this.errorHistory.unshift(errorRecord);
      if (this.errorHistory.length > this.maxHistory) {
        this.errorHistory.pop();
      }

      // Log en consola exclusivo para entorno de desarrollo
      if (window.CONFIG && window.CONFIG.ENV === 'development') {
        console.group(`🚨 [Moodlify Error] [${category.toUpperCase()}]`);
        console.error(error);
        if (Object.keys(context).length > 0) console.table(context);
        console.groupEnd();
      }

      // Mostrar Toast informativo y elegante al usuario
      if (window.toast) {
        // Evitamos spammear toasts de red si la app está offline
        if (category === 'network' && !navigator.onLine) {
          window.toast.warning('Modo fuera de línea: Las operaciones se guardarán localmente');
        } else {
          window.toast.error(friendlyMessage);
        }
      }

      // Reporte a telemetría o Sentry si está configurado
      this.reportToSentry(errorRecord);

      return errorRecord;
    }

    /**
     * Hook para integración opcional con Sentry u otro servicio APM
     */
    reportToSentry(errorRecord) {
      // Si la librería oficial de Sentry está cargada en el DOM:
      if (typeof window.Sentry !== 'undefined' && typeof window.Sentry.captureException === 'function') {
        window.Sentry.captureException(new Error(errorRecord.message), {
          tags: { category: errorRecord.category },
          extra: errorRecord.context
        });
      }
    }

    /**
     * Retorna el histórico de errores para diagnóstico
     */
    getHistory() {
      return [...this.errorHistory];
    }
  }

  window.errorHandler = new GlobalErrorHandler();
})();

