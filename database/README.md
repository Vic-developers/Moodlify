# Base de datos Moodlify

La “base de datos” en demo vive en **`js/store.js`** (`INITIAL_*`) + **`localStorage`** (`moodlify_state_v2`) en el navegador. Al subir a GitHub solo se sube ese **código semilla** — no hay un `.db` binario.

## Colecciones (15)

| Colección store | Tabla Sheets | Tabla Postgres |
|---|---|---|
| `platforms` | `platforms` | `public.platforms` |
| `users` | `users` | `public.users` |
| `courses` | `courses` | `public.courses` |
| `enrollments` (+progreso) | `enrollments` | `public.enrollments` |
| `teachingAssignments` | `teachingAssignments` | `public.teaching_assignments` |
| `academicPeriods` | `academicPeriods` | `public.academic_periods` |
| `cohorts` / `groups` / `schedules` | mismas | `public.cohorts/groups/schedules` |
| `scheduledBatches` | `scheduledBatches` | `public.scheduled_batches` (JSONB `enrollment_items`) |
| `backups` | `backups` | `public.backups` |
| `academicCases` | `academicCases` | `public.academic_cases` (JSONB `activity`) |
| `incidences` `automations` `auditLogs` | mismas | `public.incidences/automations/audit_logs` |

## Opción A — Google Sheets (recomendado inicial, gratis)

1. Crea el libro **“Moodlify DB”** en https://sheets.new
2. Crea cada pestaña con los encabezados de `database/schema.sql` (o deja que Apps Script los cree con `ensureHeaders`).
3. Extensiones → Apps Script → pega `database/Code.gs` → Implementar → **Web App / Yo / Anyone** → copia `/exec`.
4. En `js/config.js`:
   ```js
   API_URL: 'https://script.google.com/macros/s/TU_ID/exec'
   ```
5. (Opcional) Exporta tu estado actual: en la consola del navegador pega `scripts/export-mock.js` → sube el JSON con `sync_collection` por colección.

Ver README §9 para el paso a paso completo.

## Opción B — Supabase / Postgres

1. En Supabase → **SQL Editor** → pega `database/schema.sql` → Run.
2. Ajusta RLS en el §12 del schema (deja políticas base o desactiva RLS solo en dev).
3. Exporta el mock con `scripts/export-mock.js` y carga con el uploader de Supabase (Data load) o con `psql`.
4. En la app, apunta `js/config.js → API_URL` al endpoint REST que exponga `get_data`/`sync_collection` (o usa el adaptador Supabase en `js/api.js`).

## Archivos de esta carpeta

* `schema.sql` — DDL completo (tablas, índices, vistas `v_enrollments_by_category`, `v_teaching_by_teacher`, `v_academic_cases_sla`)
* `Code.gs` — API Apps Script lista para desplegar (soporta las 15 colecciones)
* `../scripts/export-mock.js` — exportador del `localStorage` a JSON desde el navegador

## Verificación rápida

```bash
# En tu máquina, con el proyecto local:
git add database scripts
git commit -m "db: schema Postgres + Apps Script + exportador"
git push origin main
```

Luego en Sheets/Supabase: `select count(*) from public.teaching_assignments;` debe devolver 10 (seed).
