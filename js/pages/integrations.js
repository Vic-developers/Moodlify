/**
 * ==============================================================================
 * MOODLIFY - INTEGRACIONES (js/pages/integrations.js)
 * Salud de Moodle, tokens WS, webhooks salientes y limites de API.
 * ==============================================================================
 */
(function () {
  'use strict';
  let activeTab = 'tokens'; // tokens | webhooks | health

  const integrationsPage = {
    render: async function (container) {
      const state = window.store.getState();
      container.innerHTML = `
        <div class="animate-fade-in">
          <div class="page-header">
            <div>
              <h1 class="page-title">Integraciones y Salud</h1>
              <p class="page-subtitle">Tokens Web Services de Moodle, webhooks salientes y límites de API (10 req/s)</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-secondary" onclick="window.integrationsPage.syncAll()"><i data-lucide="refresh-cw"></i> Probar todas</button>
            </div>
          </div>

          <div class="nav-tabs">
            <button class="nav-tab-btn ${activeTab==='tokens'?'active':''}" onclick="window.integrationsPage.setTab('tokens')"><i data-lucide="key" style="width:16px;height:16px;"></i> Tokens Moodle</button>
            <button class="nav-tab-btn ${activeTab==='webhooks'?'active':''}" onclick="window.integrationsPage.setTab('webhooks')"><i data-lucide="webhook" style="width:16px;height:16px;"></i> Webhooks salientes</button>
            <button class="nav-tab-btn ${activeTab==='health'?'active':''}" onclick="window.integrationsPage.setTab('health')"><i data-lucide="activity" style="width:16px;height:16px;"></i> Salud y límites</button>
          </div>

          <div id="integ-tab-body">${this._renderTab(state)}</div>
        </div>`;
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },
    setTab: function (t) { activeTab=t; this.render(document.getElementById('page-container')); },
    _renderTab: function (state) {
      if (activeTab==='webhooks') return this._renderWebhooks();
      if (activeTab==='health') return this._renderHealth(state);
      // tokens
      return `
        <div class="batch-info-box" style="margin-bottom:1rem;">
          <i data-lucide="key" style="width:24px;height:24px;color:var(--primary);"></i>
          <div style="flex:1;">Cada plataforma usa un <code>wstoken</code> para <code>core_webservice_get_site_info</code>, <code>core_user_get_users</code> y <code>enrol_manual_enrol_users</code>. El cliente aplica <strong>leaky bucket 10 req/s</strong>. Rota tokens cada 90 días.</div>
          <button class="btn btn-primary btn-sm" onclick="window.router.navigate('#platforms')"><i data-lucide="server"></i> Gestionar Plataformas</button>
        </div>
        <div class="card"><div class="table-container"><table class="table">
          <thead><tr><th>Plataforma</th><th>URL</th><th>Token (enmascarado)</th><th>Versión detectada</th><th>Latencia</th><th>Última sync</th><th>Estado</th><th style="text-align:right;">Acciones</th></tr></thead>
          <tbody>
          ${state.platforms.map(p=>`
            <tr>
              <td><strong>${window.security.escapeHtml(p.name)}</strong><div style="font-size:0.75rem;color:var(--muted);">${window.security.escapeHtml(p.institution||'')}</div></td>
              <td style="font-family:monospace;font-size:0.75rem;">${window.security.escapeHtml(p.url)}</td>
              <td style="font-family:monospace;font-size:0.75rem;">${this._mask(p.token||'')}</td>
              <td>${window.security.escapeHtml(p.version||'—')}</td>
              <td>${p.responseTimeMs||150} ms</td>
              <td style="font-size:0.775rem;color:var(--muted);">${p.lastSync? new Date(p.lastSync).toLocaleString():'—'}</td>
              <td>${p.status==='active'? '<span class="badge badge-success">Operativo</span>' : '<span class="badge badge-warning">Mantenimiento</span>'}</td>
              <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-secondary btn-sm" onclick="window.integrationsPage.testPlatform('${p.id}', this)">Probar</button>
                <button class="btn btn-ghost btn-sm" onclick="window.integrationsPage.openTokenModal('${p.id}')">Editar token</button>
              </td>
            </tr>`).join('')}
          </tbody></table></div></div>`;
    },
    _mask: function (t) {
      if (!t) return '—';
      if (t.length <= 12) return '••••••••';
      return t.slice(0,4)+'••••••••'+t.slice(-4);
    },
    _renderWebhooks: function () {
      const eps = window.webhooks ? window.webhooks.getEndpoints() : [];
      const logs = window.webhooks ? window.webhooks.getLogs() : [];
      return `
        <div class="batch-info-box" style="margin-bottom:1rem;">
          <i data-lucide="webhook" style="width:24px;height:24px;color:var(--primary);"></i>
          <div style="flex:1;">Los webhooks firman el payload con <code>HMAC-SHA256</code> (<code>X-Moodlify-Signature</code>). Se reintentan con backoff exponencial.</div>
          <button class="btn btn-primary btn-sm" onclick="window.integrationsPage.openWebhookModal()"><i data-lucide="plus"></i> Nuevo endpoint</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:1.25rem;">
          ${eps.map(ep=>`
            <div class="card" style="padding:1.25rem 1.5rem;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
                <div style="flex:1;min-width:260px;">
                  <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.3rem;">
                    <span class="badge ${ep.isActive?'badge-success':'badge-neutral'}"><span class="status-dot ${ep.isActive?'active':'inactive'}"></span> ${ep.isActive?'Activo':'Pausado'}</span>
                    <strong style="font-size:1rem;">${window.security.escapeHtml(ep.name)}</strong>
                  </div>
                  <div style="font-family:monospace;font-size:0.775rem;color:var(--muted);">${window.security.escapeHtml(ep.url)}</div>
                  <div style="margin-top:0.4rem;display:flex;gap:0.3rem;flex-wrap:wrap;">${(ep.events||[]).map(ev=>`<span class="badge badge-info" style="font-size:0.68rem;">${window.security.escapeHtml(ev)}</span>`).join('')}</div>
                </div>
                <div style="display:flex;gap:0.5rem;align-items:center;">
                  <button class="btn btn-secondary btn-sm" onclick="window.integrationsPage.testWebhook('${ep.id}', this)">Probar</button>
                  <button class="btn btn-ghost btn-sm" onclick="window.integrationsPage.toggleWebhook('${ep.id}')">${ep.isActive?'Pausar':'Activar'}</button>
                  <button class="btn btn-ghost btn-sm btn-icon" style="color:var(--danger);" onclick="window.integrationsPage.deleteWebhook('${ep.id}')"><i data-lucide="trash-2" style="width:15px;height:15px;"></i></button>
                </div>
              </div>
            </div>`).join('') || '<div class="card" style="padding:2rem;text-align:center;color:var(--muted);">Sin endpoints webhooks.</div>'}
        </div>
        <div class="card" style="margin-top:1.5rem;">
          <div class="card-header"><div><h3 class="card-title">Entregas recientes</h3><div class="card-description">Logs de dispatch con estado HTTP y latencia</div></div></div>
          <div class="table-container"><table class="table">
            <thead><tr><th>Endpoint</th><th>Evento</th><th>Estado</th><th>HTTP</th><th>Latencia</th><th>Fecha</th></tr></thead>
            <tbody>${logs.map(l=>`<tr><td>${window.security.escapeHtml(l.endpointName)}</td><td><span class="badge badge-secondary" style="font-family:monospace;font-size:0.72rem;">${window.security.escapeHtml(l.event)}</span></td><td>${l.status==='success'?'<span class="badge badge-success">OK</span>':'<span class="badge badge-danger">Falló</span>'}</td><td>${l.httpStatus}</td><td>${l.latencyMs} ms</td><td style="font-size:0.775rem;color:var(--muted);">${new Date(l.timestamp).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:1.5rem;">Sin entregas.</td></tr>'}</tbody>
          </table></div>
        </div>`;
    },
    _renderHealth: function (state) {
      const avg = Math.round(state.platforms.reduce((a,p)=>(a+(p.responseTimeMs||150)),0)/(state.platforms.length||1));
      return `
        <div class="metrics-grid">
          ${window.widgets.metricCard({label:'Latencia media Moodle', value: avg+' ms', trend:{value:'límite 10 req/s',isPositive:true}, subtext:'leaky bucket activo', icon:'<i data-lucide="activity"></i>', colorClass:'primary'})}
          ${window.widgets.metricCard({label:'Plataformas operativas', value: state.platforms.filter(p=>p.status==='active').length+' / '+state.platforms.length, trend:null, subtext:'health_check cada hora', icon:'<i data-lucide="server"></i>', colorClass:'success'})}
          ${window.widgets.metricCard({label:'Webhooks activos', value: (window.webhooks?.getEndpoints().filter(e=>e.isActive).length||0), trend:null, subtext:'firmados HMAC-SHA256', icon:'<i data-lucide="webhook"></i>', colorClass:'info'})}
          ${window.widgets.metricCard({label:'Entrega webhooks (últimas)', value:'100% ack', trend:{value:'simulado en demo',isPositive:true}, subtext:'ver pestaña Webhooks', icon:'<i data-lucide="check-circle"></i>', colorClass:'warning'})}
        </div>
        <div class="card"><div class="card-header"><div><h3 class="card-title">Checklist de producción</h3><div class="card-description">Requisitos antes de ir a producción real</div></div></div>
        <div class="card-body" style="font-size:0.875rem;line-height:1.6;">
          <div>✓ Rotar tokens Moodle cada 90 días y con permisos mínimos (<code>enrol_manual_enrol_users</code>)</div>
          <div>✓ Restringir CORS a tu dominio de Vercel (no usar `*`)</div>
          <div>✓ Extender CSP en <code>vercel.json</code> si agregas CDN</div>
          <div>✓ Configurar <code>MOODLIFY_API_URL</code> (Google Apps Script o Supabase) para salir de modo Mock</div>
          <div>✓ Canalizar lotes &gt;5.000 a cola (BullMQ/Cloud Tasks) para no saturar PHP de Moodle</div>
        </div></div>`;
    },
    syncAll: async function () {
      if (window.toast) window.toast.info('Probando todas las plataformas...');
      const s = window.store.getState();
      for (const p of s.platforms) await window.api.request('testPlatformConnection', {id:p.id});
      if (window.toast) window.toast.success('Prueba completa');
      this.render(document.getElementById('page-container'));
    },
    testPlatform: async function (id, btn) {
      if (btn) btn.classList.add('btn-loading');
      const res = await window.api.request('testPlatformConnection', {id});
      if (btn) btn.classList.remove('btn-loading');
      if (res.success) { if (window.toast) window.toast.success(`${res.message} (${res.data.latencyMs}ms)`); }
      this.render(document.getElementById('page-container'));
    },
    openTokenModal: function (id) {
      const p = window.store.getState().platforms.find(x=>x.id===id);
      if (!p) return;
      const content = `
        <form id="token-form" onsubmit="event.preventDefault(); window.integrationsPage.handleToken('${id}');">
          <div class="form-group"><label class="form-label">Plataforma</label><input class="form-input" value="${window.security.escapeHtml(p.name)}" disabled/></div>
          <div class="form-group"><label class="form-label required">Nuevo wstoken</label><input class="form-input" id="tok-val" required value="${window.security.escapeHtml(p.token||'')}" style="font-family:monospace;"/></div>
          <div style="font-size:0.8125rem;color:var(--muted);">Genera el token en Moodle: Administración → Servicios web → Tokens. Otorga solo las funciones necesarias.</div>
        </form>`;
      const footer = `<button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button><button class="btn btn-primary" onclick="document.getElementById('token-form').requestSubmit()">Guardar token</button>`;
      window.modal.open({title:'Editar token Web Service', content, footer});
    },
    handleToken: async function (id) {
      const tok = document.getElementById('tok-val').value.trim();
      const state = window.store.getState();
      const updated = state.platforms.map(p=> p.id===id? {...p, token:tok, lastSync:new Date().toISOString()} : p);
      window.store.setState({platforms:updated});
      if (window.toast) window.toast.success('Token actualizado. Prueba la conexión.');
      window.modal.close(); this.render(document.getElementById('page-container'));
    },
    openWebhookModal: function () {
      const content = `
        <form id="wh-form" onsubmit="event.preventDefault(); window.integrationsPage.handleWebhook();">
          <div class="form-group"><label class="form-label required">Nombre</label><input class="form-input" id="wh-name" required placeholder="Ej: Slack Alertas TI"/></div>
          <div class="form-group"><label class="form-label required">URL destino</label><input class="form-input" id="wh-url" required placeholder="https://hooks.slack.com/..."/></div>
          <div class="form-group"><label class="form-label">Eventos (separados por coma)</label><input class="form-input" id="wh-events" value="platform.error, incidence.created" placeholder="platform.error, user.created, course.enrolled, *"/></div>
          <div class="form-group"><label class="form-label">Secret HMAC (vacío = auto)</label><input class="form-input" id="wh-secret" placeholder="whsec_..."/></div>
        </form>`;
      const footer = `<button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button><button class="btn btn-primary" onclick="document.getElementById('wh-form').requestSubmit()">Crear endpoint</button>`;
      window.modal.open({title:'Nuevo webhook saliente', content, footer});
    },
    handleWebhook: function () {
      const name = document.getElementById('wh-name').value.trim();
      const url = document.getElementById('wh-url').value.trim();
      const events = document.getElementById('wh-events').value.split(',').map(s=>s.trim()).filter(Boolean);
      const secret = document.getElementById('wh-secret').value.trim() || undefined;
      if (!name || !url) return;
      window.webhooks.addEndpoint({name, url, events: events.length? events : ['*'], secret});
      if (window.toast) window.toast.success('Webhook creado');
      window.modal.close(); this.render(document.getElementById('page-container'));
    },
    toggleWebhook: function (id) {
      const ep = window.webhooks.getEndpoints().find(e=>e.id===id);
      if (!ep) return;
      ep.isActive = !ep.isActive;
      // persist via internal _persist through endpoint list refresh (re-save)
      window.webhooks.endpoints = window.webhooks.endpoints.map(e=> e.id===id? ep : e);
      window.webhooks._persist();
      this.render(document.getElementById('page-container'));
    },
    deleteWebhook: function (id) {
      window.webhooks.deleteEndpoint(id);
      if (window.toast) window.toast.info('Webhook eliminado');
      this.render(document.getElementById('page-container'));
    },
    testWebhook: async function (id, btn) {
      if (btn) btn.classList.add('btn-loading');
      await window.webhooks.dispatch('moodlify.ping', { endpointId:id });
      if (btn) btn.classList.remove('btn-loading');
      if (window.toast) window.toast.success('Prueba enviada (ver entregas)');
      this.render(document.getElementById('page-container'));
    }
  };
  window.integrationsPage = integrationsPage;
})();
