/**
 * ==============================================================================
 * MOODLIFY - PERIODOS & CALENDARIO ACADEMICO (js/pages/periods.js)
 * Tabla maestra de ciclos academicos: estado, fechas y ventanas de matricula.
 * ==============================================================================
 */
(function () {
  'use strict';
  const periodsPage = {
    render: async function (container) {
      const state = window.store.getState();
      const periods = (state.academicPeriods || []).slice().sort((a,b)=> (b.ciclo||'').localeCompare(a.ciclo||''));
      const active = periods.find(p=>p.status==='activo');
      container.innerHTML = `
        <div class="animate-fade-in">
          <div class="page-header">
            <div>
              <h1 class="page-title">Periodos y Calendario Académico</h1>
              <p class="page-subtitle">Ciclos maestros que alimentan Data Docente, Matrículas y Reportes${active ? ` · Activo: <strong>${active.ciclo}</strong>` : ''}</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-primary" onclick="window.periodsPage.openModal()"><i data-lucide="plus"></i> Nuevo Ciclo</button>
            </div>
          </div>
          <div class="metrics-grid">
            ${window.widgets.metricCard({label:'Ciclos registrados', value: periods.length, trend:null, subtext:'tabla maestra', icon:'<i data-lucide="calendar"></i>', colorClass:'primary'})}
            ${window.widgets.metricCard({label:'Ciclo activo', value: active ? active.ciclo : '—', trend:null, subtext: active ? `${active.startDate} → ${active.endDate}` : 'sin activo', icon:'<i data-lucide="clock"></i>', colorClass:'success'})}
            ${window.widgets.metricCard({label:'Programados', value: periods.filter(p=>p.status==='programado').length, trend:null, subtext:'próximos ciclos', icon:'<i data-lucide="calendar-clock"></i>', colorClass:'info'})}
            ${window.widgets.metricCard({label:'Cerrados', value: periods.filter(p=>p.status==='cerrado').length, trend:null, subtext:'históricos', icon:'<i data-lucide="archive"></i>', colorClass:'warning'})}
          </div>
          <div class="card">
            <div class="table-container">
              <table class="table">
                <thead><tr><th>Ciclo</th><th>Fechas académicas</th><th>Ventana de matrícula</th><th>Estado</th><th style="text-align:right;">Acciones</th></tr></thead>
                <tbody>
                ${periods.length===0 ? `<tr><td colspan="5" style="text-align:center;padding:2rem;">${window.widgets.emptyState({icon:'<i data-lucide="calendar-x"></i>',title:'Sin periodos',description:'Crea tu primer ciclo académico.'})}</td></tr>` : periods.map(p=>`
                  <tr>
                    <td><strong>${window.security.escapeHtml(p.ciclo)}</strong><div style="font-size:0.75rem;color:var(--muted);">${p.year} · Semestre ${p.semester}</div></td>
                    <td style="font-size:0.8125rem;">${p.startDate||'—'} → ${p.endDate||'—'}</td>
                    <td style="font-size:0.8125rem;">${p.enrollmentStart||'—'} → ${p.enrollmentEnd||'—'}</td>
                    <td>${p.status==='activo'? '<span class="badge badge-success"><span class="badge-dot pulse"></span> Activo</span>' : p.status==='programado'? '<span class="badge badge-primary">Programado</span>' : '<span class="badge badge-neutral">Cerrado</span>'}</td>
                    <td style="text-align:right;white-space:nowrap;">
                      ${p.status!=='activo'? `<button class="btn btn-secondary btn-sm" onclick="window.periodsPage.setActive('${p.id}')">Activar</button>` : ''}
                      <button class="btn btn-ghost btn-sm" onclick="window.periodsPage.openModal('${p.id}')">Editar</button>
                      <button class="btn btn-ghost btn-sm btn-icon" onclick="window.periodsPage.deletePeriod('${p.id}')"><i data-lucide="trash-2" style="width:15px;height:15px;color:var(--danger);"></i></button>
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>`;
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },
    openModal: function (id) {
      const state = window.store.getState();
      const existing = id ? (state.academicPeriods||[]).find(p=>p.id===id) : null;
      const content = `
        <form id="period-form" onsubmit="event.preventDefault(); window.periodsPage.handleSubmit('${id||''}');">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label required">Ciclo (Ej: 2026-I)</label><input class="form-input" id="per-ciclo" required value="${existing?.ciclo||''}" placeholder="2026-I"/></div>
            <div class="form-group"><label class="form-label required">Estado</label>
              <select class="form-select" id="per-status">
                <option value="activo" ${existing?.status==='activo'?'selected':''}>Activo</option>
                <option value="programado" ${existing?.status==='programado'?'selected':(!existing?'selected':'')}>Programado</option>
                <option value="cerrado" ${existing?.status==='cerrado'?'selected':''}>Cerrado</option>
              </select></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label">Fecha inicio académico</label><input type="date" class="form-input" id="per-start" value="${existing?.startDate||''}"/></div>
            <div class="form-group"><label class="form-label">Fecha fin académico</label><input type="date" class="form-input" id="per-end" value="${existing?.endDate||''}"/></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label">Inicio matrícula</label><input type="date" class="form-input" id="per-enr-start" value="${existing?.enrollmentStart||''}"/></div>
            <div class="form-group"><label class="form-label">Fin matrícula</label><input type="date" class="form-input" id="per-enr-end" value="${existing?.enrollmentEnd||''}"/></div>
          </div>
        </form>`;
      const footer = `<button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button><button class="btn btn-primary" onclick="document.getElementById('period-form').requestSubmit()">${existing?'Guardar':'Crear ciclo'}</button>`;
      window.modal.open({title: existing?'Editar ciclo académico':'Nuevo ciclo académico', content, footer});
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },
    handleSubmit: function (id) {
      const ciclo = document.getElementById('per-ciclo').value.trim();
      const status = document.getElementById('per-status').value;
      if (!ciclo) { if (window.toast) window.toast.warning('El ciclo es obligatorio'); return; }
      const state = window.store.getState();
      const m = ciclo.match(/^(\d{4})-(I|II|1|2)$/i);
      const year = m ? parseInt(m[1],10) : new Date().getFullYear();
      const semester = m ? (m[2].toUpperCase()==='II' || m[2]==='2' ? 'II' : 'I') : 'I';
      const data = { ciclo, year, semester, status, startDate: document.getElementById('per-start').value, endDate: document.getElementById('per-end').value, enrollmentStart: document.getElementById('per-enr-start').value, enrollmentEnd: document.getElementById('per-enr-end').value };
      let list;
      if (id) list = (state.academicPeriods||[]).map(p=> p.id===id? {...p,...data} : p);
      else list = [{id:'per-'+Date.now(), ...data}, ...(state.academicPeriods||[])];
      // Solo un ciclo activo a la vez
      if (status==='activo') list = list.map(p=> p.ciclo===ciclo ? {...p,status:'activo'} : (p.status==='activo'? {...p,status:'cerrado'} : p));
      window.store.setState({ academicPeriods: list });
      if (window.toast) window.toast.success(id?'Ciclo actualizado':'Ciclo creado');
      window.modal.close(); this.render(document.getElementById('page-container'));
    },
    setActive: function (id) {
      const state = window.store.getState();
      const target = (state.academicPeriods||[]).find(p=>p.id===id);
      if (!target) return;
      const list = (state.academicPeriods||[]).map(p=> p.id===id? {...p,status:'activo'} : (p.status==='activo'? {...p,status:'cerrado'} : p));
      window.store.setState({academicPeriods:list});
      if (window.toast) window.toast.success(`Ciclo ${target.ciclo} activado`);
      this.render(document.getElementById('page-container'));
    },
    deletePeriod: function (id) {
      window.modal.confirm({title:'Eliminar ciclo', message:'¿Eliminar este ciclo académico? La docencia existente no se borra.', confirmText:'Eliminar', type:'danger', onConfirm:()=>{
        const state = window.store.getState();
        window.store.setState({academicPeriods:(state.academicPeriods||[]).filter(p=>p.id!==id)});
        if (window.toast) window.toast.info('Ciclo eliminado');
        this.render(document.getElementById('page-container'));
      }});
    }
  };
  window.periodsPage = periodsPage;
})();
