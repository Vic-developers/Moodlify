/**
 * MOODLIFY - API BACKEND GOOGLE APPS SCRIPT (database/Code.gs)
 * Sincroniza el store local (localStorage) con Google Sheets.
 * Colecciones soportadas:
 *   platforms, users, courses, enrollments, teachingAssignments,
 *   academicPeriods, cohorts, groups, schedules, scheduledBatches,
 *   backups, academicCases, incidences, automations, audit_logs
 *
 * Despliegue:
 *   1. Crea sheet "Moodlify DB" con pestañas = nombres de colección + encabezados.
 *   2. Extensiones > Apps Script > pega este archivo.
 *   3. Implementar > Nueva implementación > Tipo: Aplicación web
 *      Ejecutar como: Yo | Acceso: Cualquier usuario (Anyone) -> /exec
 *   4. Copia la URL /exec a js/config.js -> API_URL
 *
 * Endpoints (POST, JSON {action, ...}):
 *   - action=health                         -> {ok:true,status}
 *   - action=get_data&collection=X (GET)    -> {ok,data:[...]}
 *   - action=sync_collection (POST collection,items[])
 *   - action=log_audit (POST log)
 * GET: /exec?action=get_data&collection=platforms
 */

const SCHEMA = {
  platforms: ['id','name','url','token','institution','version','status','usersCount','coursesCount','lastSync','responseTimeMs','sslValid'],
  users: ['id','username','firstname','lastname','email','role','status','platformId','platformName'],
  courses: ['id','fullname','shortname','platformId','platformName','categoryId','categoryName','summary','format','status','studentsCount','teachersCount','startDate','gradient'],
  enrollments: ['id','userId','userName','userEmail','courseId','courseName','platformId','platformName','role','method','status','enrolledAt','progressPercent','lastAccessAt','grade'],
  teachingAssignments: ['id','teacherId','teacherName','courseId','courseName','shortname','categoryName','platformId','platformName','cicloAcademico','status','role','startDate','endDate'],
  academicPeriods: ['id','ciclo','year','semester','startDate','endDate','enrollmentStart','enrollmentEnd','status'],
  cohorts: ['id','name','platformId','platformName','cicloAcademico','capacity','description'],
  groups: ['id','cohortId','name','capacity'],
  schedules: ['id','courseId','teacherId','cohortId','groupId','day','hourStart','hourEnd','room'],
  scheduledBatches: ['id','name','courseId','courseName','courseCount','platformId','platformName','role','studentCount','scheduledAt','status','executionLog','createdAt'],
  backups: ['id','courseId','courseName','shortname','platformId','platformName','createdAt','sizeMB','status','type','fileName'],
  academicCases: ['id','studentId','studentName','studentEmail','courseId','courseName','shortname','teacherId','teacherName','platformId','platformName','cicloAcademico','category','priority','status','title','description','slaHours','slaDue','createdAt','updatedAt'],
  incidences: ['id','title','description','platformId','platformName','category','priority','status','assignedTo','createdAt','updatedAt'],
  automations: ['id','name','description','frequency','action','isActive','lastRun','runsCount','status'],
  audit_logs: ['id','action','user','details','ip','timestamp']
};

function doGet(e) { return handle(e, 'GET'); }
function doPost(e) { return handle(e, 'POST'); }

function handle(e, method) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || 'health';
    if (action === 'health') {
      return json({ ok:true, status:'operational', timestamp:new Date().toISOString() });
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return json({ ok:false, error:'Sin Spreadsheet activo' }, 500);

    if (action === 'get_data') {
      const sheet = ss.getSheetByName(params.collection);
      if (!sheet) return json({ ok:false, error:'Colección no encontrada: '+params.collection }, 404);
      const data = sheetToObjects(sheet);
      // Deserializar JSONB embebido si existe
      data.forEach(row => {
        Object.keys(row).forEach(k => {
          if (typeof row[k] === 'string' && (row[k].startsWith('[') || row[k].startsWith('{'))) {
            try { row[k] = JSON.parse(row[k]); } catch (_) {}
          }
        });
      });
      return json({ ok:true, data });
    }

    if (method === 'POST') {
      let body = {};
      if (e.postData && e.postData.contents) {
        try { body = JSON.parse(e.postData.contents); } catch (_) { body = {}; }
      }
      if (action === 'sync_collection') {
        const collection = body.collection;
        const items = body.items || [];
        if (!SCHEMA[collection]) return json({ ok:false, error:'Colección no permitida' }, 400);
        const sheet = ss.getSheetByName(collection) || ss.insertSheet(collection);
        const headers = SCHEMA[collection];
        ensureHeaders(sheet, headers);
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) sheet.getRange(2, 1, lastRow-1, headers.length).clearContent();
        if (items.length) {
          const rows = items.map(item => headers.map(h => {
            let v = item[h] !== undefined ? item[h] : '';
            return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
          }));
          sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
        }
        return json({ ok:true, syncedCount: items.length });
      }
      if (action === 'log_audit') {
        const sheet = ss.getSheetByName('audit_logs');
        if (sheet) {
          const log = body.log || {};
          ensureHeaders(sheet, SCHEMA.audit_logs);
          sheet.appendRow([
            log.id || Utilities.getUuid(),
            log.action || 'unknown',
            log.user || 'sistema',
            log.details || '',
            log.ip || '127.0.0.1',
            new Date().toISOString()
          ]);
        }
        return json({ ok:true });
      }
    }
    return json({ ok:false, error:'Acción no soportada: '+action }, 400);
  } catch (err) {
    return json({ ok:false, error: err.message }, 500);
  } finally {
    lock.releaseLock();
  }
}

function ensureHeaders(sheet, headers) {
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const ok = headers.every((h,i)=> current[i] === h);
  if (!ok) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  const out = [];
  for (let i=1; i<values.length; i++) {
    const row = values[i];
    const obj = {};
    headers.forEach((h,j)=> { obj[h] = row[j]; });
    out.push(obj);
  }
  return out;
}

function json(data, statusCode) {
  const out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
