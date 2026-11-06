/**
 * ==============================================================================
 * MOODLIFY - ANALYTICS & TELEMETRY (js/analytics.js)
 * User Session tracking, Page Views, Custom Events, Batch Uploads & Offline Queue
 * ==============================================================================
 */

(function () {
  'use strict';

  class AnalyticsService {
    constructor() {
      this.sessionId = this._getOrCreateSessionId();
      this.eventQueue = this._loadQueuedEvents();
      this.batchSize = 10;
      this.flushIntervalMs = 30000;
      this.storageKey = 'moodlify_analytics_queue';

      this._init();
    }

    _init() {
      // Temporizador para vaciado periódico de eventos
      setInterval(() => this.flush(), this.flushIntervalMs);

      // Si vuelve la conexión a internet, intentar vaciar la cola pendiente
      window.addEventListener('online', () => this.flush());

      // Intentar vaciar antes de cerrar la ventana
      window.addEventListener('beforeunload', () => {
        if (this.eventQueue.length > 0 && navigator.sendBeacon && window.CONFIG?.API_URL) {
          try {
            const blob = new Blob([JSON.stringify({
              action: 'batch_analytics',
              events: this.eventQueue
            })], { type: 'application/json' });
            navigator.sendBeacon(window.CONFIG.API_URL, blob);
          } catch (_) {}
        }
      });
    }

    _getOrCreateSessionId() {
      let sId = sessionStorage.getItem('moodlify_session_id');
      if (!sId) {
        sId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('moodlify_session_id', sId);
      }
      return sId;
    }

    _loadQueuedEvents() {
      try {
        const raw = localStorage.getItem('moodlify_analytics_queue');
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    _persistQueue() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.eventQueue.slice(-100)));
      } catch (_) {}
    }

    /**
     * Registra un evento en la cola interna
     */
    trackEvent(eventName, payload = {}) {
      // Filtrar campos sensibles de seguridad
      const sanitizedPayload = { ...payload };
      delete sanitizedPayload.password;
      delete sanitizedPayload.token;
      delete sanitizedPayload.refreshToken;

      const eventRecord = {
        id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: eventName,
        sessionId: this.sessionId,
        payload: sanitizedPayload,
        url: window.location.href,
        referrer: document.referrer || '',
        timestamp: new Date().toISOString()
      };

      this.eventQueue.push(eventRecord);
      this._persistQueue();

      if (window.CONFIG && window.CONFIG.ENV === 'development') {
        console.log(`📊 [Analytics] Evento: '${eventName}'`, sanitizedPayload);
      }

      if (this.eventQueue.length >= this.batchSize) {
        this.flush();
      }
    }

    /**
     * Registra cambio de pantalla o vista SPA
     */
    trackPageView(pageHash, pageTitle) {
      this.trackEvent('page_view', {
        hash: pageHash,
        title: pageTitle,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      });
    }

    /**
     * Registra interacción con botones clave
     */
    trackButtonClick(buttonName, context = {}) {
      this.trackEvent('button_click', { buttonName, ...context });
    }

    /**
     * Registra envío de formularios
     */
    trackFormSubmit(formName, context = {}) {
      this.trackEvent('form_submit', { formName, ...context });
    }

    /**
     * Envía por lote los eventos acumulados al servidor o simula entrega
     */
    async flush() {
      if (this.eventQueue.length === 0 || !navigator.onLine) return;

      const eventsToSend = [...this.eventQueue];

      try {
        if (window.CONFIG?.API_URL && !window.CONFIG.IS_MOCK) {
          await window.api.request('batch_analytics', { events: eventsToSend });
        }
        
        // Remover de la cola los eventos procesados
        this.eventQueue = this.eventQueue.filter(e => !eventsToSend.includes(e));
        this._persistQueue();
      } catch (err) {
        console.warn('[Analytics] Reintento de envío de analíticas programado para el próximo ciclo:', err);
      }
    }
  }

  window.analytics = new AnalyticsService();
})();

