# 🎓 Moodlify — Plataforma SaaS de Administración Centralizada de Moodle

> **Versión:** 2.0.7 (`service-worker.js`)  
> **Repositorio:** https://github.com/Vic-developers/Moodlify.git  
> **Estado:** Listo para Producción / Demostración Interactiva  
> **Stack:** HTML5 Semántico, CSS3 Puro (Variables y Microanimaciones), JavaScript ES6+ Vanilla (Zero Frameworks), Lucide Icons, Chart.js, Progressive Web App (PWA).

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Vic-developers/Moodlify.git)

---

## 📑 Tabla de contenido

1. [Descripción del proyecto](#-descripción-del-proyecto)
2. [Stack tecnológico](#️-stack-tecnológico)
3. [Estructura del repositorio](#-estructura-del-repositorio-51-archivos)
4. [Módulos del sistema (17 páginas SPA)](#-módulos-del-sistema-17-páginas-spa)
5. [Modos de operación](#-modos-de-operación)
6. [Instalación y desarrollo local](#-instalación-y-desarrollo-local)
7. [Subida a GitHub paso a paso](#-subida-a-github-paso-a-paso)
8. [Despliegue en Vercel paso a paso](#-despliegue-en-vercel-paso-a-paso)
9. [Backend con Google Apps Script + Sheets](#-backend-con-google-apps-script--google-sheets)
10. [Formatos CSV (multi-curso)](#-formatos-csv-multi-curso)
11. [Checklist de verificación](#-checklist-de-verificación-funcional)
12. [Roadmap](#-roadmap-de-evolución)
13. [Troubleshooting](#-troubleshooting)
14. [Licencia](#-licencia)

---

## 📌 Descripción del Proyecto

**Moodlify** es una plataforma SaaS moderna, de alto rendimiento y grado empresarial, concebida para administradores de TI, directores de tecnología educativa y coordinadores de campus que gestionan múltiples instancias independientes de Moodle LMS.

### El Problema que Resuelve
Las universidades operan decenas de instancias de Moodle (grado, posgrado, educación continua, sedes internacionales). La gestión descentralizada obliga a autenticarse repetidamente, dispersa métricas y dificulta detectar caídas o fallas de matriculación.

### La Solución Moodlify
Moodlify centraliza supervisión, usuarios, cursos, **matrículas multi-curso desde CSV**, **lotes programados en horarios específicos**, **data docente por ciclo y recinto**, actividad/progreso, importador universal, integraciones/webhooks, backups, mesa académica del estudiante, incidencias TI y reportes filtrables — en un único panel con diseño inspirado en Notion, Linear y Vercel.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| **Frontend** | HTML5 semántico, CSS3 moderno, JS ES6+ puro | Sin build; carga instantánea. |
| **Estilos & UI** | CSS Variables, Flexbox, CSS Grid | Temas claro, oscuro y alto contraste (WCAG AAA). |
| **Iconografía** | Lucide Icons (`unpkg.com`) | Iconos vectoriales consistentes. |
| **Gráficos** | Chart.js (`cdn.jsdelivr.net`) | Reactivos, adaptados a tema claro/oscuro. |
| **Tipografía** | Inter (Google Fonts) | Legibilidad en tableros y analítica. |
| **Estado** | Store reactivo (Zustand/Redux-like) | `getState`, `setState`, `subscribe`, persistencia. |
| **PWA & Offline** | Service Worker + Manifest | Cache-First / Network-First + offline. |
| **Backend** | Google Apps Script + Sheets / Node.js / Supabase | Flexible y sin costo inicial. |
| **Deploy** | Vercel (GitHub) | CSP estricto, rewrites, brotli, HTTPS. |

---

## 📁 Estructura del Repositorio (51 Archivos)

```text
moodlify/
├── index.html                    # SPA principal (Sidebar + Topbar + #page-container)
├── login.html                    # Acceso con Google OAuth y credenciales
├── 404.html / offline.html       # Fallbacks PWA y error
├── manifest.json                 # PWA instalable
├── service-worker.js             # CACHE_NAME moodlify-v2.0.7 (sube versión en cada release)
├── vercel.json                   # CSP, rewrites /login /offline, caché
├── package.json                  # serve -s . -l 3000
├── .env.example / .gitignore
├── README.md                     # Este documento
├── css/ main.css components.css themes.css animations.css
├── js/
│   ├── config.js store.js api.js auth.js error-handler.js security.js
│   ├── themes.js router.js analytics.js moodle-service.js notifications.js webhooks.js app.js
│   ├── components/ toast.js modal.js skeleton.js command-palette.js widgets.js
│   └── pages/
│       ├── dashboard.js platforms.js users.js courses.js teaching.js
│       ├── periods.js cohorts.js enrollments.js activity.js importer.js
│       ├── automations.js reports.js integrations.js backups.js
│       ├── academic-cases.js incidences.js settings.js
```

> `node_modules/` está en `.gitignore` — nunca se sube. `package-lock.json` sí se versiona.

---

## 🧭 Módulos del Sistema (17 páginas SPA)

| Ruta | Módulo | Qué hace |
|---|---|---|
| `#dashboard` | Dashboard | 4 KPIs, 2 Chart.js, tabla de instancias, feed en vivo |
| `#platforms` | Plataformas | Grid de campus Moodle, ping/versión, CRUD |
| `#users` | Usuarios | Directorio, suspender/reset, CSV, filtros por rol/plataforma |
| `#courses` | Cursos | Catálogo con gradientes, CRUD y matriculación rápida |
| `#teaching` | **Data Docente** | Base de datos docente: qué cursos imparte/impartió cada docente por **ciclo + recinto**. CRUD con validación de duplicado |
| `#periods` | **Periodos** | Tabla maestra de ciclos (`2026-I`): fechas académicas + ventana de matrícula, solo un activo |
| `#cohorts` | **Cohortes, Grupos y Horarios** | Agrupación por ciclo/recinto + timetable (día, hora, aula) |
| `#enrollments` | Matrículas | Historial + **Matrícula Rápida CSV multi-curso** + **Programar Lote en horario específico** (ejecución automática cada 15s) |
| `#activity` | **Actividad y Progreso** | Progreso %, última actividad, nota y riesgo Alto/Medio/Bajo por matrícula |
| `#importer` | **Importador Universal CSV** | Wizard: elige entidad (Matrículas/Docencia/Usuarios/Cursos), mapea columnas, valida fila por fila e importa |
| `#automations` | Automatizaciones | Crons, tareas desasistidas, “Ejecutar Ahora”, pausa |
| `#reports` | **Reportes** | Resumen ejecutivo, Matrículas, Auditoría, **Generador a Medida**: totales por curso, por categoría, por rol, por plataforma, por docente, por ciclo, progreso/riesgo, casos SLA. Filtros: categoría, rol, docente, ciclo, campus, rango. CSV con TOTAL + PDF |
| `#integrations` | **Integraciones** | Tokens WS Moodle (enmascarado, probar, rotar), webhooks HMAC-SHA256, salud 10 req/s |
| `#backups` | **Backups** | `.mbz` manual/automático, restaurar, descargar, eliminar |
| `#academic-cases` | **Mesa Académica** | Casos del estudiante: duda, reclamo notas, reincorporación, matrícula, certificado, deserción. **SLA** (4/24/48/96h) + trazabilidad al docente de Data Docente + bitácora |
| `#incidences` | Incidencias TI | Mesa técnica con prioridades y workflow open→in_progress→resolved |
| `#settings` | Configuración | 5 pestañas + zona de peligro |

**Globales:** Command Palette `Ctrl+K`, Toasts, Modales accesibles, Skeletons, Notificaciones in-app, Temas Claro/Oscuro/Alto contraste.

### Funcionalidades clave implementadas

- **Matrícula masiva multi-curso:** el curso sale de cada fila del CSV (`curso_nombre`). Un solo CSV puede matricular a N cursos/plataformas. Vista previa: *N matrículas válidas → M cursos*.
- **Lotes programados:** `datetime-local` + atajos (`+30min`, `+2h`, `23:00`, `02:00`, `08:00`), modal CSV multi-curso o directorio, watcher `setInterval 15s` en `app.js`, Ejecutar Ahora/Cancelar.
- **Data Docente → Reportes:** *Docencia por Docente / por Ciclo / por Recinto / Detalle* — filtrables por docente, ciclo, categoría, campus.
- **Reportes por ítems:** elige categoría, rol, docente, ciclo; agrupa por curso/categoría/rol/plataforma/método; totales por curso, total cursos por categoría, matrículas por rol, resumen general, progreso y SLA.

---

## ⚡ Modos de Operación

1. **Demo / Mock (por defecto, sin build):** `CONFIG.API_URL = ''` en `js/config.js` → `IS_MOCK=true`. Siembra en `localStorage` 3 plataformas, 8 usuarios, 7 cursos, 25 matrículas, 5 incidencias, 4 automatizaciones, 10 asignaciones docentes, 4 periodos, 3 cohortes, backups y 5 casos académicos. Todo CRUD funciona offline.
2. **Producción:** define `API_URL` a tu Google Apps Script o REST y `js/api.js` usa `fetch` con Bearer + retry/backoff + caché TTL 60s.

Credenciales demo: `admin@moodlify.com` / `admin123` (o cualquier email con clave ≥6 en modo mock).

---

## 💻 Instalación y Desarrollo Local

Requisitos: **Node ≥18**, navegador moderno.

```bash
# 1. Clonar (después de subir a GitHub)
git clone https://github.com/Vic-developers/Moodlify.git
cd Moodlify

# 2. Instalar dependencias (solo `serve`)
npm install

# 3. Levantar en http://localhost:3000
npm start        # serve -s . -l 3000
# alternativo:
npm run dev      # serve -l 3000

# 4. Verificar rutas clave
# http://localhost:3000/index.html#reports
# http://localhost:3000/index.html#enrollments  -> pestaña "Lotes Programados"
# http://localhost:3000/index.html#teaching
# http://localhost:3000/index.html#academic-cases
```

> No hay `npm run build` real: es Vanilla sin build. `npm run build` solo ecoa “Ready for deployment”.

---

## ☁️ Subida a GitHub paso a paso

Repositorio destino: **https://github.com/Vic-developers/Moodlify.git**

### Paso 0 — Crea el repo (si no existe)
1. Ve a github.com → **New repository** → Name: `Moodlify`
2. **Private** (recomendado) → **Add README** desmarcado (ya tienes uno) → **Create repository**
3. Copia la URL: `https://github.com/Vic-developers/Moodlify.git`

### Paso 1 — Inicializa git local (primera vez)
```bash
cd "C:\Users\victor.lorenzo\Documents\2026\Proyectos Implementados\Moodlify"
git init
git branch -M main
git config user.name "Tu Nombre"
git config user.email "tu@email.com"
```

### Paso 2 — Agrega archivos y commit
```bash
git add .
git status           # verifica: no debe aparecer node_modules/
git commit -m "feat: Moodlify v2.0.7 — Data Docente, Periodos, Cohortes, Actividad, Importador, Integraciones, Backups y Mesa Academica"
```

### Paso 3 — Conecta el remoto y sube
```bash
git remote add origin https://github.com/Vic-developers/Moodlify.git
git push -u origin main
```
*Si ya agregaste el remoto:* `git remote -v` para verificar. Si el repo tenía commits iniciales, usa `git push --force` solo la primera vez si estás seguro (esto reemplaza el historial).

### Paso 4 — Verificación en GitHub
1. Entra a https://github.com/Vic-developers/Moodlify
2. Confirma: rama `main`, archivos visibles, `README.md` renderizado.
3. Settings → **General → Default branch: main** (si no lo es).
4. Settings → **Pages** (opcional, alternativo a Vercel): Source `main / (root)`.

### Subidas siguientes (ediciones)
```bash
git add .
git commit -m "fix: descripcion breve"
git push origin main
```

> **Regla de oro:** sube `service-worker.js` con `CACHE_NAME` incrementado (`moodlify-v2.0.8`, `v2.0.9`…) en cada release si cambiaste CSS/JS, si no Vercel/navegador seguirá sirviendo caché vieja.

---

## 🚀 Despliegue en Vercel paso a paso

### Opción A (recomendada): Import desde GitHub
1. Entra a https://vercel.com → **Add New → Project**
2. **Import Git Repository** → elige `Vic-developers/Moodlify`
3. **Framework Preset:** `Other` · **Root Directory:** `./` · **Build Command:** vacío · **Output Directory:** `.`
4. **Environment Variables** (opcional):
   * `MOODLIFY_API_URL` = tu URL Apps Script (`https://script.google.com/macros/s/.../exec`)
   * `MOODLIFY_ENV` = `production`
5. **Deploy** → URL pública `https://moodlify-xxx.vercel.app` + CDN global + HTTPS en <20s.
6. Cada `git push origin main` crea un **Preview Deployment**; `main` es **Production**.

### Opción B: Vercel CLI
```bash
npm i -g vercel
vercel          # pregunta: Set up? Y / Link existing? N / Name: moodlify / Directory: ./
vercel --prod   # a producción
```

### Opción C: Drag & Drop
https://vercel.com/new → arrastra la carpeta `Moodlify` → Deploy inmediato.

### Post-deploy
* **Dominio propio:** Vercel → Project → Settings → Domains → agregas `moodlify.tudominio.edu` y configuras CNAME.
* **Verificación:** abre `#reports`, `#teaching`, `#academic-cases` en incursión; prueba `Ctrl+Shift+R` tras cambios.
* **Rollback:** Vercel → Deployments → … → Promote to Production.

---

## 🗄️ Backend con Google Apps Script + Google Sheets

### 1. Crea el Sheet “Moodlify DB” (https://sheets.new)
Pestañas con encabezados (primera fila):
* `users`: `id, username, firstname, lastname, email, role, status, platformId`
* `platforms`: `id, name, url, version, status, usersCount, coursesCount, lastSync`
* `courses`: `id, fullname, shortname, platformId, categoryName, studentsCount, status`
* `enrollments`: `id, userId, courseId, platformId, method, status, enrolledAt, progressPercent`
* `teachingAssignments`: `id, teacherId, courseId, cicloAcademico, platformId, status, role`
* `academicPeriods`: `id, ciclo, year, semester, startDate, endDate, enrollmentStart, enrollmentEnd, status`
* `cohorts / groups / schedules`: `id, name/cohortId/groupId, day, hourStart, hourEnd, room`
* `scheduledBatches`: `id, name, courseId, platformId, scheduledAt, status, targetStudentIds`
* `backups`: `id, courseId, sizeMB, status, type, fileName, createdAt`
* `academicCases`: `id, studentId, courseId, teacherId, cicloAcademico, category, priority, status, slaHours, title, description`
* `incidences`, `automations`, `audit_logs` (como versiones anteriores)

### 2. Apps Script
Extensiones → Apps Script → reemplaza `Código.gs` con un `doGet/doPost` que implemente `get_data`, `sync_collection`, `log_audit`, `health` (patrón incluido en la versión anterior del README). Usa `LockService` y `ContentService` JSON con CORS.

### 3. Despliega
Implementar → Nueva implementación → **Web App** → Ejecutar como **Yo** → Acceso **Anyone** → Implementar → copia la URL `/exec`.

### 4. Conecta
En `js/config.js`:
```js
API_URL: 'https://script.google.com/macros/s/AKfyc.../exec'
```
Recarga. Si la llamada falla, `js/api.js` cae a mock automáticamente.

---

## 📥 Formatos CSV (multi-curso)

Detecta `,` o `;`, comillas, BOM UTF-8, encabezados en español/inglés.

**Matrículas (Importador + Matrícula Rápida + Lote CSV):**
```csv
username,email,curso_nombre,rol
s.navarro,s.navarro@estudiantes.edu,Arquitectura de Software y Sistemas Distribuidos,student
d.morales,d.morales@estudiantes.edu,Machine Learning y Ciencia de Datos Aplicada,student
```
`curso_nombre` acepta nombre completo (`fullname`), código corto (`INF-401`) o `id` (`crs-1`). Estudiante por `username` (fallback email).

**Docencia:**
```csv
username,curso_nombre,ciclo,estado
m.valenzuela,Arquitectura de Software y Sistemas Distribuidos,2026-I,impartiendo
```

**Usuarios:**
```csv
username,email
nuevo.alumno,nuevo.alumno@universidad.edu
```

**Cursos:**
```csv
fullname,shortname
Nuevo Curso de Ejemplo,NUE-100
```
En cada modal hay **Descargar plantilla** (.csv con BOM para Excel).

---

## ✅ Checklist de Verificación Funcional

- [x] **Estructura (51 archivos):** rutas enlazadas, 17 páginas SPA, sin errores de sintaxis (`parse-ok` en todos).
- [x] **Visual:** temas Claro/Oscuro/Alto contraste persistentes, Lucide + Inter, animaciones `cubic-bezier` + `prefers-reduced-motion`, responsive.
- [x] **Auth/Seguridad:** login mock, JWT/refresh, guards de ruta, anti-XSS, HMAC, leaky bucket 10 req/s.
- [x] **Estado/Red:** store + persistencia 250ms, retry 3x/backoff, TTL 60s, fallback a mock.
- [x] **Globales:** `Ctrl+K`, toasts máx 5, modales, skeletons, notificaciones.
- [x] **17 páginas:** Dashboard, Plataformas, Usuarios, Cursos, Data Docente, Periodos, Cohortes, Matrículas, Actividad, Importador, Automatizaciones, Reportes, Integraciones, Backups, Mesa Académica, Incidencias TI, Configuración.
- [x] **Reportes:** 7 tipos filtrables por ítems (categoría, rol, docente, ciclo, campus, rango) con totales, gráfico, CSV con TOTAL y PDF.
- [x] **PWA:** manifest, service worker `v2.0.7`, offline/404, push.

---

## 🗺️ Roadmap

```text
Fase 1-2 Completada: MVP, CRUD, temas, Command Palette, CSV, Reportes, Matricula multi-curso, Data Docente, Periodos, Cohortes, Actividad, Importador, Integraciones, Backups, Mesa Academica
Fase 3 (Próxima): Tests Vitest + Playwright, GitHub Actions CI, Supabase PostgreSQL + RLS, Slack/Teams webhooks, Sentry DSN
Fase 4 (Enterprise): Multi-tenant RBAC granular, SSO SAML/AzureAD, IA predictiva de abandono, asistente conversacional ("¿Qué docente dictó INF-401?")
```

---

## 🛠️ Troubleshooting

* **“No veo cambios”:** Service Worker cacheada. Sube `CACHE_NAME` en `service-worker.js` + `Ctrl+Shift+R` o DevTools → Application → Clear site data / Unregister.
* **`#reports` no carga:** verifica que `reports.js` cargue después de `widgets.js` y que `Chart.js` CDN esté disponible. Revisa consola (F12).
* **CSV no reconoce curso:** usa nombre exacto, `shortname` (ej. `INF-401`) o `id` (`crs-1`); revisa tildes/espacios (la búsqueda es insensible).
* **Lotes no ejecutan:** el watcher es cada 15s y requiere pestaña abierta. Usa *Ejecutar Ahora* para forzar.
* **Push rechazado:** `git remote -v`, `git pull --rebase origin main` antes de `push`.

---

## 📄 Licencia

MIT. Libre para modificar y desplegar en tu institución.
