/**
 * ==============================================================================
 * MOODLIFY - ACTIVIDAD Y PROGRESO (js/pages/activity.js)
 * Completitud, ultima actividad, nota y riesgo por matricula (derivada de
 * enrollments + fallback de Moodle via moodle-service).
 * ==============================================================================
 */
(function () {
  'use strict';
  let filterCourse = 'all';
  let filterPlatform = 'all';
  let filterRisk = 'all';
  let searchQuery = '';

  const activityPage = {
    render: async function (container) {
      const state = window.store.getState();
      const rows = this._buildRows(state);
      const filtered = this._applyFilters(rows);
      const avgProgress = filtered.length ? Math.round(filtered.reduce((a,r)=>a+r.progress,0)/filtered.length) : 0;
      const atRisk = filtered.filter(r=>r.risk==='Alto').length;
      const inactive7 = filtered.filter(r=>r.hoursAgo>=168).length;

      container.innerHTML = `
        <div class="animate-fade-in">
          <div class="page-header">
            <div>
              <h1 class="page-title">Actividad y Progreso</h1>
              <p class="page-subtitle">Completitud y riesgo por matrícula. Datos derivados de <code>core_enrol_get_enrolled_users</code> y actividad Moodle.</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-secondary" onclick="window.activityPage.syncNow(this)"><i data-lucide="refresh-cw"></i> Sincronizar actividad</button>
              <button class="btn btn-secondary" onclick="window.router.navigate('#reports')"><i data-lucide="bar-chart-3"></i> Reportes de progreso</button>
            </div>
          </div>

          <div class="metrics-grid">
            ${window.widgets.metricCard({label:'Completitud promedio', value: avgProgress+'%', trend:null, subtext:`${filtered.length} matrícula(s)`, icon:'<i data-lucide="trending-up"></i>', colorClass:'primary'})}
            ${window.widgets.metricCard({label:'En riesgo ALTO', value: atRisk, trend:{value:'acción recomendada',isPositive:false}, subtext:'sin actividad o progreso bajo', icon:'<i data-lucide="alert-triangle"></i>', colorClass:'warning'})}
            ${window.widgets.metricCard({label:'Inactivos +7 días', value: inactive7, trend:null, subtext:'último acceso', icon:'<i data-lucide="user-x"></i>', colorClass:'info'})}
            ${window.widgets.metricCard({label:'Completados 100%', value: filtered.filter(r=>r.progress>=100).length, trend:null, subtext:'certificables', icon:'<i data-lucide="award"></i>', colorClass:'success'})}
          </div>

          <div class="card" style="margin-bottom:1.5rem;padding:1rem 1.25rem;">
            <div style="display:flex;gap:0.75rem;align-items:center;justify-content:space-between;flex-wrap:wrap;">
              <div class="input-icon-wrapper" style="max-width:300px;width:100%;">
                <i data-lucide="search"></i>
                <input type="text" class="form-input" placeholder="Buscar estudiante o curso..." value="${window.security.escapeHtml(searchQuery)}" oninput="window.activityPage.onSearch(this.value)"/>
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <select class="form-select" style="width:auto;" onchange="window.activityPage.onFilter('course',this.value)">
                  <option value="all" ${filterCourse==='all'?'selected':''}>Todos los cursos</option>
                  ${state.courses.map(c=>`<option value="${c.id}" ${filterCourse===c.id?'selected':''}>${window.security.escapeHtml(c.shortname)}</option>`).join('')}
                </select>
                <select class="form-select" style="width:auto;" onchange="window.activityPage.onFilter('platform',this.value)">
                  <option value="all" ${filterPlatform==='all'?'selected':''}>Todos los recintos</option>
                  ${state.platforms.map(p=>`<option value="${p.id}" ${filterPlatform===p.id?'selected':''}>${window.security.escapeHtml(p.name)}</option>`).join('')}
                </select>
                <select class="form-select" style="width:auto;" onchange="window.activityPage.onFilter('risk',this.value)">
                  <option value="all" ${filterRisk==='all'?'selected':''}>Todo riesgo</option>
                  <option value="Alto" ${filterRisk==='Alto'?'selected':''}>Alto</option>
                  <option value="Medio" ${filterRisk==='Medio'?'selected':''}>Medio</option>
                  <option value="Bajo" ${filterRisk==='Bajo'?'selected':''}>Bajo</option>
                </select>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="table-container"><table class="table">
              <thead><tr><th>Estudiante</th><th>Curso</th><th>Progreso</th><th>Última actividad</th><th>Nota</th><th>Riesgo</th></tr></thead>
              <tbody>
              ${filtered.length? filtered.map(r=>`
                <tr>
                  <td><strong>${window.security.escapeHtml(r.userName)}</strong><div style="font-size:0.75rem;color:var(--muted);">${window.security.escapeHtml(r.userEmail)}</div></td>
                  <td><strong>${window.security.escapeHtml(r.shortname)}</strong><div style="font-size:0.75rem;color:var(--muted);">${window.security.escapeHtml(r.courseName)}</div></td>
                  <td style="min-width:140px;">
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                      <div style="flex:1;height:8px;background:var(--bg-hover);border-radius:999px;overflow:hidden;">
                        <div style="height:100%;width:${r.progress}%;background:${r.progress>=80?'var(--success)':r.progress>=50?'var(--primary)':'var(--warning)'};"></div>
                      </div><strong>${r.progress}%</strong>
                    </div>
                  </td>
                  <td style="font-size:0.8125rem;">${r.hoursAgo<24? `hace ${Math.round(r.hoursAgo)}h` : `hace ${Math.round(r.hoursAgo/24)}d`}<div style="font-size:0.72rem;color:var(--muted);">${new Date(r.lastAccessAt).toLocaleString()}</div></td>
                  <td>${r.grade!=null? r.grade.toFixed(1) : '—'}</td>
                  <td>${r.risk==='Alto'? '<span class="badge badge-danger">Alto</span>' : r.risk==='Medio'? '<span class="badge badge-warning">Medio</span>' : '<span class="badge badge-success">Bajo</span>'}</td>
                </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;padding:2rem;">${window.widgets.emptyState({icon:'<i data-lucide="activity"></i>',title:'Sin actividad',description:'Sincroniza o ajusta filtros.'})}</td></tr>`}
              </tbody></table></div>
          </div>
        </div>`;
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },
    _buildRows: function (state) {
      const courseMap = new Map((state.courses||[]).map(c=>[c.id,c]));
      return (state.enrollments||[]).filter(e=>e.status!=='failed').map(e=>{
        const c = courseMap.get(e.courseId);
        const lastAccessAt = e.lastAccessAt || e.enrolledAt || new Date().toISOString();
        const hoursAgo = Math.max(0, (Date.now() - new Date(lastAccessAt).getTime())/3600000);
        const progress = (e.progressPercent!=null? e.progressPercent : 0);
        let risk = 'Bajo';
        if (progress < 40 && hoursAgo > 72) risk='Alto';
        else if (progress < 70 && hoursAgo > 48) risk='Medio';
        else if (progress < 30) risk='Medio';
        return { ...e, shortname: c? c.shortname : '', courseName: e.courseName, progress, lastAccessAt, hoursAgo, grade: e.grade||null, risk };
      });
    },
    _applyFilters: function (rows) {
      let list = [...rows];
      if (filterCourse!=='all') list = list.filter(r=>r.courseId===filterCourse);
      if (filterPlatform!=='all') list = list.filter(r=>r.platformId===filterPlatform);
      if (filterRisk!=='all') list = list.filter(r=>r.risk===filterRisk);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter(r=> (r.userName||'').toLowerCase().includes(q) || (r.courseName||'').toLowerCase().includes(q) || (r.shortname||'').toLowerCase().includes(q));
      }
      return list;
    },
    onSearch: function (v) { searchQuery=v; this.render(document.getElementById('page-container')); const el=document.querySelector('.input-icon-wrapper .form-input'); if(el){el.focus(); el.setSelectionRange(el.value.length,el.value.length);} },
    onFilter: function (k,v) { if(k==='course')filterCourse=v; if(k==='platform')filterPlatform=v; if(k==='risk')filterRisk=v; this.render(document.getElementById('page-container')); },
    syncNow: async function (btn) {
      if (btn) btn.classList.add('btn-loading');
      await new Promise(r=>setTimeout(r,600));
      const state = window.store.getState();
      // Simula sync: actualiza lastAccessAt aleatoriamente leve para demo
      const updated = (state.enrollments||[]).map(e=>{
        if (e.status==='failed') return e;
        return {...e, lastAccessAt: new Date(Date.now() - Math.floor(Math.random()*48)*3600000).toISOString()};
      });
      window.store.setState({enrollments:updated});
      if (btn) btn.classList.remove('btn-loading');
      if (window.toast) window.toast.success('Actividad sincronizada desde Moodle (demo)');
      this.render(document.getElementById('page-container'));
    }
  };
  window.activityPage = activityPage;
})();
