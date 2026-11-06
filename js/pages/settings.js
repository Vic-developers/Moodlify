/**
 * ==============================================================================
 * MOODLIFY - SETTINGS PAGE (js/pages/settings.js)
 * Tabs: General, Notifications, Security, Integrations, Audit Logs & Danger Zone
 * ==============================================================================
 */

(function () {
  'use strict';

  let activeTab = 'general';

  const settingsPage = {
    render: async function (container) {
      const state = window.store.getState();
      const settings = state.settings || {};

      container.innerHTML = `
        <div class="animate-fade-in">
          <!-- Page Header -->
          <div class="page-header">
            <div>
              <h1 class="page-title">Configuración de Moodlify</h1>
              <p class="page-subtitle">Preferencias generales, políticas de seguridad, integraciones y auditoría</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-primary" onclick="window.settingsPage.saveSettings()">
                <i data-lucide="save"></i> Guardar Configuración
              </button>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border); margin-bottom: 1.75rem; overflow-x: auto;">
            <button class="btn btn-ghost ${activeTab === 'general' ? 'active-period-btn' : ''}" style="border-radius: 0; border-bottom: 2px solid ${activeTab === 'general' ? 'var(--primary)' : 'transparent'};" onclick="window.settingsPage.setTab('general')">
              <i data-lucide="sliders" style="width: 16px; height: 16px;"></i> General
            </button>
            <button class="btn btn-ghost ${activeTab === 'notifications' ? 'active-period-btn' : ''}" style="border-radius: 0; border-bottom: 2px solid ${activeTab === 'notifications' ? 'var(--primary)' : 'transparent'};" onclick="window.settingsPage.setTab('notifications')">
              <i data-lucide="bell" style="width: 16px; height: 16px;"></i> Notificaciones
            </button>
            <button class="btn btn-ghost ${activeTab === 'security' ? 'active-period-btn' : ''}" style="border-radius: 0; border-bottom: 2px solid ${activeTab === 'security' ? 'var(--primary)' : 'transparent'};" onclick="window.settingsPage.setTab('security')">
              <i data-lucide="shield" style="width: 16px; height: 16px;"></i> Seguridad
            </button>
            <button class="btn btn-ghost ${activeTab === 'integrations' ? 'active-period-btn' : ''}" style="border-radius: 0; border-bottom: 2px solid ${activeTab === 'integrations' ? 'var(--primary)' : 'transparent'};" onclick="window.settingsPage.setTab('integrations')">
              <i data-lucide="webhook" style="width: 16px; height: 16px;"></i> Integraciones y API
            </button>
            <button class="btn btn-ghost ${activeTab === 'logs' ? 'active-period-btn' : ''}" style="border-radius: 0; border-bottom: 2px solid ${activeTab === 'logs' ? 'var(--primary)' : 'transparent'};" onclick="window.settingsPage.setTab('logs')">
              <i data-lucide="file-text" style="width: 16px; height: 16px;"></i> Logs de Auditoría
            </button>
          </div>

          <!-- Tab Content Panels -->
          <div id="settings-tab-content">
            ${this._renderActiveTabContent(state, settings)}
          </div>
        </div>
      `;
    },

    _renderActiveTabContent: function (state, settings) {
      switch (activeTab) {
        case 'general':
          return `
            <div class="card" style="max-width: 800px; padding: 1.5rem;">
              <h3 class="card-title" style="margin-bottom: 1.25rem;">Parámetros Generales de la Institución</h3>
              <div class="form-group">
                <label class="form-label required">Nombre de la Institución o Consorcio</label>
                <input type="text" class="form-input" id="set-inst-name" value="${window.security.escapeHtml(settings.institutionName || 'Consorcio Universitario')}" />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label required">Zona Horaria Predeterminada</label>
                  <select class="form-select" id="set-timezone">
                    <option value="America/Santiago" ${settings.timezone === 'America/Santiago' ? 'selected' : ''}>América/Santiago (UTC-3)</option>
                    <option value="America/Bogota" ${settings.timezone === 'America/Bogota' ? 'selected' : ''}>América/Bogotá (UTC-5)</option>
                    <option value="America/Mexico_City" ${settings.timezone === 'America/Mexico_City' ? 'selected' : ''}>América/Ciudad de México (UTC-6)</option>
                    <option value="Europe/Madrid" ${settings.timezone === 'Europe/Madrid' ? 'selected' : ''}>Europa/Madrid (UTC+1)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label required">Idioma de Interfaz</label>
                  <select class="form-select" id="set-lang">
                    <option value="es" ${settings.language === 'es' ? 'selected' : ''}>Español (Castellano)</option>
                    <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English (US)</option>
                    <option value="pt" ${settings.language === 'pt' ? 'selected' : ''}>Português (Brasil)</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Intervalo de Sincronización Automática (minutos)</label>
                <input type="number" class="form-input" id="set-sync-interval" value="${settings.autoSyncInterval || 30}" min="5" max="1440" />
                <span class="form-helper">Frecuencia en segundo plano para cotejar cambios entre Moodle y Moodlify</span>
              </div>
            </div>
          `;

        case 'notifications':
          return `
            <div class="card" style="max-width: 800px; padding: 1.5rem;">
              <h3 class="card-title" style="margin-bottom: 1.25rem;">Canales de Notificación y Alertas</h3>
              <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <label class="form-checkbox-label">
                  <input type="checkbox" class="form-checkbox" id="set-notif-email" ${settings.emailNotifications ? 'checked' : ''} />
                  <div>
                    <strong>Notificaciones por Correo Electrónico</strong>
                    <div class="form-helper">Enviar correos cuando ocurran caídas de plataformas o errores críticos</div>
                  </div>
                </label>

                <label class="form-checkbox-label">
                  <input type="checkbox" class="form-checkbox" id="set-notif-push" ${settings.pushNotifications ? 'checked' : ''} />
                  <div>
                    <strong>Notificaciones de Escritorio (Web Push API)</strong>
                    <div class="form-helper">Mostrar globos emergentes en el navegador para tickets urgentes</div>
                  </div>
                </label>

                <div>
                  <button class="btn btn-secondary btn-sm" onclick="window.notifications.requestPushPermission()">
                    <i data-lucide="bell-ring"></i> Probar Permisos Web Push
                  </button>
                </div>
              </div>
            </div>
          `;

        case 'security':
          return `
            <div class="card" style="max-width: 800px; padding: 1.5rem; margin-bottom: 1.75rem;">
              <h3 class="card-title" style="margin-bottom: 1.25rem;">Políticas de Autenticación y Sesiones</h3>
              <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <label class="form-checkbox-label">
                  <input type="checkbox" class="form-checkbox" id="set-sec-2fa" ${settings.security2FA ? 'checked' : ''} />
                  <div>
                    <strong>Autenticación de Dos Factores (2FA) Obligatoria</strong>
                    <div class="form-helper">Requerir código TOTP para administradores de TI</div>
                  </div>
                </label>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Tiempo de Expiración de Sesión por Inactividad (Minutos)</label>
                  <input type="number" class="form-input" id="set-sec-timeout" value="${settings.sessionTimeoutMinutes || 60}" min="15" max="480" />
                </div>
              </div>
            </div>

            <!-- Danger Zone -->
            <div class="card" style="max-width: 800px; padding: 1.5rem; border: 1px solid var(--danger); background: var(--bg-alt);">
              <h3 class="card-title" style="color: var(--danger); margin-bottom: 0.5rem;">Zona de Peligro</h3>
              <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1rem;">
                Restablecer la base de datos devolverá todas las plataformas, usuarios y cursos a los datos mock iniciales de fábrica.
              </p>
              <button class="btn btn-danger" onclick="window.settingsPage.resetDatabase()">
                <i data-lucide="trash-2"></i> Restablecer Almacén Local de Datos
              </button>
            </div>
          `;

        case 'integrations':
          return `
            <div class="card" style="max-width: 800px; padding: 1.5rem; margin-bottom: 1.75rem;">
              <h3 class="card-title" style="margin-bottom: 1.25rem;">Conexión Backend Principal</h3>
              <div class="form-group">
                <label class="form-label">Endpoint URL (Google Apps Script Web App o Supabase)</label>
                <input type="url" class="form-input" id="set-api-url" value="${window.CONFIG?.API_URL || ''}" placeholder="https://script.google.com/macros/s/.../exec" />
                <span class="form-helper">Si se deja vacío, Moodlify opera en Modo Demostración 100% interactivo.</span>
              </div>
            </div>

            <div class="card" style="max-width: 800px; padding: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                <div>
                  <h3 class="card-title">Webhooks Salientes Registrados</h3>
                  <div class="card-description">Disparo de eventos con firma HMAC-SHA256</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="window.settingsPage.openAddWebhookModal()">
                  <i data-lucide="plus"></i> Añadir Webhook
                </button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                ${(window.webhooks ? window.webhooks.getEndpoints() : []).map(ep => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem; border: 1px solid var(--border); border-radius: 8px; background: var(--card);">
                    <div>
                      <div style="font-weight: 600; font-size: 0.9rem; color: var(--text);">${window.security.escapeHtml(ep.name)}</div>
                      <div style="font-size: 0.75rem; font-family: monospace; color: var(--muted);">${window.security.escapeHtml(ep.url)}</div>
                    </div>
                    <button class="btn btn-ghost btn-sm" style="color: var(--danger);" onclick="window.settingsPage.deleteWebhook('${ep.id}')">
                      Eliminar
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          `;

        case 'logs':
          return `
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Registro de Auditoría de Seguridad</h3>
                  <div class="card-description">Trazabilidad de accesos y modificaciones administrativas</div>
                </div>
              </div>
              <div class="table-container" style="border: none; border-radius: 0;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Fecha / Hora</th>
                      <th>Acción</th>
                      <th>Usuario</th>
                      <th>Dirección IP</th>
                      <th>Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${state.auditLogs.map(l => `
                      <tr>
                        <td style="font-size: 0.8rem; color: var(--muted);">${new Date(l.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td><code>${window.security.escapeHtml(l.action)}</code></td>
                        <td><strong>${window.security.escapeHtml(l.user)}</strong></td>
                        <td><span style="font-family: monospace; font-size: 0.8rem;">${window.security.escapeHtml(l.ip)}</span></td>
                        <td style="font-size: 0.85rem; color: var(--text-secondary);">${window.security.escapeHtml(l.details)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
      }
    },

    setTab: function (tab) {
      activeTab = tab;
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    saveSettings: function () {
      const state = window.store.getState();
      const newSettings = {
        ...state.settings,
        institutionName: document.getElementById('set-inst-name')?.value || state.settings.institutionName,
        timezone: document.getElementById('set-timezone')?.value || state.settings.timezone,
        language: document.getElementById('set-lang')?.value || state.settings.language,
        autoSyncInterval: parseInt(document.getElementById('set-sync-interval')?.value || '30', 10),
        emailNotifications: document.getElementById('set-notif-email')?.checked ?? state.settings.emailNotifications,
        pushNotifications: document.getElementById('set-notif-push')?.checked ?? state.settings.pushNotifications,
        security2FA: document.getElementById('set-sec-2fa')?.checked ?? state.settings.security2FA,
        sessionTimeoutMinutes: parseInt(document.getElementById('set-sec-timeout')?.value || '60', 10)
      };

      window.store.setState({ settings: newSettings });
      if (window.toast) window.toast.success('Configuración guardada correctamente');
    },

    resetDatabase: function () {
      window.modal.confirm({
        title: '¿Restablecer Base de Datos?',
        message: 'Esta acción borrará todas las modificaciones locales de localStorage y restaurará los datos mock originales.',
        confirmText: 'Restablecer Todo',
        type: 'danger',
        onConfirm: () => {
          if (window.store) window.store.reset();
          if (window.toast) window.toast.info('Base de datos restablecida a los valores iniciales');
          setTimeout(() => window.location.reload(), 400);
        }
      });
    },

    openAddWebhookModal: function () {
      const content = `
        <form id="add-wh-form" onsubmit="event.preventDefault(); window.settingsPage.handleAddWebhook();">
          <div class="form-group">
            <label class="form-label required">Nombre de la Integración</label>
            <input type="text" class="form-input" id="wh-name" placeholder="Ej: Canal Discord Notificaciones TI" required />
          </div>
          <div class="form-group">
            <label class="form-label required">URL del Webhook (POST)</label>
            <input type="url" class="form-input" id="wh-url" placeholder="https://..." required />
          </div>
        </form>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('add-wh-form').requestSubmit()">Registrar</button>
      `;

      window.modal.open({
        title: 'Registrar Nuevo Webhook Saliente',
        content,
        footer
      });
    },

    handleAddWebhook: function () {
      const name = document.getElementById('wh-name').value.trim();
      const url = document.getElementById('wh-url').value.trim();

      if (!name || !url) return;

      if (window.webhooks) {
        window.webhooks.addEndpoint({ name, url, events: ['*'] });
      }

      if (window.toast) window.toast.success('Webhook registrado');
      window.modal.close();
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    },

    deleteWebhook: function (id) {
      if (window.webhooks) {
        window.webhooks.deleteEndpoint(id);
      }
      if (window.toast) window.toast.info('Webhook eliminado');
      this.render(document.getElementById('page-container'));
      if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
    }
  };

  window.settingsPage = settingsPage;
})();

