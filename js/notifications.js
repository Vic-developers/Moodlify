/**
 * ==============================================================================
 * MOODLIFY - NOTIFICATIONS SYSTEM (js/notifications.js)
 * In-App Notification Center, Web Push API integration, Unread Badges,
 * Persistent Store & Audio/Visual Dispatches
 * ==============================================================================
 */

(function () {
  'use strict';

  const INITIAL_NOTIFICATIONS = [
    {
      id: 'notif-1',
      title: 'Sincronización Exitosa',
      message: 'Campus Principal Pregrado sincronizó 14 nuevos usuarios y 2 cursos.',
      type: 'success',
      link: '#platforms',
      read: false,
      timestamp: new Date(Date.now() - 35 * 60000).toISOString()
    },
    {
      id: 'notif-2',
      title: 'Alerta de Seguridad: Token Expirado',
      message: 'El token del servicio web para Posgrado requiere renovación antes de 24 horas.',
      type: 'warning',
      link: '#incidences',
      read: false,
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: 'notif-3',
      title: 'Incidencia Resuelta',
      message: 'Mariana Valenzuela resolvió la matrícula por lote en el curso INF-401.',
      type: 'info',
      link: '#incidences',
      read: true,
      timestamp: new Date(Date.now() - 8 * 3600000).toISOString()
    }
  ];

  class NotificationService {
    constructor() {
      this.storageKey = window.CONFIG?.STORAGE_KEYS?.NOTIFICATIONS || 'moodlify_notifications';
      this.notifications = this._loadNotifications();
      this.pushPermission = (typeof window.Notification !== 'undefined') ? Notification.permission : 'default';

      this._init();
    }

    _init() {
      this._updateBadgeUI();
    }

    _loadNotifications() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) return JSON.parse(raw);
      } catch (_) {}
      return [...INITIAL_NOTIFICATIONS];
    }

    _persist() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
      } catch (_) {}
      this._updateBadgeUI();
    }

    /**
     * Emite una nueva notificación in-app y opcionalmente Web Push
     */
    async notify({ title, message, type = 'info', link = null }) {
      const newNotif = {
        id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        title,
        message,
        type, // 'info' | 'success' | 'warning' | 'error'
        link,
        read: false,
        timestamp: new Date().toISOString()
      };

      this.notifications.unshift(newNotif);
      if (this.notifications.length > 50) this.notifications.pop();
      this._persist();

      // Mostrar toast si el componente está activo
      if (window.toast) {
        if (type === 'success') window.toast.success(message, title);
        else if (type === 'warning') window.toast.warning(message, title);
        else if (type === 'error') window.toast.error(message, title);
        else window.toast.info(message, title);
      }

      // Web Push Notification nativo si hay permisos
      if (this.pushPermission === 'granted' && typeof window.Notification !== 'undefined') {
        try {
          new Notification(title, {
            body: message,
            icon: '/manifest.json'
          });
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent('moodlify:notifications-updated', {
        detail: { unreadCount: this.getUnreadCount() }
      }));

      return newNotif;
    }

    /**
     * Solicita permiso para notificaciones push en el navegador
     */
    async requestPushPermission() {
      if (typeof window.Notification === 'undefined') {
        if (window.toast) window.toast.warning('Tu navegador no soporta notificaciones de escritorio.');
        return 'unsupported';
      }

      try {
        const permission = await Notification.requestPermission();
        this.pushPermission = permission;
        if (permission === 'granted' && window.toast) {
          window.toast.success('Notificaciones de escritorio habilitadas');
        }
        return permission;
      } catch (err) {
        return 'denied';
      }
    }

    /**
     * Marca una notificación como leída
     */
    markAsRead(id) {
      this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n);
      this._persist();
    }

    /**
     * Marca todas las notificaciones como leídas
     */
    markAllAsRead() {
      this.notifications = this.notifications.map(n => ({ ...n, read: true }));
      this._persist();
      if (window.toast) window.toast.info('Todas las notificaciones marcadas como leídas');
    }

    /**
     * Elimina el historial completo de notificaciones
     */
    clearAll() {
      this.notifications = [];
      this._persist();
    }

    getNotifications() {
      return [...this.notifications];
    }

    getUnreadCount() {
      return this.notifications.filter(n => !n.read).length;
    }

    /**
     * Actualiza el badge numérico visual en la barra superior
     */
    _updateBadgeUI() {
      const badge = document.getElementById('notifications-badge-count');
      const count = this.getUnreadCount();

      if (badge) {
        if (count > 0) {
          badge.textContent = count > 9 ? '9+' : count;
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }
    }
  }

  window.notifications = new NotificationService();
})();

