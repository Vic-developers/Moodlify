/**
 * ==============================================================================
 * MOODLIFY - MESA ACADEMICA DEL ESTUDIANTE (js/pages/academic-cases.js)
 * Casos academicos (dudas, reclamos de notas, reincorporacion, certificados)
 * con SLA, asignacion al docente de Data Docente y bitacora trazable.
 * ==============================================================================
 */
(function () {
  'use strict';

  let filterCategory = 'all';
  let filterStatus = 'all';
  let filterSla = 'all'; // all | incumplido | riesgo | ok
  let filterTeacher = 'all';
  let filterCycle = 'all';
  let searchQuery = '';

  const SLA_HOURS = { critical: 4, high: 24, medium: 48, low: 96 };
  const SLA_FIRST_RESPONSE = { critical: 1, high: 8, medium: 24, low: 48 };
  const CATEGORY_LABELS = {
    duda_academica: 'Duda académica',
    reclamo_notas: 'Reclamo de notas',
    reincorporacion: 'Reincorporación',
    reclamo_matricula: 'Reclamo de matrícula',
    certificado: 'Certificado',
    desercion: 'Riesgo de deserción',
    general: 'General'
  };

  const academicCasesPage = {
    render: async function (container) {
      const state = window.store.getState();
      const cases = state.academicCases || [];
      const enriched = cases.map(c => ({ ...c, sla: this._slaState(c) }));
      const filtered = this._applyFilters(enriched, state);

      const open = enriched.filter(c => c.status === 'open').length;
      const progress = enriched.filter(c => c.status === 'in_progress' || c.status === 'waiting_student').length;
      const breached = enriched.filter(c => c.sla.breached).length;
      const avgMTTR = this._avgMTTR(enriched);

      container.innerHTML = `
        <div class="animate-fade-in">
          <div class="page-header">
            <div>
              <h1 class="page-title">Mesa Académica Estudiantil</h1>
              <p class="page-subtitle">Casos del estudiante con SLA y trazabilidad al docente de Data Docente. Distinta de la mesa TI de Incidencias.</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-secondary" onclick="window.router.navigate('#incidences')"><i data-lucide="alert-triangle"></i> Ver mesa TI</button>
              <button class="btn btn-primary" onclick="window.academicCasesPage.openCreateModal()"><i data-lucide="plus"></i> Nuevo caso</button>
            </div>
          </div>

          <div class="metrics-grid">
            ${window.widgets.metricCard({label:'Casos abiertos', value: open, trend:{value:'requieren triage',isPositive:false}, subtext:'sin primera respuesta garantizada', icon:'<i data-lucide="inbox"></i>', colorClass:'warning'})}
            ${window.widgets.metricCard({label:'En seguimiento', value: progress, trend:null, subtext:'con docente asignado', icon:'<i data-lucide="user-check"></i>', colorClass:'primary'})}
            ${window.widgets.metricCard({label:'Incumplen SLA', value: breached, trend:{value: breached>0? 'escalar':'sin breaches',isPositive: breached===0}, subtext:'tiempo de respuesta/resolución', icon:'<i data-lucide="timer-off"></i>', colorClass: breached>0? 'danger':'success'})}
            ${window.widgets.metricCard({label:'MTTR promedio', value: avgMTTR? avgMTTR : '—', trend:null, subtext:'casos resueltos', icon:'<i data-lucide="clock"></i>', colorClass:'info'})}
          </div>

          <div class="batch-info-box" style="margin-bottom:1rem;">
            <i data-lucide="graduation-cap" style="width:24px;height:24px;color:var(--primary);flex-shrink:0;"></i>
            <div style="flex:1;">
              <div style="font-weight:700;color:var(--text);">Trazabilidad automática a Data Docente</div>
              <div>Al crear un caso, el sistema busca el docente que imparte ese curso en ese ciclo (desde <code>teachingAssignments</code>) y lo asigna. Si no hay asignación, queda <em>sin docente</em> para triage manual.</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('#teaching')"><i data-lucide="database"></i> Ver Data Docente</button>
          </div>

          <div class="card" style="margin-bottom:1.5rem;padding:1rem 1.25rem;">
            <div style="display:flex;gap:0.75rem;align-items:center;justify-content:space-between;flex-wrap:wrap;">
              <div class="input-icon-wrapper" style="max-width:300px;width:100%;">
                <i data-lucide="search"></i>
                <input type="text" class="form-input" placeholder="Buscar estudiante, curso o título..." value="${window.security.escapeHtml(searchQuery)}" oninput="window.academicCasesPage.onSearch(this.value)"/>
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
                <select class="form-select" style="width:auto;" onchange="window.academicCasesPage.onFilter('category',this.value)">
                  <option value="all" ${filterCategory==='all'?'selected':''}>Todas las categorías</option>
                  ${Object.entries(CATEGORY_LABELS).map(([v,l])=>`<option value="${v}" ${filterCategory===v?'selected':''}>${l}</option>`).join('')}
                </select>
                <select class="form-select" style="width:auto;" onchange="window.academicCasesPage.onFilter('status',this.value)">
                  <option value="all" ${filterStatus==='all'?'selected':''}>Todos los estados</option>
                  <option value="open" ${filterStatus==='open'?'selected':''}>Abierto</option>
                  <option value="in_progress" ${filterStatus==='in_progress'?'selected':''}>En seguimiento</option>
                  <option value="waiting_student" ${filterStatus==='waiting_student'?'selected':''}>Esperando estudiante</option>
                  <option value="resolved" ${filterStatus==='resolved'?'selected':''}>Resuelto</option>
                </select>
                <select class="form-select" style="width:auto;" onchange="window.academicCasesPage.onFilter('sla',this.value)">
                  <option value="all" ${filterSla==='all'?'selected':''}>Todo SLA</option>
                  <option value="incumplido" ${filterSla==='incumplido'?'selected':''}>Incumplido</option>
                  <option value="riesgo" ${filterSla==='riesgo'?'selected':''}>En riesgo</option>
                  <option value="ok" ${filterSla==='ok'?'selected':''}>Cumple</option>
                </select>
                <select class="form-select" style="width:auto;" onchange="window.academicCasesPage.onFilter('teacher',this.value)">
                  <option value="all" ${filterTeacher==='all'?'selected':''}>Todos los docentes</option>
                  ${(state.users||[]).filter(u=>['editingteacher','teacher'].includes(u.role)).map(t=>`<option value="${t.id}" ${filterTeacher===t.id?'selected':''}>${window.security.escapeHtml(t.firstname+' '+t.lastname)}</option>`).join('')}
                </select>
                <select class="form-select" style="width:auto;" onchange="window.academicCasesPage.onFilter('cycle',this.value)">
                  <option value="all" ${filterCycle==='all'?'selected':''}>Todos los ciclos</option>
                  ${([...new Set(cases.map(c=>c.cicloAcademico))].sort().reverse()).map(cy=>`<option value="${window.security.escapeHtml(cy)}" ${filterCycle===cy?'selected':''}>${window.security.escapeHtml(cy)}</option>`).join('')}
                </select>
                ${(filterCategory!=='all'||filterStatus!=='all'||filterSla!=='all'||filterTeacher!=='all'||filterCycle!=='all'||searchQuery)? `<button class="btn btn-ghost btn-sm" onclick="window.academicCasesPage.resetFilters()"><i data-lucide="x"></i> Limpiar</button>`:''}
              </div>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:1rem;">
          ${filtered.length===0? window.widgets.emptyState({title:'Sin casos para estos filtros',description:'Ajusta filtros o crea un nuevo caso académico.',actionButton:{label:'Nuevo caso',onClick:'window.academicCasesPage.openCreateModal()'}}) : filtered.map(c=>this._renderCard(c)).join('')}
          </div>
        </div>`;
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },

    _renderCard: function (c) {
      const priorityBadge = { critical:'<span class="badge badge-danger">Crítica</span>', high:'<span class="badge badge-warning">Alta</span>', medium:'<span class="badge badge-warning">Media</span>', low:'<span class="badge badge-neutral">Baja</span>' }[c.priority] || '<span class="badge badge-neutral">Normal</span>';
      const slaBadge = c.sla.breached
        ? '<span class="badge badge-danger"><i data-lucide="timer-off" style="width:12px;height:12px;"></i> SLA incumplido</span>'
        : c.sla.atRisk
          ? '<span class="badge badge-warning"><i data-lucide="timer" style="width:12px;height:12px;"></i> SLA en riesgo</span>'
          : '<span class="badge badge-success"><i data-lucide="timer" style="width:12px;height:12px;"></i> SLA OK</span>';
      const statusMap = { open:['Abierto','badge-warning'], in_progress:['En seguimiento','badge-info'], waiting_student:['Esperando estudiante','badge-secondary'], resolved:['Resuelto','badge-success'] };
      const [sLabel, sClass] = statusMap[c.status] || [c.status,'badge-neutral'];
      return `
        <div class="card animate-fade-in" style="padding:1.25rem 1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
            <div style="flex:1;min-width:280px;">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.35rem;">
                <span class="badge ${sClass}">${sLabel}</span>
                ${priorityBadge}
                <span class="badge badge-info">${window.security.escapeHtml(CATEGORY_LABELS[c.category]||c.category)}</span>
                ${slaBadge}
                <span style="font-size:0.75rem;color:var(--muted);">${new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <h3 style="font-size:1.05rem;font-weight:600;margin:0 0 0.35rem 0;">${window.security.escapeHtml(c.title)}</h3>
              <p style="font-size:0.85rem;color:var(--muted);margin:0 0 0.75rem 0;line-height:1.45;">${window.security.escapeHtml(c.description)}</p>
              <div style="display:flex;gap:1.25rem;font-size:0.8rem;color:var(--muted);flex-wrap:wrap;">
                <span><i data-lucide="user" style="width:14px;height:14px;vertical-align:middle;"></i> <strong>${window.security.escapeHtml(c.studentName)}</strong></span>
                <span><i data-lucide="book-open" style="width:14px;height:14px;vertical-align:middle;"></i> <strong>${window.security.escapeHtml(c.shortname)}</strong> · ${window.security.escapeHtml(c.cicloAcademico)}</span>
                <span><i data-lucide="graduation-cap" style="width:14px;height:14px;vertical-align:middle;"></i> Docente: <strong>${window.security.escapeHtml(c.teacherName||'Sin docente')}</strong></span>
                <span><i data-lucide="server" style="width:14px;height:14px;vertical-align:middle;"></i> ${window.security.escapeHtml(c.platformName||'')}</span>
              </div>
              <div style="margin-top:0.5rem;font-size:0.775rem;color:var(--muted);">SLA: vence ${new Date(c.slaDue).toLocaleString()} (${c.slaHours}h) · ${c.sla.remainingText}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.4rem;min-width:180px;">
              <button class="btn btn-secondary btn-sm" onclick="window.academicCasesPage.openDetail('${c.id}')">Ver detalle y traza</button>
              ${['open','in_progress','waiting_student'].includes(c.status)? `
                <button class="btn btn-primary btn-sm" onclick="window.academicCasesPage.advanceStatus('${c.id}', '${c.status==='open'?'in_progress':c.status==='in_progress'?'waiting_student':'resolved'}')">
                  ${c.status==='open'?'Iniciar seguimiento':c.status==='in_progress'?'Esperar estudiante':'Resolver caso'}
                </button>`:''}
              ${c.status==='resolved'? `<button class="btn btn-ghost btn-sm" onclick="window.academicCasesPage.advanceStatus('${c.id}','open')">Reabrir</button>`:''}
              <button class="btn btn-ghost btn-sm" onclick="window.academicCasesPage.deleteCase('${c.id}')">Eliminar</button>
            </div>
          </div>
        </div>`;
    },

    _slaState: function (c) {
      const hours = c.slaHours || SLA_HOURS[c.priority] || 48;
      const due = c.slaDue ? new Date(c.slaDue).getTime() : (new Date(c.createdAt).getTime() + hours*3600000);
      const now = Date.now();
      const isResolved = c.status === 'resolved';
      const breached = !isResolved && now > due;
      const remainingMs = due - now;
      const atRisk = !isResolved && !breached && remainingMs < 0.3 * (hours*3600000);
      let remainingText = '';
      if (isResolved) remainingText = 'resuelto';
      else if (breached) remainingText = `vencido hace ${Math.round((now-due)/3600000)}h`;
      else remainingText = `quedan ${Math.max(0, Math.round(remainingMs/3600000))}h`;
      // Primera respuesta
      const frDue = new Date(c.createdAt).getTime() + (SLA_FIRST_RESPONSE[c.priority]||24)*3600000;
      const frBreached = !c.firstResponseAt && !isResolved && now > frDue;
      return { due, breached: breached || frBreached, atRisk: atRisk || (!c.firstResponseAt && !breached && (now - new Date(c.createdAt).getTime()) > 0.7*(frDue-new Date(c.createdAt).getTime())), remainingText, frBreached };
    },

    _avgMTTR: function (list) {
      const resolved = list.filter(c=>c.status==='resolved' && c.resolvedAt && c.createdAt);
      if (!resolved.length) return null;
      const avgH = resolved.reduce((a,c)=> a + (new Date(c.resolvedAt)-new Date(c.createdAt))/3600000, 0) / resolved.length;
      return avgH < 24 ? avgH.toFixed(1)+'h' : (avgH/24).toFixed(1)+'d';
    },

    _applyFilters: function (list, state) {
      let out = [...list];
      if (filterCategory!=='all') out = out.filter(c=>c.category===filterCategory);
      if (filterStatus!=='all') out = out.filter(c=>c.status===filterStatus);
      if (filterTeacher!=='all') out = out.filter(c=>c.teacherId===filterTeacher);
      if (filterCycle!=='all') out = out.filter(c=>c.cicloAcademico===filterCycle);
      if (filterSla==='incumplido') out = out.filter(c=>c.sla.breached);
      else if (filterSla==='riesgo') out = out.filter(c=>!c.sla.breached && c.sla.atRisk);
      else if (filterSla==='ok') out = out.filter(c=>!c.sla.breached && !c.sla.atRisk);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        out = out.filter(c=> (c.studentName||'').toLowerCase().includes(q) || (c.courseName||'').toLowerCase().includes(q) || (c.title||'').toLowerCase().includes(q));
      }
      return out.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
    },

    onSearch: function (v){ searchQuery=v; this.render(document.getElementById('page-container')); const el=document.querySelector('.input-icon-wrapper .form-input'); if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);} },
    onFilter: function (k,v){
      if(k==='category')filterCategory=v; if(k==='status')filterStatus=v; if(k==='sla')filterSla=v; if(k==='teacher')filterTeacher=v; if(k==='cycle')filterCycle=v;
      this.render(document.getElementById('page-container'));
    },
    resetFilters: function(){ filterCategory='all';filterStatus='all';filterSla='all';filterTeacher='all';filterCycle='all';searchQuery=''; this.render(document.getElementById('page-container')); },

    openCreateModal: function () {
      const state = window.store.getState();
      const students = (state.users||[]).filter(u=>u.role==='student');
      const periods = (state.academicPeriods||[]).map(p=>p.ciclo);
      const content = `
        <form id="acase-form" onsubmit="event.preventDefault(); window.academicCasesPage.handleCreate();">
          <div class="form-group"><label class="form-label required">Estudiante</label>
            <select class="form-select" id="ac-student" required>${students.map(s=>`<option value="${s.id}">${window.security.escapeHtml(s.firstname+' '+s.lastname)} (${window.security.escapeHtml(s.email)})</option>`).join('')}</select></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label required">Curso</label>
              <select class="form-select" id="ac-course" required>${state.courses.map(c=>`<option value="${c.id}">${window.security.escapeHtml(c.fullname)} (${window.security.escapeHtml(c.shortname)})</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label required">Ciclo académico</label>
              <input class="form-input" id="ac-cycle" list="ac-cycles" required value="2026-I" placeholder="2026-I"/>
              <datalist id="ac-cycles">${periods.map(cy=>`<option value="${window.security.escapeHtml(cy)}">`).join('')}</datalist></div>
          </div>
          <div class="form-group"><label class="form-label required">Título del caso</label><input class="form-input" id="ac-title" required placeholder="Ej: Reclamo de nota parcial 2"/></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label required">Categoría</label>
              <select class="form-select" id="ac-category">${Object.entries(CATEGORY_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label required">Prioridad (define SLA)</label>
              <select class="form-select" id="ac-priority"><option value="low">Baja (96h)</option><option value="medium" selected>Media (48h)</option><option value="high">Alta (24h)</option><option value="critical">Crítica (4h)</option></select></div>
          </div>
          <div class="form-group"><label class="form-label required">Descripción</label><textarea class="form-textarea" id="ac-desc" rows="3" required placeholder="Detalle del reclamo/solicitud..."></textarea></div>
          <div style="font-size:0.8125rem;color:var(--muted);padding:0.75rem;background:var(--bg-alt);border:1px solid var(--border);border-radius:8px;">
            El <strong>docente responsable</strong> se asignará automáticamente desde Data Docente según curso+ciclo. El SLA se calculará desde la prioridad.
          </div>
        </form>`;
      const footer = `<button class="btn btn-secondary" onclick="window.modal.close()">Cancelar</button><button class="btn btn-primary" onclick="document.getElementById('acase-form').requestSubmit()">Crear caso</button>`;
      window.modal.open({title:'Nuevo caso académico del estudiante', content, footer});
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },

    _resolveTeacher: function (courseId, cicloAcademico) {
      const state = window.store.getState();
      const list = (state.teachingAssignments||[]).filter(a=>a.courseId===courseId);
      // Preferencia: mismo ciclo, luego impartiendo, luego cualquiera
      const exact = list.find(a=>a.cicloAcademico===cicloAcademico && a.status==='impartiendo');
      if (exact) return exact;
      const sameCycle = list.find(a=>a.cicloAcademico===cicloAcademico);
      if (sameCycle) return sameCycle;
      const anyActive = list.find(a=>a.status==='impartiendo');
      if (anyActive) return anyActive;
      return list[0] || null;
    },

    handleCreate: function () {
      const state = window.store.getState();
      const studentId = document.getElementById('ac-student').value;
      const courseId = document.getElementById('ac-course').value;
      const cicloAcademico = document.getElementById('ac-cycle').value.trim();
      const title = document.getElementById('ac-title').value.trim();
      const category = document.getElementById('ac-category').value;
      const priority = document.getElementById('ac-priority').value;
      const description = document.getElementById('ac-desc').value.trim();
      if (!studentId || !courseId || !cicloAcademico || !title || !description) {
        if (window.toast) window.toast.warning('Completa los campos requeridos');
        return;
      }
      const student = state.users.find(u=>u.id===studentId);
      const course = state.courses.find(c=>c.id===courseId);
      const teacher = this._resolveTeacher(courseId, cicloAcademico);
      const now = new Date().toISOString();
      const slaHours = SLA_HOURS[priority] || 48;
      const slaDue = new Date(Date.now() + slaHours*3600000).toISOString();
      const entry = {
        id:'acase-'+Date.now(),
        studentId, studentName:`${student.firstname} ${student.lastname}`, studentEmail: student.email,
        courseId: course.id, courseName: course.fullname, shortname: course.shortname,
        teacherId: teacher? teacher.teacherId : null, teacherName: teacher? teacher.teacherName : 'Sin docente (triage)',
        platformId: course.platformId, platformName: course.platformName,
        cicloAcademico, category, priority, status:'open', title, description,
        createdAt: now, updatedAt: now, slaHours, slaDue, firstResponseAt: null, resolvedAt: null,
        activity: [{ at: now, who:'Sistema', text:`Caso creado — SLA ${slaHours}h. Docente asignado: ${teacher? teacher.teacherName : 'pendiente de triage'}` }]
      };
      const updatedLogs = [{ id:'log-'+Date.now(), action:'ACADEMIC_CASE_CREATE', user: state.auth?.user?.name||'Administrador', ip:'192.168.1.100', timestamp: now, details:`${entry.title} → ${course.shortname} (${cicloAcademico}) Docente: ${entry.teacherName}` }, ...state.auditLogs];
      window.store.setState({ academicCases: [entry, ...(state.academicCases||[])], auditLogs: updatedLogs });
      if (window.toast) window.toast.success(`Caso creado — Asignado a ${entry.teacherName}`);
      window.modal.close(); this.render(document.getElementById('page-container'));
    },

    openDetail: function (id) {
      const state = window.store.getState();
      const c = (state.academicCases||[]).find(x=>x.id===id);
      if (!c) return;
      const sla = this._slaState(c);
      const enroll = (state.enrollments||[]).find(e=>e.userId===c.studentId && e.courseId===c.courseId);
      const teaching = (state.teachingAssignments||[]).find(a=>a.teacherId===c.teacherId && a.courseId===c.courseId && a.cicloAcademico===c.cicloAcademico);
      const content = `
        <div style="display:flex;flex-direction:column;gap:0.75rem;font-size:0.875rem;">
          <div><strong>${window.security.escapeHtml(c.title)}</strong><div style="color:var(--muted);font-size:0.8125rem;">${window.security.escapeHtml(CATEGORY_LABELS[c.category]||c.category)} · Prioridad ${c.priority} · Estado ${c.status}</div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
            <div style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;background:var(--bg-alt);">
              <div style="font-weight:700;margin-bottom:0.25rem;">Estudiante</div>
              <div>${window.security.escapeHtml(c.studentName)}<br/><span style="color:var(--muted);font-size:0.8125rem;">${window.security.escapeHtml(c.studentEmail)}</span></div>
            </div>
            <div style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;background:var(--bg-alt);">
              <div style="font-weight:700;margin-bottom:0.25rem;">Curso / Ciclo / Recinto</div>
              <div>${window.security.escapeHtml(c.shortname)} — ${window.security.escapeHtml(c.courseName)}<br/><span style="color:var(--muted);font-size:0.8125rem;">${window.security.escapeHtml(c.cicloAcademico)} · ${window.security.escapeHtml(c.platformName)}</span></div>
            </div>
            <div style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;background:var(--bg-alt);">
              <div style="font-weight:700;margin-bottom:0.25rem;">Docente (Data Docente)</div>
              <div>${window.security.escapeHtml(c.teacherName||'Sin docente')}${teaching? `<br/><span style="color:var(--muted);font-size:0.8125rem;">Asignación ${teaching.id} · ${teaching.status} · ${teaching.startDate||''} → ${teaching.endDate||''}</span>` : '<br/><span style="color:var(--danger);font-size:0.8125rem;">Sin asignación en este ciclo</span>'}</div>
            </div>
            <div style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;background:var(--bg-alt);">
              <div style="font-weight:700;margin-bottom:0.25rem;">Matrícula / Progreso</div>
              <div>${enroll? `Progreso ${enroll.progressPercent??0}% · Últ. acceso ${enroll.lastAccessAt? new Date(enroll.lastAccessAt).toLocaleString():'—'}` : 'Sin matrícula encontrada'}</div>
            </div>
          </div>
          <div><strong>Descripción</strong><div style="color:var(--muted);">${window.security.escapeHtml(c.description)}</div></div>
          <div><strong>SLA</strong> · vence ${new Date(c.slaDue||c.createdAt).toLocaleString()} — ${sla.breached? '<span style="color:var(--danger);font-weight:700;">Incumplido</span>' : sla.atRisk? '<span style="color:var(--warning);font-weight:700;">En riesgo</span>' : '<span style="color:var(--success);font-weight:700;">Cumple</span>'} (${sla.remainingText})<br/><span style="font-size:0.8125rem;color:var(--muted);">Primera respuesta: ${c.firstResponseAt? new Date(c.firstResponseAt).toLocaleString() : 'pendiente'}</span></div>
          <div><strong>Bitácora trazable</strong>
            <div style="display:flex;flex-direction:column;gap:0.4rem;margin-top:0.35rem;">
              ${(c.activity||[]).map(a=>`<div style="border-left:3px solid var(--primary);padding:0.4rem 0.6rem;background:var(--bg-alt);border-radius:0 6px 6px 0;font-size:0.8125rem;"><strong>${window.security.escapeHtml(a.who)}</strong> <span style="color:var(--muted);">${new Date(a.at).toLocaleString()}</span><div>${window.security.escapeHtml(a.text)}</div></div>`).join('')}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
          <input class="form-input" id="ac-comment" placeholder="Agregar respuesta / nota interna..." style="flex:1;"/>
          <button class="btn btn-secondary btn-sm" onclick="window.academicCasesPage.addComment('${c.id}')">Agregar</button>
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;">
          <label style="font-size:0.8125rem;">Reasignar docente:
            <select class="form-select" id="ac-reassign" style="width:auto;display:inline-block;margin-left:0.35rem;">
              <option value="">Sin docente</option>
              ${(state.users||[]).filter(u=>['editingteacher','teacher'].includes(u.role)).map(t=>`<option value="${t.id}" ${c.teacherId===t.id?'selected':''}>${window.security.escapeHtml(t.firstname+' '+t.lastname)}</option>`).join('')}
            </select>
          </label>
          <button class="btn btn-ghost btn-sm" onclick="window.academicCasesPage.reassign('${c.id}')">Reasignar</button>
        </div>`;
      const footer = `<button class="btn btn-secondary" onclick="window.modal.close()">Cerrar</button>`;
      window.modal.open({title:'Detalle del caso — trazabilidad completa', content, footer, size:'lg'});
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },

    addComment: function (id) {
      const input = document.getElementById('ac-comment');
      const text = input?.value.trim();
      if (!text) return;
      const state = window.store.getState();
      const now = new Date().toISOString();
      const who = state.auth?.user?.name || 'Soporte Académico';
      const list = (state.academicCases||[]).map(c=>{
        if (c.id!==id) return c;
        const act = [...(c.activity||[]), {at:now, who, text}];
        const firstResponseAt = c.firstResponseAt || now;
        const status = c.status==='open' ? 'in_progress' : c.status;
        return {...c, activity: act, firstResponseAt, status, updatedAt: now};
      });
      window.store.setState({academicCases:list});
      if (window.toast) window.toast.success('Respuesta agregada');
      this.openDetail(id);
      this.render(document.getElementById('page-container'));
    },

    reassign: function (id) {
      const sel = document.getElementById('ac-reassign');
      const newTeacherId = sel?.value || null;
      const state = window.store.getState();
      const teacher = newTeacherId? state.users.find(u=>u.id===newTeacherId) : null;
      const now = new Date().toISOString();
      const who = state.auth?.user?.name || 'Soporte';
      const list = (state.academicCases||[]).map(c=>{
        if (c.id!==id) return c;
        return {...c, teacherId: newTeacherId, teacherName: teacher? `${teacher.firstname} ${teacher.lastname}` : 'Sin docente (triage)', activity: [...(c.activity||[]), {at:now, who, text:`Reasignado a ${teacher? `${teacher.firstname} ${teacher.lastname}`:'sin docente'}`}], updatedAt: now};
      });
      window.store.setState({academicCases:list});
      if (window.toast) window.toast.success('Docente reasignado');
      this.openDetail(id);
    },

    advanceStatus: function (id, nextStatus) {
      const state = window.store.getState();
      const now = new Date().toISOString();
      const who = state.auth?.user?.name || 'Soporte';
      const list = (state.academicCases||[]).map(c=>{
        if (c.id!==id) return c;
        const resolvedAt = nextStatus==='resolved' ? now : c.resolvedAt;
        const firstResponseAt = c.firstResponseAt || now;
        const activity = [...(c.activity||[]), {at:now, who, text:`Estado → ${nextStatus}`}];
        return {...c, status: nextStatus, firstResponseAt, resolvedAt, activity, updatedAt: now};
      });
      window.store.setState({academicCases:list});
      if (window.toast) window.toast.success('Estado actualizado');
      this.render(document.getElementById('page-container'));
    },

    deleteCase: function (id) {
      window.modal.confirm({title:'Eliminar caso', message:'¿Eliminar este caso académico?', confirmText:'Eliminar', type:'danger', onConfirm:()=>{
        const state = window.store.getState();
        window.store.setState({academicCases:(state.academicCases||[]).filter(c=>c.id!==id)});
        if (window.toast) window.toast.info('Caso eliminado');
        this.render(document.getElementById('page-container'));
      }});
    }
  };

  window.academicCasesPage = academicCasesPage;
})();
