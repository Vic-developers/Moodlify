-- ==============================================================================
-- MOODLIFY - SCHEMA POSTGRESQL / SUPABASE (v2.0.7)
-- Convierte los INITIAL_* de js/store.js a tablas relacionales.
-- IDs en texto para compatibilidad (plat-1, usr-1, crs-1, ...).
-- Ejecutar en Supabase: SQL Editor -> New query -> pega y Run.
-- ==============================================================================

-- Extensiones utiles
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- 1. PLATAFORMAS (recintos Moodle)
-- ---------------------------------------------------------------------------
create table if not exists public.platforms (
  id text primary key,
  name text not null,
  url text,
  token text,
  institution text,
  version text,
  status text not null default 'active', -- active | maintenance | error | inactive
  users_count int default 0,
  courses_count int default 0,
  last_sync timestamptz,
  response_time_ms int default 150,
  ssl_valid boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_platforms_status on public.platforms(status);

-- ---------------------------------------------------------------------------
-- 2. USUARIOS (directorio)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id text primary key,
  username text unique not null,
  firstname text,
  lastname text,
  email text unique not null,
  role text not null default 'student', -- admin | editingteacher | teacher | student
  status text not null default 'active', -- active | suspended
  platform_id text references public.platforms(id) on delete set null,
  platform_name text,
  enrolled_courses_count int default 0,
  last_access timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_platform on public.users(platform_id);
create index if not exists idx_users_email_trgm on public.users using gin (email gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 3. CURSOS
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id text primary key,
  fullname text not null,
  shortname text unique not null,
  platform_id text references public.platforms(id) on delete cascade,
  platform_name text,
  category_id text,
  category_name text default 'General',
  summary text default '',
  format text default 'topics',
  status text not null default 'active', -- active | draft | archived
  students_count int default 0,
  teachers_count int default 1,
  start_date date,
  gradient text,
  created_at timestamptz default now()
);
create index if not exists idx_courses_platform on public.courses(platform_id);
create index if not exists idx_courses_category on public.courses(category_name);
create index if not exists idx_courses_shortname_trgm on public.courses using gin (shortname gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 4. PERIODOS ACADEMICOS (corto A)
-- ---------------------------------------------------------------------------
create table if not exists public.academic_periods (
  id text primary key,
  ciclo text unique not null, -- ej: '2026-I'
  year int not null,
  semester text not null default 'I', -- I | II
  start_date date,
  end_date date,
  enrollment_start date,
  enrollment_end date,
  status text not null default 'programado', -- activo | programado | cerrado
  created_at timestamptz default now()
);
create index if not exists idx_periods_status on public.academic_periods(status);
create unique index if not exists uq_periods_one_active on public.academic_periods(status) where status = 'activo';

-- ---------------------------------------------------------------------------
-- 5. DATA DOCENTE (teaching assignments)
-- ---------------------------------------------------------------------------
create table if not exists public.teaching_assignments (
  id text primary key,
  teacher_id text references public.users(id) on delete cascade,
  teacher_name text,
  course_id text references public.courses(id) on delete cascade,
  course_name text,
  shortname text,
  category_name text,
  platform_id text references public.platforms(id) on delete set null,
  platform_name text,
  ciclo_academico text not null default '2026-I',
  status text not null default 'impartiendo', -- impartiendo | completado | programado
  role text not null default 'editingteacher',
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  unique (teacher_id, course_id, ciclo_academico)
);
create index if not exists idx_teaching_teacher on public.teaching_assignments(teacher_id);
create index if not exists idx_teaching_cycle on public.teaching_assignments(ciclo_academico);
create index if not exists idx_teaching_platform on public.teaching_assignments(platform_id);

-- ---------------------------------------------------------------------------
-- 6. COHORTES, GRUPOS, HORARIOS (mediano B)
-- ---------------------------------------------------------------------------
create table if not exists public.cohorts (
  id text primary key,
  name text not null,
  platform_id text references public.platforms(id) on delete set null,
  platform_name text,
  ciclo_academico text not null,
  capacity int default 30,
  description text default '',
  created_at timestamptz default now()
);
create table if not exists public.groups (
  id text primary key,
  cohort_id text references public.cohorts(id) on delete cascade,
  name text not null,
  capacity int default 20,
  created_at timestamptz default now()
);
create table if not exists public.schedules (
  id text primary key,
  course_id text references public.courses(id) on delete cascade,
  teacher_id text references public.users(id) on delete set null,
  cohort_id text references public.cohorts(id) on delete set null,
  group_id text references public.groups(id) on delete set null,
  day text not null, -- Lunes..Domingo
  hour_start time not null,
  hour_end time not null,
  room text,
  created_at timestamptz default now()
);
create index if not exists idx_schedules_course on public.schedules(course_id);
create index if not exists idx_schedules_day on public.schedules(day);

-- ---------------------------------------------------------------------------
-- 7. MATRICULAS + ACTIVIDAD (progreso)
-- ---------------------------------------------------------------------------
create table if not exists public.enrollments (
  id text primary key,
  user_id text references public.users(id) on delete cascade,
  user_name text,
  user_email text,
  course_id text references public.courses(id) on delete cascade,
  course_name text,
  platform_id text references public.platforms(id) on delete set null,
  platform_name text,
  role text not null default 'student',
  method text not null default 'manual', -- manual | csv | api | self | batch
  status text not null default 'active', -- active | failed
  enrolled_at timestamptz default now(),
  progress_percent int default 0 check (progress_percent between 0 and 100),
  last_access_at timestamptz,
  grade numeric(3,1),
  created_at timestamptz default now()
);
create index if not exists idx_enrollments_course on public.enrollments(course_id);
create index if not exists idx_enrollments_user on public.enrollments(user_id);
create index if not exists idx_enrollments_platform on public.enrollments(platform_id);
create index if not exists idx_enrollments_enrolled_at on public.enrollments(enrolled_at);

-- Lotes programados (multi-curso en JSONB)
create table if not exists public.scheduled_batches (
  id text primary key,
  name text not null,
  course_id text references public.courses(id) on delete set null,
  course_name text,
  course_count int default 1,
  platform_id text references public.platforms(id) on delete set null,
  platform_name text,
  role text default 'student',
  student_count int default 0,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled', -- scheduled | completed | cancelled
  target_student_ids jsonb default '[]'::jsonb,
  enrollment_items jsonb default '[]'::jsonb, -- [{userId,courseId,role,...}]
  source text default 'direct', -- direct | csv-multi-course
  notify_students boolean default true,
  retry_on_failure boolean default true,
  execution_log text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists idx_batches_status on public.scheduled_batches(status);
create index if not exists idx_batches_scheduled_at on public.scheduled_batches(scheduled_at);

-- ---------------------------------------------------------------------------
-- 8. BACKUPS (.mbz)
-- ---------------------------------------------------------------------------
create table if not exists public.backups (
  id text primary key,
  course_id text references public.courses(id) on delete set null,
  course_name text,
  shortname text,
  platform_id text,
  platform_name text,
  created_at timestamptz default now(),
  size_mb int default 0,
  status text not null default 'success', -- success | failed | running
  type text not null default 'manual', -- manual | automatico
  file_name text not null
);
create index if not exists idx_backups_course on public.backups(course_id);

-- ---------------------------------------------------------------------------
-- 9. MESA ACADEMICA (#7): casos del estudiante con SLA
-- ---------------------------------------------------------------------------
create table if not exists public.academic_cases (
  id text primary key,
  student_id text references public.users(id) on delete set null,
  student_name text not null,
  student_email text,
  course_id text references public.courses(id) on delete set null,
  course_name text,
  shortname text,
  teacher_id text references public.users(id) on delete set null,
  teacher_name text,
  platform_id text references public.platforms(id) on delete set null,
  platform_name text,
  ciclo_academico text not null,
  category text not null default 'general', -- duda_academica | reclamo_notas | reincorporacion | reclamo_matricula | certificado | desercion | general
  priority text not null default 'medium', -- low | medium | high | critical
  status text not null default 'open', -- open | in_progress | waiting_student | resolved
  title text not null,
  description text not null,
  sla_hours int not null default 48,
  sla_due timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  activity jsonb default '[]'::jsonb, -- [{at,who,text}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_acases_status on public.academic_cases(status);
create index if not exists idx_acases_teacher on public.academic_cases(teacher_id);
create index if not exists idx_acases_category on public.academic_cases(category);
create index if not exists idx_acases_sla_due on public.academic_cases(sla_due);

-- ---------------------------------------------------------------------------
-- 10. INCIDENCIAS TI, AUTOMATIZACIONES, AUDITORIA
-- ---------------------------------------------------------------------------
create table if not exists public.incidences (
  id text primary key,
  title text not null,
  description text not null,
  platform_id text references public.platforms(id) on delete set null,
  platform_name text,
  category text not null default 'general',
  priority text not null default 'medium',
  status text not null default 'open', -- open | in_progress | resolved
  assigned_to text,
  created_at timestamptz default now(),
  updated_at timestamptz updated_at_default_now()
);
create table if not exists public.automations (
  id text primary key,
  name text not null,
  description text default '',
  frequency text not null default 'daily',
  target_platforms jsonb default '[]'::jsonb,
  action text not null,
  is_active boolean default true,
  last_run timestamptz,
  runs_count int default 0,
  status text default 'success',
  created_at timestamptz default now()
);
create table if not exists public.audit_logs (
  id text primary key,
  action text not null,
  user_name text,
  details text,
  ip text,
  timestamp timestamptz default now()
);
create index if not exists idx_audit_timestamp on public.audit_logs(timestamp);

-- ---------------------------------------------------------------------------
-- 11. WEBHOOKS (espejo de js/webhooks.js localStorage)
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_endpoints (
  id text primary key,
  name text not null,
  url text not null,
  events jsonb default '[]'::jsonb,
  secret text,
  is_active boolean default true,
  created_at timestamptz default now()
);
create table if not exists public.webhook_logs (
  id text primary key,
  endpoint_id text references public.webhook_endpoints(id) on delete cascade,
  endpoint_name text,
  event text,
  status text default 'success',
  http_status int,
  latency_ms int,
  timestamp timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 12. RLS (Supabase) — fase enterprise
-- Por ahora: solo lectura pública de catálogos, escritura autenticada.
-- Activa/Desactiva según tu política. Requiere tabla auth.users de Supabase Auth.
-- ---------------------------------------------------------------------------
alter table public.platforms enable row level security;
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.teaching_assignments enable row level security;
alter table public.academic_periods enable row level security;
alter table public.cohorts enable row level security;
alter table public.academic_cases enable row level security;
-- Políticas base (ajustar cuando conectes Auth):
-- create policy "moodlify_public_read" on public.platforms for select using (true);
-- create policy "moodlify_auth_write" on public.platforms for all using (auth.role() = 'authenticated');
-- Repite por tabla o usa una sola política "service_role bypass" con anon key restringida.

-- ---------------------------------------------------------------------------
-- 13. VISTAS Útiles (reportes rápidos)
-- ---------------------------------------------------------------------------
create or replace view public.v_enrollments_by_category as
select coalesce(c.category_name,'General') as categoria,
       count(*) as matriculas,
       count(distinct e.course_id) as cursos
from public.enrollments e
left join public.courses c on c.id = e.course_id
group by 1;

create or replace view public.v_teaching_by_teacher as
select teacher_name as docente, count(*) as cursos_impartidos,
       count(distinct ciclo_academico) as ciclos,
       count(distinct platform_name) as recintos
from public.teaching_assignments
group by 1;

create or replace view public.v_academic_cases_sla as
select * from public.academic_cases
where status <> 'resolved' and sla_due is not null and sla_due < now();
