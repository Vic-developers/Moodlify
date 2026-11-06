/**
 * ==============================================================================
 * MOODLIFY - IMPORTADOR UNIVERSAL CSV (js/pages/importer.js)
 * Wizard central: elige entidad, mapea columnas, valida fila por fila e importa.
 * Soporta: Matriculas multi-curso, Docencia, Usuarios, Cursos.
 * ==============================================================================
 */
(function () {
  'use strict';

  let entityType = 'enrollments'; // enrollments | teaching | users | courses
  let rawText = '';
  let parsedPreview = null; // {headers, rows, mapping, valid, errors}

  const REQUIRED = {
    enrollments: [ {key:'username', label:'Username', aliases:['username','usuario','user']}, {key:'email', label:'Email', aliases:['email','correo','mail']}, {key:'curso_nombre', label:'Curso nombre/código', aliases:['curso_nombre','curso','course_name','coursename','fullname','curso_codigo','shortname','course_id']} ],
    teaching: [ {key:'username', label:'Username docente', aliases:['username','usuario','docente']}, {key:'curso_nombre', label:'Curso nombre/código', aliases:['curso_nombre','curso','course_name','coursename','fullname','curso_codigo','shortname','course_id']}, {key:'ciclo', label:'Ciclo académico', aliases:['ciclo','cicloacademico','ciclo_academico','periodo']} ],
    users: [ {key:'username', label:'Username', aliases:['username','usuario']}, {key:'email', label:'Email', aliases:['email','correo','mail']} ],
    courses: [ {key:'fullname', label:'Nombre curso', aliases:['fullname','nombre','curso','curso_nombre','name']}, {key:'shortname', label:'Código corto', aliases:['shortname','codigo','codigo_curso','course_code']} ]
  };

  const importerPage = {
    render: async function (container) {
      const state = window.store.getState();
      container.innerHTML = `
        <div class="animate-fade-in">
          <div class="page-header">
            <div>
              <h1 class="page-title">Importador Universal CSV</h1>
              <p class="page-subtitle">Un solo asistente para Usuarios, Cursos, Matrículas multi-curso y Docencia — con validación fila por fila</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-secondary" onclick="window.importerPage.downloadTemplate()"><i data-lucide="download"></i> Descargar plantilla</button>
              <button class="btn btn-primary" onclick="window.importerPage.runImport()" ${parsedPreview && parsedPreview.valid.length ? '' : 'disabled'}><i data-lucide="upload"></i> Importar ${parsedPreview ? parsedPreview.valid.length : 0} fila(s)</button>
            </div>
          </div>

          <div class="card" style="margin-bottom:1.5rem;">
            <div class="card-body">
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label required">1. Tipo de importación</label>
                  <select class="form-select" id="imp-entity" onchange="window.importerPage.setEntity(this.value)">
                    <option value="enrollments" ${entityType==='enrollments'?'selected':''}>Matrículas multi-curso (username,email,curso_nombre)</option>
                    <option value="teaching" ${entityType==='teaching'?'selected':''}>Docencia (username,curso_nombre,ciclo)</option>
                    <option value="users" ${entityType==='users'?'selected':''}>Usuarios (username,email)</option>
                    <option value="courses" ${entityType==='courses'?'selected':''}>Cursos (fullname,shortname)</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label required">2. Archivo CSV</label>
                  <input type="file" class="form-input" id="imp-file" accept=".csv" onchange="window.importerPage.onFile(this)" />
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">3. Separador (auto)</label>
                  <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                    <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.8125rem;"><input type="radio" name="imp-delim" value="auto" checked onchange="window.importerPage.setDelim(this.value)"/> Auto</label>
                    <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.8125rem;"><input type="radio" name="imp-delim" value="," onchange="window.importerPage.setDelim(this.value)"/> Coma</label>
                    <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.8125rem;"><input type="radio" name="imp-delim" value=";" onchange="window.importerPage.setDelim(this.value)"/> Punto y coma</label>
                  </div>
                </div>
              </div>

              <div id="imp-mapping-wrap" style="margin-top:1rem;"></div>
              <div id="imp-preview-wrap" style="margin-top:1rem;"></div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><div><h3 class="card-title">Cómo funciona la validación</h3><div class="card-description">Cada fila se valida contra el directorio antes de importar. Las filas con error no se importan y se listan para corrección.</div></div></div>
            <div class="card-body" style="font-size:0.875rem;line-height:1.6;">
              <div><strong>Matrículas:</strong> autentica por <code>username</code> (o email) y curso por <code>curso_nombre</code>/<code>shortname</code>/<code>id</code> — mismo motor que el modal de Matrículas.</div>
              <div><strong>Docencia:</strong> docente por <code>username</code>, curso por <code>curso_nombre</code>, ciclo por <code>ciclo</code>.</div>
              <div><strong>Usuarios:</strong> crea el usuario si no existe (rol por defecto <code>student</code>), detecta duplicados por username/email.</div>
              <div><strong>Cursos:</strong> crea el curso si el <code>shortname</code> no existe; requiere plataforma en la fila o usa la primera.</div>
            </div>
          </div>
        </div>`;
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
      window._impDelim = 'auto';
    },

    setEntity: function (t) {
      entityType = t;
      parsedPreview = null;
      this.render(document.getElementById('page-container'));
    },
    setDelim: function (d) { window._impDelim = d; if (rawText) this._process(); },

    onFile: function (input) {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        rawText = e.target.result;
        this._process();
      };
      reader.readAsText(file);
    },

    _process: function () {
      const mappingWrap = document.getElementById('imp-mapping-wrap');
      const previewWrap = document.getElementById('imp-preview-wrap');
      if (!rawText) return;
      const parsed = window.enrollmentsPage._parseCsvText(rawText); // reutiliza parser robusto (comillas, BOM, delimitador)
      const headers = parsed.headers || [];
      const required = REQUIRED[entityType] || [];
      // Si el CSV no trae encabezado, el parser ya lo normaliza
      // Construir mapping: para cada campo requerido, detectar columna exacta o alias
      const mapping = {};
      required.forEach(req => {
        const found = headers.find(h => req.aliases.includes(h));
        mapping[req.key] = found || headers[0] || '';
      });
      const resolved = this._validate(parsed.rows, mapping);
      parsedPreview = { headers, rows: parsed.rows, mapping, valid: resolved.valid, errors: resolved.errors, fileName: document.getElementById('imp-file')?.files?.[0]?.name || '' };

      let mapHtml = `<div style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;background:var(--bg-alt);">
        <div style="font-weight:700;margin-bottom:0.5rem;font-size:0.875rem;">Mapeo detectado (${headers.length} columna(s))</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">${required.map(r=>`<span class="badge ${mapping[r.key]?'badge-success':'badge-danger'}">${r.label}: ${window.security.escapeHtml(mapping[r.key]||'NO DETECTADO')}</span>`).join('')}</div>
        <div style="font-size:0.775rem;color:var(--muted);margin-top:0.4rem;">Encabezados: ${headers.map(h=>window.security.escapeHtml(h)).join(', ')}</div></div>`;

      let previewHtml = `<div style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;background:var(--card);">
        <div style="font-weight:700;margin-bottom:0.25rem;">Vista previa — ${resolved.valid.length} válida(s) · ${resolved.errors.length} error(es)</div>
        ${resolved.valid.length? `<div style="font-size:0.8125rem;color:var(--muted);margin-bottom:0.5rem;">Primeras ${(Math.min(5, resolved.valid.length))} fila(s): ${resolved.valid.slice(0,5).map(v=>window.security.escapeHtml(v.summary)).join(' • ')}</div>` : ''}
        ${resolved.errors.length? `<div style="max-height:160px;overflow-y:auto;font-size:0.8125rem;color:var(--danger);background:var(--danger-light,#fef2f2);padding:0.6rem;border-radius:6px;">${resolved.errors.slice(0,10).map(e=>`<div>• ${window.security.escapeHtml(e)}</div>`).join('')}${resolved.errors.length>10? `<div>… y ${resolved.errors.length-10} más</div>`:''}</div>` : ''}
      </div>`;

      if (mappingWrap) mappingWrap.innerHTML = mapHtml;
      if (previewWrap) previewWrap.innerHTML = previewHtml;

      // Habilitar botón importar
      const btn = document.querySelector('.page-actions .btn-primary');
      if (btn) btn.disabled = !(resolved.valid.length);
      if (typeof window.lucide!=='undefined') window.lucide.createIcons();
    },

    _validate: function (rows, mapping) {
      const valid = []; const errors = [];
      const state = window.store.getState();
      const norm = (s)=> String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
      const courseById = new Map((state.courses||[]).map(c=>[c.id,c]));

      rows.forEach((row, idx) => {
        const n = row._rowNumber || (idx+2);
        const get = (key)=> { const col = mapping[key]; return col? (row[col]||'') : ''; };
        if (entityType==='enrollments') {
          const username = get('username'); const email = get('email'); const curso = get('curso_nombre');
          if (!username && !email) { errors.push(`Fila ${n}: falta username/email.`); return; }
          if (!curso) { errors.push(`Fila ${n}: falta curso_nombre.`); return; }
          let user = username? state.users.find(u=> norm(u.username)===norm(username)) : null;
          if (!user && email) user = state.users.find(u=> norm(u.email)===norm(email));
          if (!user) { errors.push(`Fila ${n}: usuario no encontrado (${username||email}).`); return; }
          const ref = norm(curso);
          let course = state.courses.find(c=> norm(c.fullname)===ref || norm(c.shortname)===ref || norm(c.id)===ref);
          if (!course) course = state.courses.find(c=> norm(c.fullname).includes(ref) || ref.includes(norm(c.fullname)));
          if (!course) { errors.push(`Fila ${n}: curso no encontrado («${curso}»).`); return; }
          valid.push({ summary: `${user.username} → ${course.shortname}`, userId:user.id, courseId:course.id, role:'student' });
        } else if (entityType==='teaching') {
          const username = get('username'); const curso = get('curso_nombre'); const ciclo = get('ciclo');
          if (!username) { errors.push(`Fila ${n}: falta username docente.`); return; }
          if (!curso) { errors.push(`Fila ${n}: falta curso_nombre.`); return; }
          if (!ciclo) { errors.push(`Fila ${n}: falta ciclo.`); return; }
          const teacher = state.users.find(u=> norm(u.username)===norm(username) && ['editingteacher','teacher'].includes(u.role));
          if (!teacher) { errors.push(`Fila ${n}: docente no encontrado o sin rol docente (${username}).`); return; }
          const ref = norm(curso);
          let course = state.courses.find(c=> norm(c.fullname)===ref || norm(c.shortname)===ref || norm(c.id)===ref);
          if (!course) course = state.courses.find(c=> norm(c.fullname).includes(ref) || ref.includes(norm(c.fullname)));
          if (!course) { errors.push(`Fila ${n}: curso no encontrado («${curso}»).`); return; }
          valid.push({ summary: `${teacher.username} → ${course.shortname} (${ciclo})`, teacherId:teacher.id, courseId:course.id, ciclo });
        } else if (entityType==='users') {
          const username = get('username'); const email = get('email');
          if (!username) { errors.push(`Fila ${n}: falta username.`); return; }
          if (!email) { errors.push(`Fila ${n}: falta email.`); return; }
          if (state.users.some(u=> norm(u.username)===norm(username))) { errors.push(`Fila ${n}: username duplicado (${username}).`); return; }
          valid.push({ summary: `${username} (${email})`, username, email });
        } else if (entityType==='courses') {
          const fullname = get('fullname'); const shortname = get('shortname');
          if (!fullname) { errors.push(`Fila ${n}: falta nombre curso.`); return; }
          if (!shortname) { errors.push(`Fila ${n}: falta código corto.`); return; }
          if (state.courses.some(c=> norm(c.shortname)===norm(shortname))) { errors.push(`Fila ${n}: código duplicado (${shortname}).`); return; }
          valid.push({ summary: `${shortname} — ${fullname}`, fullname, shortname });
        }
      });
      return { valid, errors };
    },

    runImport: async function () {
      if (!parsedPreview || !parsedPreview.valid.length) return;
      const state = window.store.getState();
      const now = new Date().toISOString();
      let message = '';
      if (entityType==='enrollments') {
        const res = await window.api.request('enrollUsersMultiCourse', { items: parsedPreview.valid.map(v=> ({userId:v.userId, courseId:v.courseId, role:'student'})), role_id:'student', method:'csv' });
        message = res.message || `${parsedPreview.valid.length} matriculados`;
      } else if (entityType==='teaching') {
        const newItems = parsedPreview.valid.map(v=>{
          const teacher = state.users.find(u=>u.id===v.teacherId); const course = state.courses.find(c=>c.id===v.courseId);
          return { id:'teach-'+Date.now()+'-'+Math.random().toString(36).slice(2,6), teacherId:v.teacherId, teacherName:`${teacher.firstname} ${teacher.lastname}`, courseId:v.courseId, courseName:course.fullname, shortname:course.shortname, categoryName:course.categoryName, platformId:course.platformId, platformName:course.platformName, cicloAcademico:v.ciclo, status:'impartiendo', role:'editingteacher', startDate:'', endDate:'' };
        });
        window.store.setState({teachingAssignments:[...newItems, ...(state.teachingAssignments||[])]});
        message = `${newItems.length} asignación(es) de docencia importada(s)`;
      } else if (entityType==='users') {
        const plat = state.platforms[0];
        const newUsers = parsedPreview.valid.map((v,i)=>{
          const parts = v.username.split(/[._-]/);
          return { id:'usr-'+Date.now()+'-'+i, username:v.username, firstname:parts[0]||v.username, lastname:parts.slice(1).join(' ')||'', email:v.email, role:'student', status:'active', platformId:plat?.id, platformName:plat?.name, enrolledCoursesCount:0, lastAccess:now, createdAt:now };
        });
        window.store.setState({users:[...newUsers, ...state.users]});
        message = `${newUsers.length} usuario(s) creado(s)`;
      } else if (entityType==='courses') {
        const plat = state.platforms[0];
        const gradients = ['linear-gradient(135deg, #2563eb, #3b82f6)','linear-gradient(135deg, #10b981, #059669)'];
        const newCourses = parsedPreview.valid.map((v,i)=>({ id:'crs-'+Date.now()+'-'+i, fullname:v.fullname, shortname:v.shortname, platformId:plat?.id, platformName:plat?.name, categoryId:'cat-general', categoryName:'General', summary:'', format:'topics', status:'active', studentsCount:0, teachersCount:1, startDate:new Date().toISOString().slice(0,10), gradient:gradients[i%2] }));
        window.store.setState({courses:[...newCourses, ...state.courses]});
        message = `${newCourses.length} curso(s) creado(s)`;
      }
      if (window.toast) window.toast.success(message);
      parsedPreview = null; rawText='';
      this.render(document.getElementById('page-container'));
    },

    downloadTemplate: function () {
      const templates = {
        enrollments: 'username,email,curso_nombre,rol\r\ns.navarro,s.navarro@estudiantes.edu,Arquitectura de Software y Sistemas Distribuidos,student\r\nd.morales,d.morales@estudiantes.edu,Machine Learning y Ciencia de Datos Aplicada,student',
        teaching: 'username,curso_nombre,ciclo,estado\r\nm.valenzuela,Arquitectura de Software y Sistemas Distribuidos,2026-I,impartiendo',
        users: 'username,email\r\nnew.student,new.student@universidad.edu',
        courses: 'fullname,shortname\r\nNuevo Curso de Ejemplo,NUE-100'
      };
      const csv = templates[entityType] || templates.enrollments;
      const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`plantilla_${entityType}.csv`; document.body.appendChild(a); a.click(); a.remove();
    }
  };
  window.importerPage = importerPage;
})();
