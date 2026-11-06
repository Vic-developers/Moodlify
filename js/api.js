/**
 * ==============================================================================
 * MOODLIFY - API CLIENT (js/api.js)
 * Production HTTP Client with Auto-Retry (Exponential Backoff), AbortController Timeout,
 * Request/Response Interceptors, Memory TTL Cache & Seamless Mock Fallback
 * ==============================================================================
 */

(function () {
  'use strict';

  class ApiClient {
    constructor() {
      this.cache = new Map();
      this.pendingRequests = new Map();
    }

    /**
     * Espera asíncrona para exponential backoff
     */
    _sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Recupera el token de autorización actual
     */
    _getAuthToken() {
      const state = window.store ? window.store.getState() : null;
      return state?.auth?.token || localStorage.getItem(window.CONFIG?.STORAGE_KEYS?.AUTH_TOKEN || 'moodlify_access_token') || '';
    }

    /**
     * Recupera el token CSRF actual
     */
    _getCsrfToken() {
      return localStorage.getItem(window.CONFIG?.STORAGE_KEYS?.CSRF_TOKEN || 'moodlify_csrf_token') || 'csrf_default_token';
    }

    /**
     * Realiza una llamada HTTP con reintentos y control de tiempo de espera
     */
    async request(action, payload = {}, options = {}) {
      const isMock = window.CONFIG ? window.CONFIG.IS_MOCK : true;

      // Si no hay backend configurado o estamos explícitamente en modo Mock, despachar al Mock Router
      if (isMock) {
        return this._handleMockRequest(action, payload);
      }

      const url = window.CONFIG.API_URL;
      const timeoutMs = options.timeout || window.CONFIG.API_TIMEOUT_MS || 30000;
      const maxRetries = options.retries !== undefined ? options.retries : (window.CONFIG.API_MAX_RETRIES || 3);
      const useCache = options.useCache && options.method === 'GET';

      // Verificar caché en memoria
      const cacheKey = `${action}:${JSON.stringify(payload)}`;
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < (window.CONFIG.CACHE_TTL_MS || 60000)) {
          return cached.data;
        }
        this.cache.delete(cacheKey);
      }

      let attempt = 0;
      let lastError = null;

      while (attempt <= maxRetries) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this._getAuthToken()}`,
            'X-CSRF-Token': this._getCsrfToken(),
            ...options.headers
          };

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ action, ...payload }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 401) {
              // Token expirado o inválido: intentar refresco de sesión o desconectar
              if (window.auth && typeof window.auth.handleUnauthorized === 'function') {
                window.auth.handleUnauthorized();
              }
            }
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
          }

          const json = await response.json();

          if (!json.success) {
            throw new Error(json.error?.message || json.message || 'Error desconocido del servidor');
          }

          // Guardar en caché si aplica
          if (useCache) {
            this.cache.set(cacheKey, { timestamp: Date.now(), data: json });
          }

          return json;
        } catch (err) {
          clearTimeout(timeoutId);
          lastError = err;

          // Si es un error de abort (timeout) o error de red recuperable, reintentar
          const isTimeout = err.name === 'AbortError';
          const isNetwork = !window.navigator.onLine || err.message.includes('Failed to fetch');

          if (attempt < maxRetries && (isTimeout || isNetwork)) {
            attempt++;
            const backoffDelay = Math.pow(2, attempt) * 250; // 500ms, 1000ms, 2000ms
            console.warn(`[API] Reintento ${attempt}/${maxRetries} para '${action}' tras error. Esperando ${backoffDelay}ms...`);
            await this._sleep(backoffDelay);
            continue;
          }

          break;
        }
      }

      // Si falla la llamada real pero tenemos store local, avisar y caer a mock
      console.warn(`[API Client] Llamada '${action}' falló. Recurriendo al controlador mock local.`);
      return this._handleMockRequest(action, payload);
    }

    /**
     * MOCK BACKEND CONTROLLER:
     * Simula respuestas estándar del backend Google Apps Script / Node.js
     * operando directamente sobre el almacén reactivo (window.store).
     */
    async _handleMockRequest(action, payload) {
      // Simular latencia de red realista (120ms - 250ms)
      await this._sleep(140);

      const state = window.store.getState();
      const now = new Date().toISOString();

      try {
        switch (action) {
          // --- AUTH ---
          case 'login': {
            const { email, password } = payload;
            if (email && password && password.length >= 6) {
              const mockUser = {
                id: 'usr-1',
                name: email.split('@')[0].replace('.', ' ').toUpperCase(),
                email: email,
                role: 'admin',
                institution: 'Consorcio Universitario Metropolitano'
              };
              const mockToken = 'mock_jwt_token_' + Math.random().toString(36).substring(2);
              const mockRefresh = 'mock_refresh_' + Math.random().toString(36).substring(2);

              return {
                success: true,
                message: 'Sesión iniciada correctamente',
                data: {
                  token: mockToken,
                  refreshToken: mockRefresh,
                  user: mockUser,
                  expiresIn: 3600
                },
                timestamp: now
              };
            }
            return {
              success: false,
              error: { message: 'Credenciales inválidas. Comprueba correo y contraseña.', code: 401 }
            };
          }

          case 'refreshToken': {
            return {
              success: true,
              data: {
                token: 'mock_jwt_token_refreshed_' + Math.random().toString(36).substring(2),
                expiresIn: 3600
              },
              timestamp: now
            };
          }

          // --- PLATFORMS ---
          case 'getPlatforms': {
            return {
              success: true,
              data: {
                platforms: state.platforms,
                total: state.platforms.length
              },
              timestamp: now
            };
          }

          case 'createPlatform': {
            const newPlatform = {
              id: 'plat-' + Date.now(),
              name: payload.name,
              url: payload.url,
              token: payload.token,
              institution: payload.institution || 'Institución Universitaria',
              version: 'Moodle 4.3+ (Detectado)',
              status: 'active',
              usersCount: 0,
              coursesCount: 0,
              lastSync: now,
              responseTimeMs: 165,
              sslValid: true
            };
            const updated = [newPlatform, ...state.platforms];
            window.store.setState({ platforms: updated });
            return { success: true, message: 'Plataforma conectada exitosamente', data: { platform: newPlatform }, timestamp: now };
          }

          case 'updatePlatform': {
            const updated = state.platforms.map(p => p.id === payload.id ? { ...p, ...payload } : p);
            window.store.setState({ platforms: updated });
            return { success: true, message: 'Plataforma actualizada', data: { platform: updated.find(p => p.id === payload.id) }, timestamp: now };
          }

          case 'deletePlatform': {
            const filtered = state.platforms.filter(p => p.id !== payload.id);
            window.store.setState({ platforms: filtered });
            return { success: true, message: 'Plataforma eliminada', data: { success: true }, timestamp: now };
          }

          case 'testPlatformConnection': {
            const plat = state.platforms.find(p => p.id === payload.id);
            return {
              success: true,
              message: 'Conexión exitosa con el servicio web de Moodle',
              data: {
                success: true,
                version: plat ? plat.version : 'Moodle 4.3.2+ (Build: 20240115)',
                sitename: plat ? plat.name : 'Moodle Campus Virtual',
                latencyMs: 135
              },
              timestamp: now
            };
          }

          case 'syncPlatform': {
            const plat = state.platforms.find(p => p.id === payload.id);
            const updatedPlatforms = state.platforms.map(p => {
              if (p.id === payload.id) {
                return { ...p, lastSync: now, status: 'active' };
              }
              return p;
            });
            window.store.setState({ platforms: updatedPlatforms });
            return {
              success: true,
              message: `Sincronización completada para ${plat ? plat.name : 'Plataforma'}`,
              data: { usersUpdated: 14, coursesUpdated: 3 },
              timestamp: now
            };
          }

          // --- USERS ---
          case 'getUsers': {
            let users = [...state.users];
            if (payload.platform_id && payload.platform_id !== 'all') {
              users = users.filter(u => u.platformId === payload.platform_id);
            }
            if (payload.status && payload.status !== 'all') {
              users = users.filter(u => u.status === payload.status);
            }
            if (payload.role && payload.role !== 'all') {
              users = users.filter(u => u.role === payload.role);
            }
            return { success: true, data: { users, total: users.length }, timestamp: now };
          }

          case 'createUser': {
            const plat = state.platforms.find(p => p.id === payload.platform_id) || state.platforms[0];
            const newUser = {
              id: 'usr-' + Date.now(),
              username: payload.username,
              firstname: payload.firstname,
              lastname: payload.lastname,
              email: payload.email,
              role: payload.role || 'student',
              status: 'active',
              platformId: plat ? plat.id : 'plat-1',
              platformName: plat ? plat.name : 'Campus General',
              enrolledCoursesCount: 0,
              lastAccess: now,
              createdAt: now
            };
            const updated = [newUser, ...state.users];
            window.store.setState({ users: updated });
            return { success: true, message: 'Usuario creado en Moodle', data: { user: newUser }, timestamp: now };
          }

          case 'updateUser': {
            const updated = state.users.map(u => u.id === payload.id ? { ...u, ...payload } : u);
            window.store.setState({ users: updated });
            return { success: true, message: 'Usuario actualizado', data: { user: updated.find(u => u.id === payload.id) }, timestamp: now };
          }

          case 'suspendUser': {
            const updated = state.users.map(u => {
              if (u.id === payload.id) {
                const nextStatus = u.status === 'suspended' ? 'active' : 'suspended';
                return { ...u, status: nextStatus };
              }
              return u;
            });
            window.store.setState({ users: updated });
            return { success: true, message: 'Estado del usuario modificado', data: { success: true }, timestamp: now };
          }

          case 'deleteUser': {
            const filtered = state.users.filter(u => u.id !== payload.id);
            window.store.setState({ users: filtered });
            return { success: true, message: 'Usuario eliminado de la plataforma', data: { success: true }, timestamp: now };
          }

          case 'resetUserPassword': {
            const tempPassword = 'Moodle_' + Math.random().toString(36).substring(2, 8) + '!';
            return {
              success: true,
              message: 'Contraseña temporal generada y notificada por correo',
              data: { password: tempPassword },
              timestamp: now
            };
          }

          // --- COURSES ---
          case 'getCourses': {
            let courses = [...state.courses];
            if (payload.platform_id && payload.platform_id !== 'all') {
              courses = courses.filter(c => c.platformId === payload.platform_id);
            }
            if (payload.status && payload.status !== 'all') {
              courses = courses.filter(c => c.status === payload.status);
            }
            return { success: true, data: { courses, total: courses.length }, timestamp: now };
          }

          case 'createCourse': {
            const plat = state.platforms.find(p => p.id === payload.platform_id) || state.platforms[0];
            const gradients = [
              'linear-gradient(135deg, #2563eb, #3b82f6)',
              'linear-gradient(135deg, #0ea5e9, #38bdf8)',
              'linear-gradient(135deg, #8b5cf6, #a855f7)',
              'linear-gradient(135deg, #10b981, #059669)',
              'linear-gradient(135deg, #f59e0b, #d97706)'
            ];
            const newCourse = {
              id: 'crs-' + Date.now(),
              fullname: payload.fullname,
              shortname: payload.shortname,
              platformId: plat ? plat.id : 'plat-1',
              platformName: plat ? plat.name : 'Campus General',
              categoryId: payload.category_id || 'cat-general',
              categoryName: 'General y Multidisciplinario',
              summary: payload.summary || '',
              format: payload.format || 'topics',
              status: 'active',
              studentsCount: 0,
              teachersCount: 1,
              startDate: payload.startDate || new Date().toISOString().split('T')[0],
              gradient: gradients[state.courses.length % gradients.length]
            };
            const updated = [newCourse, ...state.courses];
            window.store.setState({ courses: updated });
            return { success: true, message: 'Curso creado con éxito', data: { course: newCourse }, timestamp: now };
          }

          case 'deleteCourse': {
            const filtered = state.courses.filter(c => c.id !== payload.id);
            window.store.setState({ courses: filtered });
            return { success: true, message: 'Curso archivado y eliminado', data: { success: true }, timestamp: now };
          }

          case 'enrollUsers': {
            const { course_id, user_ids = [], role_id = 'student' } = payload;
            const course = state.courses.find(c => c.id === course_id);
            const newEnrollments = [];

            user_ids.forEach((uid, idx) => {
              const user = state.users.find(u => u.id === uid);
              if (user && course) {
                newEnrollments.push({
                  id: 'enr-' + Date.now() + '-' + idx,
                  userId: user.id,
                  userName: `${user.firstname} ${user.lastname}`,
                  userEmail: user.email,
                  courseId: course.id,
                  courseName: course.fullname,
                  platformId: course.platformId,
                  platformName: course.platformName,
                  role: role_id,
                  method: 'manual',
                  status: 'active',
                  enrolledAt: now
                });
              }
            });

            // Actualizar contador del curso
            const updatedCourses = state.courses.map(c => {
              if (c.id === course_id) {
                return { ...c, studentsCount: c.studentsCount + newEnrollments.length };
              }
              return c;
            });

            window.store.setState({
              courses: updatedCourses,
              enrollments: [...newEnrollments, ...state.enrollments]
            });

            return {
              success: true,
              message: `${newEnrollments.length} alumnos matriculados correctamente`,
              data: { enrolled: newEnrollments.length, course },
              timestamp: now
            };
          }

          case 'enrollUsersMultiCourse': {
            // Matrícula multi-curso: items = [{userId, courseId, role, ...}]
            const items = payload.items || [];
            const defaultRole = payload.role_id || 'student';
            const method = payload.method || 'csv';
            const newEnrollments = [];
            const perCourse = {};

            items.forEach((item, idx) => {
              const user = state.users.find(u => u.id === item.userId);
              const course = state.courses.find(c => c.id === item.courseId);
              if (!user || !course) return;
              newEnrollments.push({
                id: 'enr-' + Date.now() + '-' + idx,
                userId: user.id,
                userName: item.userName || `${user.firstname} ${user.lastname}`,
                userEmail: item.userEmail || user.email,
                courseId: course.id,
                courseName: course.fullname,
                platformId: course.platformId,
                platformName: course.platformName,
                role: item.role || defaultRole,
                method,
                status: 'active',
                enrolledAt: now
              });
              perCourse[course.id] = (perCourse[course.id] || 0) + 1;
            });

            const updatedCourses = state.courses.map(c => {
              if (perCourse[c.id]) return { ...c, studentsCount: (c.studentsCount || 0) + perCourse[c.id] };
              return c;
            });

            const courseNames = Object.entries(perCourse).map(([cid, n]) => {
              const c = state.courses.find(x => x.id === cid);
              return `${c ? c.shortname : cid} (${n})`;
            }).join(', ');

            const updatedLogs = [{
              id: 'log-' + Date.now(),
              action: 'BATCH_ENROLL_CSV_MULTI',
              user: state.auth?.user?.name || 'Administrador',
              ip: '192.168.1.100',
              timestamp: now,
              details: `CSV multi-curso: ${newEnrollments.length} matrícula(s) en ${Object.keys(perCourse).length} curso(s): ${courseNames}`
            }, ...state.auditLogs];

            window.store.setState({
              courses: updatedCourses,
              enrollments: [...newEnrollments, ...state.enrollments],
              auditLogs: updatedLogs
            });

            return {
              success: true,
              message: `${newEnrollments.length} matrícula(s) en ${Object.keys(perCourse).length} curso(s)`,
              data: { enrolled: newEnrollments.length, coursesTouched: Object.keys(perCourse).length, perCourse },
              timestamp: now
            };
          }

          // --- SCHEDULED ENROLLMENT BATCHES ---
          case 'getScheduledBatches': {
            return {
              success: true,
              data: { batches: state.scheduledBatches || [] },
              timestamp: now
            };
          }

          case 'createScheduledBatch': {
            const enrollmentItems = Array.isArray(payload.enrollmentItems) && payload.enrollmentItems.length > 0
              ? payload.enrollmentItems
              : null;
            const course = state.courses.find(c => c.id === payload.courseId);
            const plat = state.platforms.find(p => p.id === (course ? course.platformId : payload.platformId));
            const distinctCourseIds = enrollmentItems ? [...new Set(enrollmentItems.map(i => i.courseId))] : [];
            const multiCourse = !!enrollmentItems && distinctCourseIds.length > 1;
            const multiPlatform = enrollmentItems && new Set(enrollmentItems.map(i => i.platformId)).size > 1;
            const newBatch = {
              id: 'batch-' + Date.now(),
              name: payload.name || `Matrícula en ${multiCourse ? `${distinctCourseIds.length} cursos` : (course ? course.shortname : 'Curso')}`,
              courseId: payload.courseId,
              courseName: multiCourse ? `Múltiples cursos (${distinctCourseIds.length})` : (course ? course.fullname : 'Curso Seleccionado'),
              courseCount: enrollmentItems ? distinctCourseIds.length : 1,
              platformId: plat ? plat.id : 'plat-1',
              platformName: multiPlatform ? 'Plataformas varias' : (plat ? plat.name : 'Campus Virtual'),
              role: payload.role || 'student',
              studentCount: enrollmentItems ? enrollmentItems.length : ((payload.targetStudentIds || []).length || payload.studentCount || 1),
              enrollmentCount: enrollmentItems ? enrollmentItems.length : ((payload.targetStudentIds || []).length || payload.studentCount || 1),
              scheduledAt: payload.scheduledAt || new Date().toISOString(),
              status: payload.isImmediate ? 'completed' : 'scheduled',
              targetStudentIds: payload.targetStudentIds || (enrollmentItems ? enrollmentItems.map(i => i.userId) : []),
              targetStudentEmails: payload.targetStudentEmails || [],
              enrollmentItems: enrollmentItems || undefined,
              source: enrollmentItems ? 'csv-multi-course' : 'direct',
              notifyStudents: payload.notifyStudents !== false,
              retryOnFailure: payload.retryOnFailure !== false,
              csvErrors: payload._csvErrors || undefined,
              createdAt: now,
              executionLog: enrollmentItems
                ? (payload.isImmediate
                    ? `Ejecutado de inmediato (CSV multi-curso): ${enrollmentItems.length} matrícula(s) en ${distinctCourseIds.length} curso(s)`
                    : `Programado (CSV multi-curso): ${enrollmentItems.length} matrícula(s) en ${distinctCourseIds.length} curso(s)`)
                : (payload.isImmediate
                    ? `Ejecutado de inmediato: ${(payload.targetStudentIds || []).length} alumnos matriculados`
                    : 'Programado para ejecución automática en horario asignado')
            };

            let updatedEnrollments = state.enrollments;
            let updatedCourses = state.courses;

            // Si es inmediato, procesar de inmediato las matrículas (multi-curso o clásico)
            if (payload.isImmediate) {
              if (enrollmentItems) {
                const perCourse = {};
                const studentsToEnroll = enrollmentItems.map((item, idx) => {
                  const user = state.users.find(u => u.id === item.userId) || {
                    id: item.userId, firstname: item.userName || 'Alumno', lastname: '', email: item.userEmail || ''
                  };
                  perCourse[item.courseId] = (perCourse[item.courseId] || 0) + 1;
                  return {
                    id: 'enr-' + Date.now() + '-' + idx,
                    userId: user.id,
                    userName: item.userName || (user.firstname ? `${user.firstname} ${user.lastname}` : 'Alumno Registrado'),
                    userEmail: item.userEmail || user.email,
                    courseId: item.courseId,
                    courseName: item.courseName || 'Curso General',
                    platformId: item.platformId || 'plat-1',
                    platformName: item.platformName || 'Campus Virtual',
                    role: item.role || payload.role || 'student',
                    method: 'batch',
                    status: 'active',
                    enrolledAt: now
                  };
                });
                updatedEnrollments = [...studentsToEnroll, ...state.enrollments];
                updatedCourses = state.courses.map(c => perCourse[c.id]
                  ? { ...c, studentsCount: (c.studentsCount || 0) + perCourse[c.id] }
                  : c);
                newBatch.completedAt = now;
              } else {
                const studentsToEnroll = (payload.targetStudentIds || []).map((uid, idx) => {
                  const user = state.users.find(u => u.id === uid) || {
                    id: uid,
                    firstname: 'Alumno',
                    lastname: 'Registrado #' + (idx + 1),
                    email: (payload.targetStudentEmails && payload.targetStudentEmails[idx]) || `alumno_${idx + 1}@universidad.edu`
                  };
                  return {
                    id: 'enr-' + Date.now() + '-' + idx,
                    userId: user.id,
                    userName: user.firstname ? `${user.firstname} ${user.lastname}` : (user.name || 'Alumno Registrado'),
                    userEmail: user.email,
                    courseId: course ? course.id : payload.courseId,
                    courseName: course ? course.fullname : 'Curso General',
                    platformId: plat ? plat.id : 'plat-1',
                    platformName: plat ? plat.name : 'Campus Virtual',
                    role: payload.role || 'student',
                    method: 'batch',
                    status: 'active',
                    enrolledAt: now
                  };
                });

                updatedEnrollments = [...studentsToEnroll, ...state.enrollments];
                if (course) {
                  updatedCourses = state.courses.map(c => c.id === course.id ? { ...c, studentsCount: c.studentsCount + studentsToEnroll.length } : c);
                }
                newBatch.completedAt = now;
              }
            }

            const updatedBatches = [newBatch, ...(state.scheduledBatches || [])];
            const updatedLogs = [
              {
                id: 'log-' + Date.now(),
                action: 'BATCH_ENROLL_CREATE',
                user: state.auth?.user?.name || 'Administrador',
                ip: '192.168.1.100',
                timestamp: now,
                details: `Lote "${newBatch.name}" ${payload.isImmediate ? 'ejecutado' : 'programado para ' + new Date(newBatch.scheduledAt).toLocaleString()}${enrollmentItems ? ` — ${enrollmentItems.length} matrícula(s) en ${distinctCourseIds.length} curso(s) (CSV multi-curso)` : ''}`
              },
              ...state.auditLogs
            ];

            window.store.setState({
              scheduledBatches: updatedBatches,
              enrollments: updatedEnrollments,
              courses: updatedCourses,
              auditLogs: updatedLogs
            });

            return {
              success: true,
              message: payload.isImmediate
                ? `Lote ejecutado con éxito: ${newBatch.enrollmentCount} matrícula(s) en ${newBatch.courseCount} curso(s)`
                : `Lote de matrícula programado: ${newBatch.enrollmentCount} matrícula(s) en ${newBatch.courseCount} curso(s)`,
              data: { batch: newBatch },
              timestamp: now
            };
          }

          case 'executeScheduledBatch': {
            const batches = state.scheduledBatches || [];
            const batch = batches.find(b => b.id === payload.batchId);
            if (!batch) {
              return { success: false, error: { message: 'Lote no encontrado' } };
            }

            let newEnrollments;
            let perCourse = {};

            if (Array.isArray(batch.enrollmentItems) && batch.enrollmentItems.length > 0) {
              // Multi-curso: cada ítem define su propio curso/plataforma
              newEnrollments = batch.enrollmentItems.map((item, idx) => {
                const user = state.users.find(u => u.id === item.userId) || {
                  id: item.userId, firstname: item.userName || 'Estudiante', lastname: '', email: item.userEmail || ''
                };
                perCourse[item.courseId] = (perCourse[item.courseId] || 0) + 1;
                return {
                  id: 'enr-' + Date.now() + '-' + idx,
                  userId: user.id,
                  userName: item.userName || `${user.firstname} ${user.lastname}`.trim() || 'Alumno Registrado',
                  userEmail: item.userEmail || user.email,
                  courseId: item.courseId,
                  courseName: item.courseName || 'Curso General',
                  platformId: item.platformId || batch.platformId,
                  platformName: item.platformName || batch.platformName,
                  role: item.role || batch.role || 'student',
                  method: 'batch',
                  status: 'active',
                  enrolledAt: now
                };
              });
            } else {
              const course = state.courses.find(c => c.id === batch.courseId);
              const targetIds = batch.targetStudentIds && batch.targetStudentIds.length > 0
                ? batch.targetStudentIds
                : state.users.slice(0, batch.studentCount || 5).map(u => u.id);

              newEnrollments = targetIds.map((uid, idx) => {
                const user = state.users.find(u => u.id === uid) || {
                  id: uid,
                  firstname: 'Estudiante',
                  lastname: 'Lote #' + (idx + 1),
                  email: (batch.targetStudentEmails && batch.targetStudentEmails[idx]) || `estudiante_${idx + 1}@universidad.edu`
                };
                return {
                  id: 'enr-' + Date.now() + '-' + idx,
                  userId: user.id,
                  userName: user.firstname ? `${user.firstname} ${user.lastname}` : (user.name || 'Alumno Registrado'),
                  userEmail: user.email,
                  courseId: batch.courseId,
                  courseName: batch.courseName,
                  platformId: batch.platformId,
                  platformName: batch.platformName,
                  role: batch.role || 'student',
                  method: 'batch',
                  status: 'active',
                  enrolledAt: now
                };
              });
              if (batch.courseId) perCourse[batch.courseId] = newEnrollments.length;
            }

            const courseCount = Object.keys(perCourse).length;
            const updatedBatches = batches.map(b => {
              if (b.id === batch.id) {
                return {
                  ...b,
                  status: 'completed',
                  completedAt: now,
                  executionLog: `Ejecutado con éxito a las ${new Date().toLocaleTimeString()}: ${newEnrollments.length} matrícula(s) en ${courseCount} curso(s) vía Moodle API.`
                };
              }
              return b;
            });

            const updatedCourses = state.courses.map(c => perCourse[c.id]
              ? { ...c, studentsCount: (c.studentsCount || 0) + perCourse[c.id] }
              : c);

            const updatedLogs = [
              {
                id: 'log-' + Date.now(),
                action: 'BATCH_ENROLL_EXECUTE',
                user: 'Cron Runner Moodlify',
                ip: '127.0.0.1',
                timestamp: now,
                details: `Lote "${batch.name}" completado (${newEnrollments.length} alumnos)`
              },
              ...state.auditLogs
            ];

            window.store.setState({
              scheduledBatches: updatedBatches,
              enrollments: [...newEnrollments, ...state.enrollments],
              courses: updatedCourses,
              auditLogs: updatedLogs
            });

            return {
              success: true,
              message: `Lote "${batch.name}" ejecutado: ${newEnrollments.length} matrícula(s) en ${courseCount} curso(s)`,
              data: { batchId: batch.id, enrolled: newEnrollments.length, coursesTouched: courseCount },
              timestamp: now
            };
          }

          case 'cancelScheduledBatch': {
            const batches = (state.scheduledBatches || []).map(b => {
              if (b.id === payload.batchId) {
                return { ...b, status: 'cancelled', executionLog: 'Cancelado manualmente por el administrador' };
              }
              return b;
            });
            window.store.setState({ scheduledBatches: batches });
            return { success: true, message: 'Lote cancelado correctamente', timestamp: now };
          }

          case 'deleteScheduledBatch': {
            const batches = (state.scheduledBatches || []).filter(b => b.id !== payload.batchId);
            window.store.setState({ scheduledBatches: batches });
            return { success: true, message: 'Lote eliminado de la cola', timestamp: now };
          }

          // --- INCIDENCES ---
          case 'getIncidences': {
            let incidences = [...state.incidences];
            if (payload.status && payload.status !== 'all') {
              incidences = incidences.filter(i => i.status === payload.status);
            }
            if (payload.priority && payload.priority !== 'all') {
              incidences = incidences.filter(i => i.priority === payload.priority);
            }
            return { success: true, data: { incidences }, timestamp: now };
          }

          case 'createIncidence': {
            const plat = state.platforms.find(p => p.id === payload.platform_id) || state.platforms[0];
            const newIncidence = {
              id: 'inc-' + Date.now(),
              title: payload.title,
              description: payload.description,
              priority: payload.priority || 'medium',
              status: 'open',
              category: payload.category || 'general',
              platformId: plat ? plat.id : 'plat-1',
              platformName: plat ? plat.name : 'Plataforma General',
              assignedTo: payload.assignedTo || 'Víctor Lorenzo',
              createdAt: now,
              updatedAt: now
            };
            const updated = [newIncidence, ...state.incidences];
            window.store.setState({ incidences: updated });
            return { success: true, message: 'Ticket de incidencia registrado', data: { incidence: newIncidence }, timestamp: now };
          }

          case 'updateIncidence': {
            const updated = state.incidences.map(i => i.id === payload.id ? { ...i, ...payload, updatedAt: now } : i);
            window.store.setState({ incidences: updated });
            return { success: true, message: 'Incidencia actualizada', data: { incidence: updated.find(i => i.id === payload.id) }, timestamp: now };
          }

          case 'resolveIncidence': {
            const updated = state.incidences.map(i => i.id === payload.id ? { ...i, status: 'resolved', updatedAt: now } : i);
            window.store.setState({ incidences: updated });
            return { success: true, message: 'Incidencia marcada como resuelta', data: { success: true }, timestamp: now };
          }

          // --- DASHBOARD STATS ---
          case 'getDashboardStats': {
            const totalPlatforms = state.platforms.length;
            const totalUsers = state.platforms.reduce((acc, p) => acc + (p.usersCount || 0), 0);
            const totalCourses = state.platforms.reduce((acc, p) => acc + (p.coursesCount || 0), 0);
            const openIncidences = state.incidences.filter(i => i.status !== 'resolved').length;

            return {
              success: true,
              data: {
                total_platforms: totalPlatforms,
                total_users: totalUsers,
                total_courses: totalCourses,
                open_incidences: openIncidences,
                platform_stats: state.platforms.map(p => ({
                  id: p.id,
                  name: p.name,
                  status: p.status,
                  users: p.usersCount,
                  courses: p.coursesCount,
                  latency: p.responseTimeMs
                }))
              },
              timestamp: now
            };
          }

          default:
            return {
              success: true,
              message: `Acción '${action}' ejecutada con éxito (Mock)`,
              data: payload,
              timestamp: now
            };
        }
      } catch (err) {
        return {
          success: false,
          error: { message: err.message, code: 500 },
          timestamp: now
        };
      }
    }
  }

  // Instancia singleton del cliente API
  window.api = new ApiClient();
})();

