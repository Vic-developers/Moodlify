/**
 * ==============================================================================
 * MOODLIFY - BACKUPS Y RESTAURACION (js/pages/backups.js)
 * Copias .mbz por curso con estado, tamano y acciones de restore/descarga.
 * ==============================================================================
 */
(function () {
  'use strict';
  let filterStatus = 'all';
  let searchQuery = '';

  const backupsPage = {
    render: async function (container) {
      const state = window.store.getState();
      let backups = [...(state.backups||[])].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
      if (filterStatus!=='all') backups = backups.filter(b=>b.status===filterStatus);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        backups = backups.filter(b=> (b.courseName||'').toLowerCase().includes(q) || (b.shortname||'').toLowerCase().includes(q));
      }
      const totalSize = backups.reduce((a,b)=>a+(b.sizeMB||0),0);

      container.innerHTML = `
        <div class="animate-fade-in">
          <div class="page-header">
            <div>
              <h1 class="page-title">Backups y Restauración</h1>
              <p class="page-subtitle">Copias de respaldo <code>.mbz</code> por curso. Automatízalas desde Automatizaciones (backup diario 02:00).</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-secondary" onclick="window.backupsPage.createAuto()"><i data-lucide="zap"></i> Backup automático ahora</button>
              <button class="btn btn-primary" onclick="window.backupsPage.openCreateModal()"><i data-lucide="plus"></i> Nuevo backup manual</button>
            </div>
          </div>

          <div class="metrics-grid">
            ${window.widgets.metricCard({label:'Backups totales', value:(state.backups||[]).length, trend:null, subtext:`${totalSize} MB en vista`, icon:'<i data-lucide="database"></i>', colorClass:'primary'})}
            ${window.widgets.metricCard({label:'Exitosos', value:(state.backups||[]).filter(b=>b.status==='success').length, trend:null, subtext:'restaurables', icon:'<i data-lucide="check-circle"></i>', colorClass:'success'})}
            ${window.widgets.metricCard({label:'Fallidos', value:(state.backups||[]).filter(b=>b.status==='failed').length, trend:{value:'revisar',isPositive:false}, subtext:'ver bitácora', icon:'<i data-lucide="alert-triangle"></i>', colorClass:'warning'})}
            ${window.widgets.metricCard({label:'Automáticos', value:(state.backups||[]).filter(b=>b.type==='automatico').length, trend:null, subtext:'desde Automatizaciones', icon:'<i data-lucide="clock"></i>', colorClass:'info'})}
          </div>

          <div class="card" style="margin-bottom:1.25rem;padding:1rem 1.25rem;">
            <div style="display:flex;gap:0.75rem;align-items:center;justify-content:space-between;flex-wrap:wrap;">
              <div class="input-icon-wrapper" style="max-width:300px;width:100%;">
                <i data-lucide="search"></i>
                <input type="text" class="form-input" placeholder="Buscar curso..." value="${window.security.escapeHtml(searchQuery)}" oninput="window.backupsPage.onSearch(this.value)"/>
              </div>
              <select class="form-select" style="width:auto;" onchange="window.backupsPage.onStatus(this.value)">
                <option value="all" ${filterStatus==='all'?'selected':''}>Todos los estados</option>
                <option value="success" ${filterStatus==='success'?'selected':''}>Exitosos</option>
                <option value="failed" ${filterStatus==='failed'?'selected':''}>Fallidos</option>
                <option value="running" ${filterStatus==='running'?'selected':''}>En curso</option>
              </select>
            </div>
          </div>

          <div class="card">
            <div class="table-container"><table class="table">
              <thead><tr><th>Curso</th><th>Archivo</th><th>Tamaño</th><th>Fecha</th><th>Tipo</th><th>Estado</th><th style="text-align:right;">Acciones</th></tr></thead>
              <tbody>
              ${backups.length? backups.map(b=>`
                <tr>
                  <td><strong>${window.security.escapeHtml(b.shortname)}</strong><div style="font-size:0.75rem;color:var(--muted);">${window.security.escapeHtml(b.courseName)}</div><div style="font-size:0.72rem;color:var(--muted);">${window.security.escapeHtml(b.platformName)}</div></td>
                  <td style="font-family:monospace;font-size:0.75rem;">${window.security.escapeHtml(b.fileName)}</td>
                  <td>${b.sizeMB} MB</td>
                  <td style="font-size:0.8125rem;">${new Date(b.createdAt).toLocaleString()}</td>
                  <td><span class="badge ${b.type==='automatico'?'badge-info':'badge-secondary'}">${b.type||'manual'}</span></td>
                  <td>${b.status==='success'?'<span class="badge badge-success">Exitoso</span>':b.status==='failed'?'<span class="badge badge-danger">Fallido</span>':'<span class="badge badge-warning">En curso</span>'}</td>
                  <td style="text-align:right;white-space:nowrap;">
                    <button class="btn btn-secondary btn-sm" onclick="window.backupsPage.restoreBackup('${b.id}')">Restaurar</button>
                    <button class="btn btn-ghost btn-sm" onclick="window.backupsPage.downloadBackup('${b.id}')">Descargar</button>
                    <button class="btn btn-ghost btn-sm btn-icon" onclick="window.backupsPage.deleteBackup('${b.id}')"><i data-lucide="trash-2" style="width:15px;height:15px;color:var(--danger);"></i></button>
                  </td>
                </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;padding:2rem;">${window.widgets.emptyState({icon:'<i data-lucide="archive"></i>',title:'Sin backups',description:'Crea un backup manual o ejecuta el automático.'})}</td></tr>`}
              </tbody></table></div>
          </div>
        </div>`;
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },
    onSearch: function (v){searchQuery=v; this.render(document.getElementById('page-container')); const el=document.querySelector('.input-icon-wrapper .form-input'); if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}},
    onStatus: function (v){filterStatus=v; this.render(document.getElementById('page-container'));},
    openCreateModal: function () {
      const state = window.store.getState();
      const content = `
        <form id="bkp-form" onsubmit="event.preventDefault(); window.backupsPage.handleCreate();">
          <div class="form-group"><label class="form-label required">Curso a respaldar</label>
            <select class="form-select" id="bkp-course" required>${state.courses.map(c=>`<option value="${c.id}">${window.security.escapeHtml(c.fullname)} (${window.security.escapeHtml(c.shortname)})</option>`).join('')}</select>
          </div>
          <div style="font-size:0.8125rem;color:var(--muted);">Se generará un <code>.mbz</code> con actividades, recursos y log del curso. En demo el contenido es simulado.</div>
        </form>`;
      const footer = `<button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button><button class="btn btn-primary" onclick="document.getElementById('bkp-form').requestSubmit()">Crear backup</button>`;
      window.modal.open({title:'Nuevo backup manual', content, footer});
    },
    handleCreate: function (typeOverride) {
      const state = window.store.getState();
      const courseId = document.getElementById('bkp-course')?.value;
      const course = state.courses.find(c=>c.id===courseId) || state.courses[0];
      if (!course) return;
      const sizeMB = 40 + Math.floor(Math.random()*120);
      const type = typeOverride || 'manual';
      const entry = { id:'bkp-'+Date.now(), courseId: course.id, courseName: course.fullname, shortname: course.shortname, platformId: course.platformId, platformName: course.platformName, createdAt: new Date().toISOString(), sizeMB, status:'success', type, fileName: `${course.shortname}_backup_${new Date().toISOString().slice(0,10)}.mbz` };
      window.store.setState({backups:[entry, ...(state.backups||[])]});
      if (window.toast) window.toast.success(`Backup ${entry.fileName} creado (${sizeMB} MB)`);
      window.modal.close(); this.render(document.getElementById('page-container'));
    },
    createAuto: function () {
      // Backup automático del curso con más alumnos (simula cron diario)
      const state = window.store.getState();
      const course = [...state.courses].sort((a,b)=>(b.studentsCount||0)-(a.studentsCount||0))[0];
      if (!course) return;
      const sizeMB = 40 + Math.floor(Math.random()*100);
      const entry = { id:'bkp-'+Date.now(), courseId: course.id, courseName: course.fullname, shortname: course.shortname, platformId: course.platformId, platformName: course.platformName, createdAt: new Date().toISOString(), sizeMB, status:'success', type:'automatico', fileName: `${course.shortname}_backup_auto_${new Date().toISOString().slice(0,10)}.mbz` };
      window.store.setState({backups:[entry, ...(state.backups||[])]});
      if (window.toast) window.toast.success(`Backup automático: ${entry.fileName}`);
      this.render(document.getElementById('page-container'));
    },
    restoreBackup: function (id) {
      const b = (window.store.getState().backups||[]).find(x=>x.id===id);
      if (!b) return;
      if (b.status!=='success') { if (window.toast) window.toast.warning('Solo se pueden restaurar backups exitosos'); return; }
      if (window.toast) window.toast.success(`Restaurando ${b.fileName} sobre ${b.shortname}... (demo)`);
      // Toast informativo + log auditoría
      const state = window.store.getState();
      window.store.setState({auditLogs:[{id:'log-'+Date.now(), action:'BACKUP_RESTORE', user: state.auth?.user?.name||'Administrador', ip:'192.168.1.100', timestamp:new Date().toISOString(), details:`Restaurado ${b.fileName} → ${b.shortname}`}, ...state.auditLogs]});
    },
    downloadBackup: function (id) {
      const b = (window.store.getState().backups||[]).find(x=>x.id===id);
      if (!b) return;
      const blob = new Blob(['MOODLE BACKUP (DEMO)\n'+JSON.stringify(b,null,2)], {type:'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=b.fileName.replace('.mbz','.txt'); document.body.appendChild(a); a.click(); a.remove();
      if (window.toast) window.toast.info('Descarga iniciada (demo .txt)');
    },
    deleteBackup: function (id) {
      window.modal.confirm({title:'Eliminar backup', message:'¿Eliminar este backup?', confirmText:'Eliminar', type:'danger', onConfirm:()=>{
        const state = window.store.getState();
        window.store.setState({backups:(state.backups||[]).filter(b=>b.id!==id)});
        if (window.toast) window.toast.info('Backup eliminado');
        this.render(document.getElementById('page-container'));
      }});
    }
  };
  window.backupsPage = backupsPage;
})();
