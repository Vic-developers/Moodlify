/**
 * ==============================================================================
 * MOODLIFY - UI WIDGETS (js/components/widgets.js)
 * Reusable UI Components: MetricCard, StatusBadge, EmptyState,
 * Notification Drawer & Context Menu Dropdowns
 * ==============================================================================
 */

(function () {
  'use strict';

  class WidgetsSystem {
    /**
     * Renderiza una tarjeta de métrica KPI
     */
    metricCard({
      label = '',
      value = '0',
      trend = null, // { value: '+12%', isPositive: true }
      subtext = 'respecto al período anterior',
      icon = '',
      colorClass = 'primary' // 'primary' | 'success' | 'warning' | 'danger' | 'info'
    }) {
      const trendHtml = trend
        ? `<span class="metric-trend ${trend.isPositive ? 'up' : 'down'}">
            ${trend.isPositive ? '↑' : '↓'} ${trend.value}
           </span>`
        : '';

      return `
        <div class="metric-card animate-fade-in">
          <div class="metric-header">
            <span class="metric-label">${label}</span>
            <div class="metric-icon-wrap ${colorClass}">
              ${icon}
            </div>
          </div>
          <div class="metric-value">${value}</div>
          <div class="metric-footer">
            ${trendHtml}
            <span class="metric-subtext">${subtext}</span>
          </div>
        </div>
      `;
    }

    /**
     * Renderiza un pill de estado con indicador luminoso
     */
    statusBadge(status, customLabel) {
      const map = {
        active: { label: 'Activo', class: 'active', badgeClass: 'badge-success' },
        maintenance: { label: 'Mantenimiento', class: 'maintenance', badgeClass: 'badge-warning' },
        error: { label: 'Error', class: 'error', badgeClass: 'badge-danger' },
        inactive: { label: 'Inactivo', class: 'inactive', badgeClass: 'badge-neutral' },
        suspended: { label: 'Suspendido', class: 'error', badgeClass: 'badge-danger' },
        draft: { label: 'Borrador', class: 'inactive', badgeClass: 'badge-neutral' },
        archived: { label: 'Archivado', class: 'inactive', badgeClass: 'badge-neutral' },
        open: { label: 'Abierta', class: 'maintenance', badgeClass: 'badge-warning' },
        in_progress: { label: 'En Progreso', class: 'active', badgeClass: 'badge-info' },
        resolved: { label: 'Resuelta', class: 'active', badgeClass: 'badge-success' }
      };

      const item = map[status] || { label: status, class: 'inactive', badgeClass: 'badge-neutral' };
      const label = customLabel || item.label;

      return `
        <span class="badge ${item.badgeClass}">
          <span class="status-dot ${item.class}"></span>
          ${window.security ? window.security.escapeHtml(label) : label}
        </span>
      `;
    }

    /**
     * Renderiza un estado vacío elegante con icono y botón de acción
     */
    emptyState({
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
      title = 'No hay registros',
      description = 'Comienza añadiendo tu primer elemento con el botón a continuación.',
      actionButton = null // { label: 'Crear nuevo', onClick: '...' }
    }) {
      const actionHtml = actionButton
        ? `<button class="btn btn-primary" onclick="${actionButton.onClick}">${actionButton.label}</button>`
        : '';

      return `
        <div class="empty-state animate-fade-in">
          <div class="empty-state-icon">
            <div style="width: 32px; height: 32px;">${icon}</div>
          </div>
          <h3 class="empty-state-title">${title}</h3>
          <p class="empty-state-description">${description}</p>
          ${actionHtml ? `<div class="empty-state-actions">${actionHtml}</div>` : ''}
        </div>
      `;
    }

    /**
     * Alterna la visualización del panel flotante de Notificaciones
     */
    toggleNotificationsDrawer() {
      let drawer = document.getElementById('notifications-drawer');

      if (drawer) {
        drawer.parentNode.removeChild(drawer);
        return;
      }

      const notifs = window.notifications ? window.notifications.getNotifications() : [];

      drawer = document.createElement('div');
      drawer.id = 'notifications-drawer';
      drawer.className = 'animate-slide-up';
      drawer.style.cssText = `
        position: absolute;
        top: 64px;
        right: 1.5rem;
        width: 380px;
        max-width: calc(100vw - 2rem);
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: var(--shadow-xl);
        z-index: 100;
        overflow: hidden;
      `;

      let notifItemsHtml = '';
      if (notifs.length === 0) {
        notifItemsHtml = `
          <div style="padding: 2.5rem 1.5rem; text-align: center; color: var(--muted); font-size: 0.85rem;">
            No tienes notificaciones pendientes
          </div>
        `;
      } else {
        notifItemsHtml = notifs.map(n => `
          <div style="padding: 0.85rem 1.15rem; border-bottom: 1px solid var(--border); background: ${n.read ? 'transparent' : 'var(--bg-alt)'}; cursor: pointer;"
               onclick="window.widgets.handleNotificationClick('${n.id}', '${n.link || ''}')">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
              <span style="font-size: 0.825rem; font-weight: 600; color: var(--text);">${window.security.escapeHtml(n.title)}</span>
              <span style="font-size: 0.7rem; color: var(--muted);">${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p style="font-size: 0.775rem; color: var(--muted); margin: 0; line-height: 1.35;">${window.security.escapeHtml(n.message)}</p>
          </div>
        `).join('');
      }

      drawer.innerHTML = `
        <div style="padding: 0.95rem 1.15rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-alt);">
          <span style="font-size: 0.875rem; font-weight: 600; color: var(--text);">Centro de Notificaciones</span>
          <button class="btn btn-ghost btn-sm" onclick="window.notifications.markAllAsRead(); window.widgets.toggleNotificationsDrawer();" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;">
            Marcar todo leído
          </button>
        </div>
        <div style="max-height: 360px; overflow-y: auto;">
          ${notifItemsHtml}
        </div>
      `;

      document.body.appendChild(drawer);

      // Cerrar al hacer clic fuera
      const closeHandler = (e) => {
        if (!drawer.contains(e.target) && !e.target.closest('#notifications-trigger-btn')) {
          if (drawer.parentNode) drawer.parentNode.removeChild(drawer);
          document.removeEventListener('click', closeHandler);
        }
      };

      setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }

    handleNotificationClick(id, link) {
      if (window.notifications) window.notifications.markAsRead(id);
      this.toggleNotificationsDrawer();
      if (link && window.router) {
        window.router.navigate(link);
      }
    }
  }

  window.widgets = new WidgetsSystem();
})();

