/**
 * ==============================================================================
 * MOODLIFY - MOODLE WEB SERVICES CLIENT (js/moodle-service.js)
 * Full wrapper for Moodle REST API: Site Info, Users, Courses, Enrolments,
 * Rate Limiting (10 req/s), Specific Exception Mapping & Fallback Controller
 * ==============================================================================
 */

(function () {
  'use strict';

  class MoodleWebService {
    constructor() {
      this.rateLimitRps = window.CONFIG?.MOODLE_RATE_LIMIT_RPS || 10;
      this.requestQueue = [];
      this.isProcessingQueue = false;
      this.minIntervalMs = 1000 / this.rateLimitRps; // 100ms entre llamadas
      this.lastRequestTimestamp = 0;
    }

    /**
     * Controlador de tasa de peticiones (Leaky bucket a 10 req/s)
     */
    async _enqueueRequest(fn) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ fn, resolve, reject });
        this._processQueue();
      });
    }

    async _processQueue() {
      if (this.isProcessingQueue || this.requestQueue.length === 0) return;
      this.isProcessingQueue = true;

      while (this.requestQueue.length > 0) {
        const item = this.requestQueue.shift();
        const now = Date.now();
        const elapsed = now - this.lastRequestTimestamp;

        if (elapsed < this.minIntervalMs) {
          await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
        }

        this.lastRequestTimestamp = Date.now();

        try {
          const result = await item.fn();
          item.resolve(result);
        } catch (err) {
          item.reject(this._mapMoodleError(err));
        }
      }

      this.isProcessingQueue = false;
    }

    /**
     * Traduce códigos de error nativos de Moodle a mensajes claros en español
     */
    _mapMoodleError(error) {
      const code = error?.errorcode || error?.code || '';
      const msg = error?.message || '';

      const translations = {
        invalidtoken: 'El token de servicio web ha expirado o es incorrecto.',
        accessexception: 'El token no posee los permisos requeridos para esta función en Moodle.',
        usernotfound: 'El usuario especificado no existe en la base de datos de Moodle.',
        cannotdeletecourse: 'No fue posible eliminar el curso (compruebe si contiene alumnos matriculados).',
        wsaccessuserdeleted: 'La cuenta asociada al servicio web ha sido dada de baja en Moodle.',
        invalidparameter: 'Uno o más parámetros enviados son inválidos para la API de Moodle.'
      };

      if (translations[code]) {
        return new Error(translations[code]);
      }
      return error instanceof Error ? error : new Error(msg || 'Error desconocido en Moodle Web Service');
    }

    /**
     * Realiza llamada directa al endpoint REST de Moodle o a través del API Client
     */
    async executeWsFunction(platform, wsfunction, params = {}) {
      return this._enqueueRequest(async () => {
        // Si estamos en modo Mock o no hay URL externa directa, usar Mock Client
        if (window.CONFIG?.IS_MOCK || !platform?.url) {
          return this._executeMockWsFunction(platform, wsfunction, params);
        }

        const endpoint = `${platform.url.replace(/\/+$/, '')}/webservice/rest/server.php`;
        const queryParams = new URLSearchParams({
          wstoken: platform.token,
          wsfunction,
          moodlewsrestformat: 'json'
        });

        const response = await fetch(`${endpoint}?${queryParams.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(params).toString()
        });

        const data = await response.json();

        if (data.exception || data.errorcode) {
          throw data;
        }

        return data;
      });
    }

    /**
     * MOCK FALLBACK: Simula respuestas exactas de las funciones Web Services de Moodle
     */
    async _executeMockWsFunction(platform, wsfunction, params) {
      await new Promise(r => setTimeout(r, 120));
      const state = window.store.getState();

      switch (wsfunction) {
        case 'core_webservice_get_site_info':
          return {
            sitename: platform?.name || 'Moodle Campus Demo',
            username: 'ws_moodlify_agent',
            firstname: 'Moodlify',
            lastname: 'Bridge',
            fullname: 'Moodlify SaaS Agent',
            lang: 'es',
            userid: 2,
            siteurl: platform?.url || 'https://campus.universidad.edu',
            version: platform?.version || 'Moodle 4.3.2+ (Build: 20240115)',
            release: '4.3.2+',
            functions: [
              { name: 'core_webservice_get_site_info', version: '20240115' },
              { name: 'core_user_get_users', version: '20240115' },
              { name: 'core_course_get_courses', version: '20240115' },
              { name: 'enrol_manual_enrol_users', version: '20240115' }
            ]
          };

        case 'core_user_get_users':
          return {
            users: state.users.map(u => ({
              id: u.id,
              username: u.username,
              firstname: u.firstname,
              lastname: u.lastname,
              email: u.email,
              suspended: u.status === 'suspended' ? 1 : 0
            }))
          };

        case 'core_user_create_users':
          return (params.users || []).map((u, idx) => ({
            id: 'usr-new-' + idx,
            username: u.username
          }));

        case 'core_user_update_users':
          return null;

        case 'core_user_delete_users':
          return null;

        case 'core_course_get_courses':
          return state.courses.map(c => ({
            id: c.id,
            fullname: c.fullname,
            shortname: c.shortname,
            summary: c.summary,
            categoryid: 1,
            visible: c.status === 'active' ? 1 : 0
          }));

        case 'core_course_create_courses':
          return (params.courses || []).map((c, idx) => ({
            id: 'crs-new-' + idx,
            shortname: c.shortname
          }));

        case 'core_course_delete_courses':
          return null;

        case 'enrol_manual_enrol_users':
          return null;

        case 'core_enrol_get_enrolled_users':
          return state.users.slice(0, 5).map(u => ({
            id: u.id,
            fullname: `${u.firstname} ${u.lastname}`,
            email: u.email
          }));

        case 'core_course_create_categories':
          return [{ id: 10, name: params.name || 'Nueva Categoría' }];

        default:
          return { success: true };
      }
    }

    // --- High-level Wrapper Methods ---

    /**
     * core_webservice_get_site_info
     */
    async getSiteInfo(platform) {
      return this.executeWsFunction(platform, 'core_webservice_get_site_info');
    }

    /**
     * core_user_get_users
     */
    async getUsers(platform, criteria = []) {
      return this.executeWsFunction(platform, 'core_user_get_users', { criteria });
    }

    /**
     * core_user_create_users
     */
    async createUsers(platform, users = []) {
      return this.executeWsFunction(platform, 'core_user_create_users', { users });
    }

    /**
     * core_user_update_users
     */
    async updateUsers(platform, users = []) {
      return this.executeWsFunction(platform, 'core_user_update_users', { users });
    }

    /**
     * core_user_delete_users
     */
    async deleteUsers(platform, userids = []) {
      return this.executeWsFunction(platform, 'core_user_delete_users', { userids });
    }

    /**
     * core_course_get_courses
     */
    async getCourses(platform, ids = []) {
      return this.executeWsFunction(platform, 'core_course_get_courses', { ids });
    }

    /**
     * core_course_create_courses
     */
    async createCourses(platform, courses = []) {
      return this.executeWsFunction(platform, 'core_course_create_courses', { courses });
    }

    /**
     * core_course_delete_courses
     */
    async deleteCourses(platform, courseids = []) {
      return this.executeWsFunction(platform, 'core_course_delete_courses', { courseids });
    }

    /**
     * enrol_manual_enrol_users
     */
    async enrolUsers(platform, enrollments = []) {
      return this.executeWsFunction(platform, 'enrol_manual_enrol_users', { enrollments });
    }

    /**
     * core_enrol_get_enrolled_users
     */
    async getEnrolledUsers(platform, courseid) {
      return this.executeWsFunction(platform, 'core_enrol_get_enrolled_users', { courseid });
    }

    /**
     * core_course_create_categories
     */
    async createCategory(platform, categories = []) {
      return this.executeWsFunction(platform, 'core_course_create_categories', { categories });
    }
  }

  window.moodleService = new MoodleWebService();
})();

