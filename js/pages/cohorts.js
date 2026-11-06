/**
 * ==============================================================================
 * MOODLIFY - COHORTES, GRUPOS Y HORARIOS (js/pages/cohorts.js)
 * Agrupacion academica por ciclo y recinto + timetable docente.
 * ==============================================================================
 */
(function () {
  'use strict';
  let activeTab = 'cohorts'; // cohorts | groups | schedules
  let filterCycle = 'all';

  const cohortsPage = {
    render: async function (container) {
      const state = window.store.getState();
      const cohorts = state.cohorts || [];
      const groups = state.groups || [];
      const schedules = state.schedules || [];
      const cycles = [...new Set((state.academicPeriods||[]).map(p=>p.ciclo).concat(cohorts.map(c=>c.cicloAcademico)))].sort().reverse();

      container.innerHTML = `
        <div class="animate-fade-in">
          <div class="page-header">
            <div>
              <h1 class="page-title">Cohortes, Grupos y Horarios</h1>
              <p class="page-subtitle">Organización por ciclo académico y recinto: quién, en qué grupo, con qué docente y a qué hora</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-primary" onclick="window.cohortsPage.openModal('${activeTab}')">
                <i data-lucide="plus"></i> Nuevo ${activeTab==='cohorts'?'Cohorte':activeTab==='groups'?'Grupo':'Horario'}
              </button>
            </div>
          </div>

          <div class="metrics-grid">
            ${window.widgets.metricCard({label:'Cohortes', value: cohorts.length, trend:null, subtext:'por ciclo', icon:'<i data-lucide="database"></i>', colorClass:'primary'})}
            ${window.widgets.metricCard({label:'Grupos', value: groups.length, trend:null, subtext:'subdivisiones', icon:'<i data-lucide="users"></i>', colorClass:'success'})}
            ${window.widgets.metricCard({label:'Horarios semana', value: schedules.length, trend:null, subtext:'clases programadas', icon:'<i data-lucide="clock"></i>', colorClass:'info'})}
            ${window.widgets.metricCard({label:'Capacidad total', value: cohorts.reduce((a,c)=>a+(c.capacity||0),0), trend:null, subtext:'cupos de cohorte', icon:'<i data-lucide="calendar"></i>', colorClass:'warning'})}
          </div>

          <div class="nav-tabs">
            <button class="nav-tab-btn ${activeTab==='cohorts'?'active':''}" onclick="window.cohortsPage.setTab('cohorts')"><i data-lucide="database" style="width:16px;height:16px;"></i> Cohortes <span class="nav-tab-badge">${cohorts.length}</span></button>
            <button class="nav-tab-btn ${activeTab==='groups'?'active':''}" onclick="window.cohortsPage.setTab('groups')"><i data-lucide="users" style="width:16px;height:16px;"></i> Grupos <span class="nav-tab-badge">${groups.length}</span></button>
            <button class="nav-tab-btn ${activeTab==='schedules'?'active':''}" onclick="window.cohortsPage.setTab('schedules')"><i data-lucide="clock" style="width:16px;height:16px;"></i> Horarios <span class="nav-tab-badge">${schedules.length}</span></button>
            <select class="form-select" style="width:auto;margin-left:auto;" onchange="window.cohortsPage.onCycle(this.value)">
              <option value="all" ${filterCycle==='all'?'selected':''}>Todos los ciclos</option>
              ${cycles.map(cy=>`<option value="${window.security.escapeHtml(cy)}" ${filterCycle===cy?'selected':''}>${window.security.escapeHtml(cy)}</option>`).join('')}
            </select>
          </div>

          <div id="cohorts-tab-body">${activeTab==='cohorts'? this._renderCohorts(state) : activeTab==='groups'? this._renderGroups(state) : this._renderSchedules(state)}</div>
        </div>`;
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },
    setTab: function (t) { activeTab=t; this.render(document.getElementById('page-container')); },
    onCycle: function (v) { filterCycle=v; this.render(document.getElementById('page-container')); },
    _renderCohorts: function (state) {
      let list = [...(state.cohorts||[])];
      if (filterCycle!=='all') list = list.filter(c=>c.cicloAcademico===filterCycle);
      return `<div class="card"><div class="table-container"><table class="table">
        <thead><tr><th>Cohorte</th><th>Recinto / Plataforma</th><th>Ciclo</th><th>Capacidad</th><th>Grupos</th><th style="text-align:right;">Acciones</th></tr></thead>
        <tbody>${list.length? list.map(c=>{
          const gCount = (state.groups||[]).filter(g=>g.cohortId===c.id).length;
          return `<tr><td><strong>${window.security.escapeHtml(c.name)}</strong><div style="font-size:0.75rem;color:var(--muted);">${window.security.escapeHtml(c.description||'')}</div></td>
          <td><span class="badge badge-secondary">${window.security.escapeHtml(c.platformName)}</span></td>
          <td><span class="badge badge-info">${window.security.escapeHtml(c.cicloAcademico)}</span></td>
          <td>${c.capacity||0}</td><td>${gCount}</td>
          <td style="text-align:right;white-space:nowrap;"><button class="btn btn-ghost btn-sm" onclick="window.cohortsPage.openModal('cohorts','${c.id}')">Editar</button><button class="btn btn-ghost btn-sm btn-icon" onclick="window.cohortsPage.deleteItem('cohorts','${c.id}')"><i data-lucide="trash-2" style="width:15px;height:15px;color:var(--danger);"></i></button></td></tr>`;
        }).join('') : `<tr><td colspan="6" style="text-align:center;padding:2rem;">${window.widgets.emptyState({icon:'<i data-lucide="database"></i>',title:'Sin cohortes',description:'Crea una cohorte por ciclo y recinto.'})}</td></tr>`}</tbody>
        </table></div></div>`;
    },
    _renderGroups: function (state) {
      let list = [...(state.groups||[])];
      if (filterCycle!=='all') {
        const cohortIds = new Set((state.cohorts||[]).filter(c=>c.cicloAcademico===filterCycle).map(c=>c.id));
        list = list.filter(g=>cohortIds.has(g.cohortId));
      }
      return `<div class="card"><div class="table-container"><table class="table">
        <thead><tr><th>Grupo</th><th>Cohorte</th><th>Ciclo</th><th>Capacidad</th><th style="text-align:right;">Acciones</th></tr></thead>
        <tbody>${list.length? list.map(g=>{
          const coh = (state.cohorts||[]).find(c=>c.id===g.cohortId);
          return `<tr><td><strong>${window.security.escapeHtml(g.name)}</strong></td>
          <td>${window.security.escapeHtml(coh? coh.name : g.cohortId)}</td>
          <td><span class="badge badge-info">${window.security.escapeHtml(coh? coh.cicloAcademico : '—')}</span></td>
          <td>${g.capacity||0}</td>
          <td style="text-align:right;white-space:nowrap;"><button class="btn btn-ghost btn-sm" onclick="window.cohortsPage.openModal('groups','${g.id}')">Editar</button><button class="btn btn-ghost btn-sm btn-icon" onclick="window.cohortsPage.deleteItem('groups','${g.id}')"><i data-lucide="trash-2" style="width:15px;height:15px;color:var(--danger);"></i></button></td></tr>`;
        }).join('') : `<tr><td colspan="5" style="text-align:center;padding:2rem;">${window.widgets.emptyState({icon:'<i data-lucide="users"></i>',title:'Sin grupos',description:'Divide cada cohorte en grupos de capacidad limitada.'})}</td></tr>`}</tbody>
        </table></div></div>`;
    },
    _renderSchedules: function (state) {
      let list = [...(state.schedules||[])];
      if (filterCycle!=='all') {
        const cohortIds = new Set((state.cohorts||[]).filter(c=>c.cicloAcademico===filterCycle).map(c=>c.id));
        list = list.filter(s=>!s.cohortId || cohortIds.has(s.cohortId));
      }
      const dayOrder = {Lunes:1,Martes:2,Miércoles:3,Jueves:4,Viernes:5,Sábado:6,Domingo:7};
      list.sort((a,b)=> (dayOrder[a.day]||9)-(dayOrder[b.day]||9) || String(a.hourStart).localeCompare(String(b.hourStart)));
      return `<div class="card"><div class="table-container"><table class="table">
        <thead><tr><th>Día / Hora</th><th>Curso</th><th>Docente</th><th>Cohorte / Grupo</th><th>Aula</th><th style="text-align:right;">Acciones</th></tr></thead>
        <tbody>${list.length? list.map(s=>{
          const course = (state.courses||[]).find(c=>c.id===s.courseId);
          const teacher = (state.users||[]).find(u=>u.id===s.teacherId);
          const cohort = (state.cohorts||[]).find(c=>c.id===s.cohortId);
          const grp = (state.groups||[]).find(g=>g.id===s.groupId);
          return `<tr>
            <td><span class="badge badge-primary">${window.security.escapeHtml(s.day)}</span> <span style="font-family:monospace;font-size:0.8rem;">${window.security.escapeHtml(s.hourStart||'')} → ${window.security.escapeHtml(s.hourEnd||'')}</span></td>
            <td><strong>${window.security.escapeHtml(course? course.shortname : s.courseId)}</strong><div style="font-size:0.75rem;color:var(--muted);">${window.security.escapeHtml(course? course.fullname : '')}</div></td>
            <td>${window.security.escapeHtml(teacher? teacher.firstname+' '+teacher.lastname : s.teacherId)}</td>
            <td style="font-size:0.8125rem;">${window.security.escapeHtml(cohort? cohort.name : '—')}${grp? ` · ${window.security.escapeHtml(grp.name)}` : ''}</td>
            <td>${window.security.escapeHtml(s.room||'Virtual')}</td>
            <td style="text-align:right;white-space:nowrap;"><button class="btn btn-ghost btn-sm" onclick="window.cohortsPage.openModal('schedules','${s.id}')">Editar</button><button class="btn btn-ghost btn-sm btn-icon" onclick="window.cohortsPage.deleteItem('schedules','${s.id}')"><i data-lucide="trash-2" style="width:15px;height:15px;color:var(--danger);"></i></button></td></tr>`;
        }).join('') : `<tr><td colspan="6" style="text-align:center;padding:2rem;">${window.widgets.emptyState({icon:'<i data-lucide="clock"></i>',title:'Sin horarios',description:'Programar clases por día, hora y aula.'})}</td></tr>`}</tbody>
        </table></div></div>`;
    },
    openModal: function (kind, id) {
      const state = window.store.getState();
      let content='', title='';
      if (kind==='cohorts') {
        title = id?'Editar cohorte':'Nueva cohorte';
        const ex = id? (state.cohorts||[]).find(c=>c.id===id) : null;
        const cycles = (state.academicPeriods||[]).map(p=>p.ciclo);
        content = `
          <form id="cohort-form" onsubmit="event.preventDefault(); window.cohortsPage.handleCohort('${id||''}');">
            <div class="form-group"><label class="form-label required">Nombre</label><input class="form-input" id="coh-name" required value="${window.security.escapeHtml(ex?.name||'')}" placeholder="Ej: Ingeniería 2026-I — A"/></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group"><label class="form-label required">Recinto / Plataforma</label>
                <select class="form-select" id="coh-platform" required>${state.platforms.map(p=>`<option value="${p.id}" ${ex?.platformId===p.id?'selected':''}>${window.security.escapeHtml(p.name)}</option>`).join('')}</select></div>
              <div class="form-group"><label class="form-label required">Ciclo</label><input class="form-input" id="coh-cycle" list="coh-cycles" required value="${window.security.escapeHtml(ex?.cicloAcademico||'')}" placeholder="2026-I"/><datalist id="coh-cycles">${cycles.map(cy=>`<option value="${window.security.escapeHtml(cy)}">`).join('')}</datalist></div>
            </div>
            <div class="form-group"><label class="form-label required">Capacidad</label><input type="number" class="form-input" id="coh-cap" required min="1" value="${ex?.capacity||30}"/></div>
            <div class="form-group"><label class="form-label">Descripción</label><textarea class="form-textarea" id="coh-desc" rows="2">${window.security.escapeHtml(ex?.description||'')}</textarea></div>
          </form>`;
      } else if (kind==='groups') {
        title = id?'Editar grupo':'Nuevo grupo';
        const ex = id? (state.groups||[]).find(g=>g.id===id) : null;
        content = `
          <form id="group-form" onsubmit="event.preventDefault(); window.cohortsPage.handleGroup('${id||''}');">
            <div class="form-group"><label class="form-label required">Nombre del grupo</label><input class="form-input" id="grp-name" required value="${window.security.escapeHtml(ex?.name||'')}" placeholder="Ej: Grupo A1"/></div>
            <div class="form-group"><label class="form-label required">Cohorte</label>
              <select class="form-select" id="grp-cohort" required>${(state.cohorts||[]).map(c=>`<option value="${c.id}" ${ex?.cohortId===c.id?'selected':''}>${window.security.escapeHtml(c.name)} (${window.security.escapeHtml(c.cicloAcademico)})</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label required">Capacidad</label><input type="number" class="form-input" id="grp-cap" required min="1" value="${ex?.capacity||20}"/></div>
          </form>`;
      } else {
        title = id?'Editar horario':'Nuevo horario';
        const ex = id? (state.schedules||[]).find(s=>s.id===id) : null;
        const teachers = (state.users||[]).filter(u=>['editingteacher','teacher'].includes(u.role));
        content = `
          <form id="sch-form" onsubmit="event.preventDefault(); window.cohortsPage.handleSchedule('${id||''}');">
            <div class="form-group"><label class="form-label required">Curso</label>
              <select class="form-select" id="sch-course" required>${state.courses.map(c=>`<option value="${c.id}" ${ex?.courseId===c.id?'selected':''}>${window.security.escapeHtml(c.fullname)} (${window.security.escapeHtml(c.shortname)})</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label required">Docente</label>
              <select class="form-select" id="sch-teacher" required>${teachers.map(t=>`<option value="${t.id}" ${ex?.teacherId===t.id?'selected':''}>${window.security.escapeHtml(t.firstname+' '+t.lastname)}</option>`).join('')}</select></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group"><label class="form-label">Cohorte</label>
                <select class="form-select" id="sch-cohort"><option value="">Sin cohorte</option>${(state.cohorts||[]).map(c=>`<option value="${c.id}" ${ex?.cohortId===c.id?'selected':''}>${window.security.escapeHtml(c.name)}</option>`).join('')}</select></div>
              <div class="form-group"><label class="form-label">Grupo</label>
                <select class="form-select" id="sch-group"><option value="">Sin grupo</option>${(state.groups||[]).map(g=>`<option value="${g.id}" ${ex?.groupId===g.id?'selected':''}>${window.security.escapeHtml(g.name)}</option>`).join('')}</select></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
              <div class="form-group"><label class="form-label required">Día</label>
                <select class="form-select" id="sch-day">${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d=>`<option ${ex?.day===d?'selected':''}>${d}</option>`).join('')}</select></div>
              <div class="form-group"><label class="form-label required">Inicio</label><input type="time" class="form-input" id="sch-start" required value="${ex?.hourStart||'09:00'}"/></div>
              <div class="form-group"><label class="form-label required">Fin</label><input type="time" class="form-input" id="sch-end" required value="${ex?.hourEnd||'11:00'}"/></div>
            </div>
            <div class="form-group"><label class="form-label">Aula / Sala</label><input class="form-input" id="sch-room" value="${window.security.escapeHtml(ex?.room||'')}" placeholder="Ej: A-101 o Virtual-Zoom"/></div>
          </form>`;
      }
      const footer = `<button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button><button class="btn btn-primary" onclick="document.querySelector('#cohort-form, #group-form, #sch-form')?.requestSubmit()">Guardar</button>`;
      window.modal.open({title, content, footer});
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },
    handleCohort: function (id) {
      const state = window.store.getState();
      const platformId = document.getElementById('coh-platform').value;
      const plat = state.platforms.find(p=>p.id===platformId);
      const data = { name: document.getElementById('coh-name').value.trim(), platformId, platformName: plat? plat.name:'', cicloAcademico: document.getElementById('coh-cycle').value.trim(), capacity: parseInt(document.getElementById('coh-cap').value,10)||0, description: document.getElementById('coh-desc').value.trim() };
      let list = id? (state.cohorts||[]).map(c=>c.id===id?{...c,...data}:c) : [{id:'coh-'+Date.now(),...data},...(state.cohorts||[])];
      window.store.setState({cohorts:list});
      if (window.toast) window.toast.success(id?'Cohorte actualizada':'Cohorte creada');
      window.modal.close(); this.render(document.getElementById('page-container'));
    },
    handleGroup: function (id) {
      const state = window.store.getState();
      const data = { name: document.getElementById('grp-name').value.trim(), cohortId: document.getElementById('grp-cohort').value, capacity: parseInt(document.getElementById('grp-cap').value,10)||0 };
      let list = id? (state.groups||[]).map(g=>g.id===id?{...g,...data}:g) : [{id:'grp-'+Date.now(),...data},...(state.groups||[])];
      window.store.setState({groups:list});
      if (window.toast) window.toast.success(id?'Grupo actualizado':'Grupo creado');
      window.modal.close(); this.render(document.getElementById('page-container'));
    },
    handleSchedule: function (id) {
      const state = window.store.getState();
      const data = { courseId: document.getElementById('sch-course').value, teacherId: document.getElementById('sch-teacher').value, cohortId: document.getElementById('sch-cohort').value||null, groupId: document.getElementById('sch-group').value||null, day: document.getElementById('sch-day').value, hourStart: document.getElementById('sch-start').value, hourEnd: document.getElementById('sch-end').value, room: document.getElementById('sch-room').value.trim() };
      let list = id? (state.schedules||[]).map(s=>s.id===id?{...s,...data}:s) : [{id:'sch-'+Date.now(),...data},...(state.schedules||[])];
      window.store.setState({schedules:list});
      if (window.toast) window.toast.success(id?'Horario actualizado':'Horario creado');
      window.modal.close(); this.render(document.getElementById('page-container'));
    },
    deleteItem: function (kind, id) {
      window.modal.confirm({title:'Eliminar', message:'¿Eliminar este registro?', confirmText:'Eliminar', type:'danger', onConfirm:()=>{
        const state = window.store.getState();
        if (kind==='cohorts') window.store.setState({cohorts:(state.cohorts||[]).filter(x=>x.id!==id)});
        else if (kind==='groups') window.store.setState({groups:(state.groups||[]).filter(x=>x.id!==id)});
        else window.store.setState({schedules:(state.schedules||[]).filter(x=>x.id!==id)});
        if (window.toast) window.toast.info('Eliminado');
        this.render(document.getElementById('page-container'));
      }});
    }
  };
  window.cohortsPage = cohortsPage;
})();
