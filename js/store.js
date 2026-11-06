/**
 * ==============================================================================
 * MOODLIFY - REACTIVE STORE (js/store.js)
 * Zustand/Redux-like global state manager without external dependencies.
 * Features: getState(), setState(), subscribe(), persist, logger, devtools, memoized selectors
 * ==============================================================================
 */

(function () {
  'use strict';

  // --- Initial Mock Datasets ---
  const INITIAL_PLATFORMS = [
    {
      id: 'plat-1',
      name: 'Campus Principal Pregrado',
      url: 'https://campus.universidad.edu',
      token: 'wstoken_camp_9823f0a1b2c3d4e5',
      institution: 'Universidad Central - Sede Central',
      version: 'Moodle 4.3.2+ (Build: 20240115)',
      status: 'active', // 'active' | 'maintenance' | 'error' | 'inactive'
      usersCount: 1420,
      coursesCount: 48,
      lastSync: new Date(Date.now() - 35 * 60000).toISOString(),
      responseTimeMs: 142,
      sslValid: true
    },
    {
      id: 'plat-2',
      name: 'Aula Virtual Posgrado y Maestrías',
      url: 'https://posgrado.universidad.edu',
      token: 'wstoken_posg_11a4c9e88d223344',
      institution: 'Escuela de Negocios y Posgrado',
      version: 'Moodle 4.2.5 (Build: 20231211)',
      status: 'active',
      usersCount: 380,
      coursesCount: 18,
      lastSync: new Date(Date.now() - 120 * 60000).toISOString(),
      responseTimeMs: 210,
      sslValid: true
    },
    {
      id: 'plat-3',
      name: 'Cursos Libres y Extensión Continua',
      url: 'https://extension.universidad.edu',
      token: 'wstoken_ext_44b76a09ff887766',
      institution: 'Dirección de Educación Continua',
      version: 'Moodle 4.1.8 (Build: 20240212)',
      status: 'maintenance',
      usersCount: 750,
      coursesCount: 24,
      lastSync: new Date(Date.now() - 860 * 60000).toISOString(),
      responseTimeMs: 480,
      sslValid: true
    }
  ];

  const INITIAL_USERS = [
    {
      id: 'usr-1',
      username: 'admin.general',
      firstname: 'Víctor',
      lastname: 'Lorenzo',
      email: 'victor.lorenzo@universidad.edu',
      role: 'admin', // 'admin' | 'editingteacher' | 'teacher' | 'student'
      status: 'active', // 'active' | 'suspended'
      platformId: 'plat-1',
      platformName: 'Campus Principal Pregrado',
      enrolledCoursesCount: 0,
      lastAccess: new Date(Date.now() - 10 * 60000).toISOString(),
      createdAt: '2024-01-15T08:00:00Z'
    },
    {
      id: 'usr-2',
      username: 'm.valenzuela',
      firstname: 'Mariana',
      lastname: 'Valenzuela',
      email: 'm.valenzuela@universidad.edu',
      role: 'editingteacher',
      status: 'active',
      platformId: 'plat-1',
      platformName: 'Campus Principal Pregrado',
      enrolledCoursesCount: 4,
      lastAccess: new Date(Date.now() - 45 * 60000).toISOString(),
      createdAt: '2024-02-01T10:30:00Z'
    },
    {
      id: 'usr-3',
      username: 'c.herrera',
      firstname: 'Carlos',
      lastname: 'Herrera',
      email: 'c.herrera@posgrado.edu',
      role: 'editingteacher',
      status: 'active',
      platformId: 'plat-2',
      platformName: 'Aula Virtual Posgrado y Maestrías',
      enrolledCoursesCount: 2,
      lastAccess: new Date(Date.now() - 180 * 60000).toISOString(),
      createdAt: '2024-02-10T14:15:00Z'
    },
    {
      id: 'usr-4',
      username: 's.navarro',
      firstname: 'Sofía',
      lastname: 'Navarro',
      email: 's.navarro@estudiantes.edu',
      role: 'student',
      status: 'active',
      platformId: 'plat-1',
      platformName: 'Campus Principal Pregrado',
      enrolledCoursesCount: 5,
      lastAccess: new Date(Date.now() - 25 * 60000).toISOString(),
      createdAt: '2024-03-01T09:00:00Z'
    },
    {
      id: 'usr-5',
      username: 'd.morales',
      firstname: 'Diego',
      lastname: 'Morales',
      email: 'd.morales@estudiantes.edu',
      role: 'student',
      status: 'active',
      platformId: 'plat-1',
      platformName: 'Campus Principal Pregrado',
      enrolledCoursesCount: 4,
      lastAccess: new Date(Date.now() - 320 * 60000).toISOString(),
      createdAt: '2024-03-02T11:20:00Z'
    },
    {
      id: 'usr-6',
      username: 'e.guzman',
      firstname: 'Elena',
      lastname: 'Guzmán',
      email: 'e.guzman@extension.edu',
      role: 'teacher',
      status: 'suspended',
      platformId: 'plat-3',
      platformName: 'Cursos Libres y Extensión Continua',
      enrolledCoursesCount: 1,
      lastAccess: new Date(Date.now() - 4500 * 60000).toISOString(),
      createdAt: '2024-01-20T16:40:00Z'
    },
    {
      id: 'usr-7',
      username: 'r.soto',
      firstname: 'Rodrigo',
      lastname: 'Soto',
      email: 'r.soto@posgrado.edu',
      role: 'student',
      status: 'active',
      platformId: 'plat-2',
      platformName: 'Aula Virtual Posgrado y Maestrías',
      enrolledCoursesCount: 3,
      lastAccess: new Date(Date.now() - 95 * 60000).toISOString(),
      createdAt: '2024-03-15T08:10:00Z'
    },
    {
      id: 'usr-8',
      username: 'f.castillo',
      firstname: 'Fernanda',
      lastname: 'Castillo',
      email: 'f.castillo@extension.edu',
      role: 'student',
      status: 'active',
      platformId: 'plat-3',
      platformName: 'Cursos Libres y Extensión Continua',
      enrolledCoursesCount: 2,
      lastAccess: new Date(Date.now() - 50 * 60000).toISOString(),
      createdAt: '2024-04-01T12:00:00Z'
    }
  ];

  const INITIAL_COURSES = [
    {
      id: 'crs-1',
      fullname: 'Arquitectura de Software y Sistemas Distribuidos',
      shortname: 'INF-401',
      platformId: 'plat-1',
      platformName: 'Campus Principal Pregrado',
      categoryId: 'cat-ing',
      categoryName: 'Ingeniería y Tecnologías',
      summary: 'Patrones arquitectónicos de microservicios, cloud computing y diseño escalable.',
      format: 'topics',
      status: 'active', // 'active' | 'draft' | 'archived'
      studentsCount: 68,
      teachersCount: 2,
      startDate: '2025-03-01',
      gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)'
    },
    {
      id: 'crs-2',
      fullname: 'Machine Learning y Ciencia de Datos Aplicada',
      shortname: 'DAT-302',
      platformId: 'plat-1',
      platformName: 'Campus Principal Pregrado',
      categoryId: 'cat-ing',
      categoryName: 'Ingeniería y Tecnologías',
      summary: 'Fundamentos de regresión, clasificación supervisada y redes neuronales en Python.',
      format: 'topics',
      status: 'active',
      studentsCount: 94,
      teachersCount: 2,
      startDate: '2025-03-01',
      gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)'
    },
    {
      id: 'crs-3',
      fullname: 'Dirección Estratégica y Finanzas Corporativas',
      shortname: 'MBA-610',
      platformId: 'plat-2',
      platformName: 'Aula Virtual Posgrado y Maestrías',
      categoryId: 'cat-neg',
      categoryName: 'Negocios y Administración',
      summary: 'Modelos de evaluación financiera y planificación estratégica para alta gerencia.',
      format: 'weeks',
      status: 'active',
      studentsCount: 42,
      teachersCount: 1,
      startDate: '2025-04-10',
      gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)'
    },
    {
      id: 'crs-4',
      fullname: 'Gestión de la Innovación y Transformación Digital',
      shortname: 'MBA-625',
      platformId: 'plat-2',
      platformName: 'Aula Virtual Posgrado y Maestrías',
      categoryId: 'cat-neg',
      categoryName: 'Negocios y Administración',
      summary: 'Metodologías ágiles, Design Thinking y gobernanza del cambio tecnológico.',
      format: 'weeks',
      status: 'active',
      studentsCount: 38,
      teachersCount: 1,
      startDate: '2025-04-15',
      gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)'
    },
    {
      id: 'crs-5',
      fullname: 'Desarrollo Web Frontend Moderno con JavaScript',
      shortname: 'EXT-101',
      platformId: 'plat-3',
      platformName: 'Cursos Libres y Extensión Continua',
      categoryId: 'cat-ext',
      categoryName: 'Educación Continua',
      summary: 'HTML5 semántico, CSS moderno, JavaScript ES6+ y construcción de componentes.',
      format: 'topics',
      status: 'active',
      studentsCount: 180,
      teachersCount: 3,
      startDate: '2025-05-01',
      gradient: 'linear-gradient(135deg, #10b981, #059669)'
    },
    {
      id: 'crs-6',
      fullname: 'Bioestadística y Epidemiología Clínica',
      shortname: 'MED-205',
      platformId: 'plat-1',
      platformName: 'Campus Principal Pregrado',
      categoryId: 'cat-sal',
      categoryName: 'Ciencias de la Salud',
      summary: 'Análisis de cohortes, ensayos clínicos y significancia en estudios biomédicos.',
      format: 'topics',
      status: 'draft',
      studentsCount: 0,
      teachersCount: 1,
      startDate: '2025-06-01',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
    },
    {
      id: 'crs-7',
      fullname: 'Ciberseguridad y Auditoría de Redes Empresariales',
      shortname: 'EXT-204',
      platformId: 'plat-3',
      platformName: 'Cursos Libres y Extensión Continua',
      categoryId: 'cat-ext',
      categoryName: 'Educación Continua',
      summary: 'Hardening de servidores Linux, escaneo de vulnerabilidades y normas ISO 27001.',
      format: 'topics',
      status: 'archived',
      studentsCount: 75,
      teachersCount: 1,
      startDate: '2024-09-01',
      gradient: 'linear-gradient(135deg, #64748b, #475569)'
    }
  ];

  const INITIAL_INCIDENCES = [
    {
      id: 'inc-1',
      title: 'Latencia elevada en sincronización de notas de Pregrado',
      description: 'El webhook de cierre de actas reporta demoras de hasta 45 segundos en Campus Principal.',
      platformId: 'plat-1',
      platformName: 'Campus Principal Pregrado',
      category: 'rendimiento', // 'general' | 'matriculas' | 'cursos' | 'usuarios' | 'rendimiento' | 'seguridad'
      priority: 'high', // 'low' | 'medium' | 'high' | 'critical'
      status: 'in_progress', // 'open' | 'in_progress' | 'resolved'
      assignedTo: 'Víctor Lorenzo',
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 3600000).toISOString()
    },
    {
      id: 'inc-2',
      title: 'Mantenimiento preventivo de base de datos en Extensión',
      description: 'Programación de ventana de actualización y optimización de tablas mdl_logstore_standard_log.',
      platformId: 'plat-3',
      platformName: 'Cursos Libres y Extensión Continua',
      category: 'general',
      priority: 'medium',
      status: 'open',
      assignedTo: 'Equipo Infraestructura',
      createdAt: new Date(Date.now() - 14 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 14 * 3600000).toISOString()
    },
    {
      id: 'inc-3',
      title: 'Error de token expirado en servicio web de Posgrado',
      description: 'El token wstoken_posg ha caducado por política trimestral y requiere renovación inmediata.',
      platformId: 'plat-2',
      platformName: 'Aula Virtual Posgrado y Maestrías',
      category: 'seguridad',
      priority: 'critical',
      status: 'open',
      assignedTo: 'Víctor Lorenzo',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 20 * 60000).toISOString()
    },
    {
      id: 'inc-4',
      title: 'Falla en matriculación por lote desde archivo CSV',
      description: '35 alumnos del curso INF-401 arrojaron error de formato en campo cod_carrera.',
      platformId: 'plat-1',
      platformName: 'Campus Principal Pregrado',
      category: 'matriculas',
      priority: 'medium',
      status: 'resolved',
      assignedTo: 'Mariana Valenzuela',
      createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 8 * 3600000).toISOString()
    },
    {
      id: 'inc-5',
      title: 'Discrepancia en contador de estudiantes del curso EXT-101',
      description: 'La interfaz muestra 178 pero el reporte SQL interno totaliza 180 usuarios.',
      platformId: 'plat-3',
      platformName: 'Cursos Libres y Extensión Continua',
      category: 'cursos',
      priority: 'low',
      status: 'resolved',
      assignedTo: 'Soporte Nivel 1',
      createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 3600000).toISOString()
    }
  ];

  const INITIAL_AUTOMATIONS = [
    {
      id: 'auto-1',
      name: 'Sincronización Total de Catálogo y Usuarios',
      description: 'Descarga periódica de altas, bajas y modificaciones de cursos y usuarios activos.',
      frequency: 'daily', // 'hourly' | 'daily' | 'weekly' | 'monthly'
      targetPlatforms: ['plat-1', 'plat-2', 'plat-3'],
      action: 'sync_all',
      isActive: true,
      lastRun: new Date(Date.now() - 8 * 3600000).toISOString(),
      runsCount: 148,
      status: 'success'
    },
    {
      id: 'auto-2',
      name: 'Reporte Semanal de Finalización y Calificaciones',
      description: 'Compilación de métricas de avance y envío automático vía correo a coordinadores.',
      frequency: 'weekly',
      targetPlatforms: ['plat-1', 'plat-2'],
      action: 'generate_report',
      isActive: true,
      lastRun: new Date(Date.now() - 3 * 86400000).toISOString(),
      runsCount: 26,
      status: 'success'
    },
    {
      id: 'auto-3',
      name: 'Monitoreo de Salud y Latencia de Servidores',
      description: 'Ping cada hora al endpoint core_webservice_get_site_info con alerta por caída.',
      frequency: 'hourly',
      targetPlatforms: ['plat-1', 'plat-2', 'plat-3'],
      action: 'health_check',
      isActive: true,
      lastRun: new Date(Date.now() - 20 * 60000).toISOString(),
      runsCount: 1250,
      status: 'success'
    },
    {
      id: 'auto-4',
      name: 'Purga de Registros Temporales y Logs Antiguos',
      description: 'Archivado mensual de registros de auditoría y sesiones expiradas mayores a 90 días.',
      frequency: 'monthly',
      targetPlatforms: ['plat-1'],
      action: 'cleanup_logs',
      isActive: false,
      lastRun: new Date(Date.now() - 25 * 86400000).toISOString(),
      runsCount: 6,
      status: 'paused'
    }
  ];

  // Generador de 25 matrículas históricas con diversidad de fechas y métodos + progreso para Actividad
  const INITIAL_ENROLLMENTS = (function () {
    const list = [];
    const methods = ['manual', 'csv', 'api', 'self'];
    const roles = ['student', 'student', 'student', 'editingteacher'];
    for (let i = 1; i <= 25; i++) {
      const userIdx = (i % 8);
      const courseIdx = (i % 7);
      const daysAgo = (i * 1.5).toFixed(1);
      const progress = ((i * 17) % 101); // 0-100 determinista para demo
      const lastAccessHoursAgo = ((i * 11) % 120); // 0-120h
      list.push({
        id: `enr-${i}`,
        userId: INITIAL_USERS[userIdx].id,
        userName: `${INITIAL_USERS[userIdx].firstname} ${INITIAL_USERS[userIdx].lastname}`,
        userEmail: INITIAL_USERS[userIdx].email,
        courseId: INITIAL_COURSES[courseIdx].id,
        courseName: INITIAL_COURSES[courseIdx].fullname,
        platformId: INITIAL_COURSES[courseIdx].platformId,
        platformName: INITIAL_COURSES[courseIdx].platformName,
        role: roles[i % roles.length],
        method: methods[i % methods.length],
        status: i === 13 ? 'failed' : 'active',
        enrolledAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
        progressPercent: i === 13 ? 0 : progress,
        lastAccessAt: new Date(Date.now() - lastAccessHoursAgo * 3600000).toISOString(),
        grade: progress >= 60 ? Math.round(4 + (progress - 60) * 0.15) : (progress > 0 ? 2 : null)
      });
    }
    return list;
  })();

  const INITIAL_AUDIT_LOGS = [
    {
      id: 'log-1',
      action: 'AUTH_LOGIN',
      user: 'Víctor Lorenzo',
      ip: '192.168.1.105',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      details: 'Inicio de sesión exitoso (Admin)'
    },
    {
      id: 'log-2',
      action: 'PLATFORM_SYNC',
      user: 'Sistema Automático',
      ip: '127.0.0.1',
      timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
      details: 'Sincronización completada: Campus Principal Pregrado'
    },
    {
      id: 'log-3',
      action: 'USER_CREATE',
      user: 'Víctor Lorenzo',
      ip: '192.168.1.105',
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
      details: 'Usuario Fernanda Castillo añadido a Extensión'
    },
    {
      id: 'log-4',
      action: 'INCIDENCE_RESOLVE',
      user: 'Mariana Valenzuela',
      ip: '192.168.1.42',
      timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
      details: 'Incidencia #inc-4 marcada como resuelta'
    }
  ];

  // Lotes de matriculación programados en horarios específicos
  const INITIAL_SCHEDULED_BATCHES = [
    {
      id: 'batch-1',
      name: 'Matrícula Nocturna - Facultad de Ingeniería y Datos',
      courseId: 'crs-1',
      courseName: 'Cálculo Avanzado y Ecuaciones Diferenciales',
      platformId: 'plat-1',
      platformName: 'Campus Principal Pregrado',
      role: 'student',
      studentCount: 5,
      scheduledAt: new Date(Date.now() + 45 * 60000).toISOString(), // Dentro de 45 minutos
      status: 'scheduled', // 'scheduled' | 'running' | 'completed' | 'cancelled'
      targetStudentIds: ['usr-4', 'usr-5', 'usr-6', 'usr-7', 'usr-8'],
      notifyStudents: true,
      retryOnFailure: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      executionLog: 'Programado para ejecución automática en ventana de bajo tráfico'
    },
    {
      id: 'batch-2',
      name: 'Asignación Masiva - Posgrado IA y Automatización',
      courseId: 'crs-2',
      courseName: 'Inteligencia Artificial y Machine Learning Aplicado',
      platformId: 'plat-2',
      platformName: 'Aula Virtual Posgrado y Maestrías',
      role: 'student',
      studentCount: 2,
      scheduledAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      status: 'completed',
      completedAt: new Date(Date.now() - 4 * 3600000 + 35000).toISOString(),
      targetStudentIds: ['usr-3', 'usr-4'],
      notifyStudents: true,
      retryOnFailure: false,
      createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
      executionLog: 'Completado: 2 alumnos matriculados exitosamente (100% éxito, latencia 142ms)'
    },
    {
      id: 'batch-3',
      name: 'Inscripción Masiva - Cursos Libres y Extensión Web',
      courseId: 'crs-5',
      courseName: 'Desarrollo Web Frontend Moderno con JavaScript',
      platformId: 'plat-3',
      platformName: 'Cursos Libres y Extensión Continua',
      role: 'student',
      studentCount: 3,
      scheduledAt: new Date(Date.now() + 6 * 3600000).toISOString(), // En 6 horas
      status: 'scheduled',
      targetStudentIds: ['usr-5', 'usr-6', 'usr-7'],
      notifyStudents: true,
      retryOnFailure: true,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      executionLog: 'Programado por Coordinación de Extensión'
    }
  ];

  // Data Docente: qué cursos imparte/impartió cada docente por ciclo académico y recinto
  const INITIAL_TEACHING_ASSIGNMENTS = [
    {
      id: 'teach-1', teacherId: 'usr-2', teacherName: 'Mariana Valenzuela', courseId: 'crs-1',
      courseName: 'Arquitectura de Software y Sistemas Distribuidos', shortname: 'INF-401',
      categoryName: 'Ingeniería y Tecnologías', platformId: 'plat-1', platformName: 'Campus Principal Pregrado',
      cicloAcademico: '2026-I', status: 'impartiendo', role: 'editingteacher',
      startDate: '2025-03-01', endDate: '2025-07-15'
    },
    {
      id: 'teach-2', teacherId: 'usr-2', teacherName: 'Mariana Valenzuela', courseId: 'crs-2',
      courseName: 'Machine Learning y Ciencia de Datos Aplicada', shortname: 'DAT-302',
      categoryName: 'Ingeniería y Tecnologías', platformId: 'plat-1', platformName: 'Campus Principal Pregrado',
      cicloAcademico: '2025-II', status: 'completado', role: 'editingteacher',
      startDate: '2024-08-10', endDate: '2024-12-20'
    },
    {
      id: 'teach-3', teacherId: 'usr-2', teacherName: 'Mariana Valenzuela', courseId: 'crs-1',
      courseName: 'Arquitectura de Software y Sistemas Distribuidos', shortname: 'INF-401',
      categoryName: 'Ingeniería y Tecnologías', platformId: 'plat-1', platformName: 'Campus Principal Pregrado',
      cicloAcademico: '2025-I', status: 'completado', role: 'editingteacher',
      startDate: '2024-03-01', endDate: '2024-07-15'
    },
    {
      id: 'teach-4', teacherId: 'usr-3', teacherName: 'Carlos Herrera', courseId: 'crs-3',
      courseName: 'Dirección Estratégica y Finanzas Corporativas', shortname: 'MBA-610',
      categoryName: 'Negocios y Administración', platformId: 'plat-2', platformName: 'Aula Virtual Posgrado y Maestrías',
      cicloAcademico: '2026-I', status: 'impartiendo', role: 'editingteacher',
      startDate: '2025-04-10', endDate: '2025-08-15'
    },
    {
      id: 'teach-5', teacherId: 'usr-3', teacherName: 'Carlos Herrera', courseId: 'crs-4',
      courseName: 'Gestión de la Innovación y Transformación Digital', shortname: 'MBA-625',
      categoryName: 'Negocios y Administración', platformId: 'plat-2', platformName: 'Aula Virtual Posgrado y Maestrías',
      cicloAcademico: '2025-II', status: 'completado', role: 'editingteacher',
      startDate: '2024-08-15', endDate: '2024-12-20'
    },
    {
      id: 'teach-6', teacherId: 'usr-6', teacherName: 'Elena Guzmán', courseId: 'crs-5',
      courseName: 'Desarrollo Web Frontend Moderno con JavaScript', shortname: 'EXT-101',
      categoryName: 'Educación Continua', platformId: 'plat-3', platformName: 'Cursos Libres y Extensión Continua',
      cicloAcademico: '2026-I', status: 'impartiendo', role: 'teacher',
      startDate: '2025-05-01', endDate: '2025-09-01'
    },
    {
      id: 'teach-7', teacherId: 'usr-6', teacherName: 'Elena Guzmán', courseId: 'crs-7',
      courseName: 'Ciberseguridad y Auditoría de Redes Empresariales', shortname: 'EXT-204',
      categoryName: 'Educación Continua', platformId: 'plat-3', platformName: 'Cursos Libres y Extensión Continua',
      cicloAcademico: '2024-II', status: 'completado', role: 'teacher',
      startDate: '2024-09-01', endDate: '2024-12-15'
    },
    {
      id: 'teach-8', teacherId: 'usr-2', teacherName: 'Mariana Valenzuela', courseId: 'crs-2',
      courseName: 'Machine Learning y Ciencia de Datos Aplicada', shortname: 'DAT-302',
      categoryName: 'Ingeniería y Tecnologías', platformId: 'plat-1', platformName: 'Campus Principal Pregrado',
      cicloAcademico: '2026-II', status: 'programado', role: 'editingteacher',
      startDate: '2025-08-10', endDate: '2025-12-20'
    },
    {
      id: 'teach-9', teacherId: 'usr-3', teacherName: 'Carlos Herrera', courseId: 'crs-3',
      courseName: 'Dirección Estratégica y Finanzas Corporativas', shortname: 'MBA-610',
      categoryName: 'Negocios y Administración', platformId: 'plat-2', platformName: 'Aula Virtual Posgrado y Maestrías',
      cicloAcademico: '2026-II', status: 'programado', role: 'editingteacher',
      startDate: '2025-08-10', endDate: '2025-12-20'
    },
    {
      id: 'teach-10', teacherId: 'usr-2', teacherName: 'Mariana Valenzuela', courseId: 'crs-6',
      courseName: 'Bioestadística y Epidemiología Clínica', shortname: 'MED-205',
      categoryName: 'Ciencias de la Salud', platformId: 'plat-1', platformName: 'Campus Principal Pregrado',
      cicloAcademico: '2026-I', status: 'programado', role: 'editingteacher',
      startDate: '2025-06-01', endDate: '2025-10-15'
    }
  ];

  // Periodos y Calendario Academico (Corto plazo A)
  const INITIAL_PERIODS = [
    { id: 'per-2025-I', ciclo: '2025-I', year: 2025, semester: 'I', startDate: '2025-03-01', endDate: '2025-07-15', enrollmentStart: '2025-02-01', enrollmentEnd: '2025-03-20', status: 'cerrado' },
    { id: 'per-2025-II', ciclo: '2025-II', year: 2025, semester: 'II', startDate: '2025-08-10', endDate: '2025-12-20', enrollmentStart: '2025-07-01', enrollmentEnd: '2025-09-01', status: 'cerrado' },
    { id: 'per-2026-I', ciclo: '2026-I', year: 2026, semester: 'I', startDate: '2026-03-01', endDate: '2026-07-15', enrollmentStart: '2026-02-01', enrollmentEnd: '2026-03-20', status: 'activo' },
    { id: 'per-2026-II', ciclo: '2026-II', year: 2026, semester: 'II', startDate: '2026-08-10', endDate: '2026-12-20', enrollmentStart: '2026-07-01', enrollmentEnd: '2026-09-01', status: 'programado' }
  ];

  // Cohortes, Grupos y Horarios (Mediano B)
  const INITIAL_COHORTS = [
    { id: 'coh-1', name: 'Ingeniería 2026-I — A', platformId: 'plat-1', platformName: 'Campus Principal Pregrado', cicloAcademico: '2026-I', capacity: 40, description: 'Cohorte principal de Ingeniería y Datos' },
    { id: 'coh-2', name: 'MBA Posgrado 2025-II', platformId: 'plat-2', platformName: 'Aula Virtual Posgrado y Maestrías', cicloAcademico: '2025-II', capacity: 30, description: 'Maestrías cohort 2025-II' },
    { id: 'coh-3', name: 'Extensión Web 2026-I', platformId: 'plat-3', platformName: 'Cursos Libres y Extensión Continua', cicloAcademico: '2026-I', capacity: 60, description: 'Cursos libres frontend' }
  ];
  const INITIAL_GROUPS = [
    { id: 'grp-1', cohortId: 'coh-1', name: 'Grupo A1', capacity: 20 },
    { id: 'grp-2', cohortId: 'coh-1', name: 'Grupo A2', capacity: 20 },
    { id: 'grp-3', cohortId: 'coh-2', name: 'Grupo Posgrado 1', capacity: 30 },
    { id: 'grp-4', cohortId: 'coh-3', name: 'Grupo Extensión 1', capacity: 60 }
  ];
  const INITIAL_SCHEDULES = [
    { id: 'sch-1', courseId: 'crs-1', teacherId: 'usr-2', cohortId: 'coh-1', groupId: 'grp-1', day: 'Lunes', hourStart: '09:00', hourEnd: '11:00', room: 'A-101' },
    { id: 'sch-2', courseId: 'crs-2', teacherId: 'usr-2', cohortId: 'coh-1', groupId: 'grp-2', day: 'Miércoles', hourStart: '14:00', hourEnd: '16:00', room: 'Lab-02' },
    { id: 'sch-3', courseId: 'crs-3', teacherId: 'usr-3', cohortId: 'coh-2', groupId: 'grp-3', day: 'Viernes', hourStart: '18:00', hourEnd: '21:00', room: 'Virtual-Zoom' }
  ];

  // Backups (Mediano F)
  const INITIAL_BACKUPS = [
    { id: 'bkp-1', courseId: 'crs-1', courseName: 'Arquitectura de Software y Sistemas Distribuidos', shortname: 'INF-401', platformId: 'plat-1', platformName: 'Campus Principal Pregrado', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), sizeMB: 128, status: 'success', type: 'manual', fileName: 'INF-401_backup_20260501.mbz' },
    { id: 'bkp-2', courseId: 'crs-5', courseName: 'Desarrollo Web Frontend Moderno con JavaScript', shortname: 'EXT-101', platformId: 'plat-3', platformName: 'Cursos Libres y Extensión Continua', createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), sizeMB: 84, status: 'success', type: 'automatico', fileName: 'EXT-101_backup_20260428.mbz' },
    { id: 'bkp-3', courseId: 'crs-3', courseName: 'Dirección Estratégica y Finanzas Corporativas', shortname: 'MBA-610', platformId: 'plat-2', platformName: 'Aula Virtual Posgrado y Maestrías', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), sizeMB: 62, status: 'failed', type: 'manual', fileName: 'MBA-610_backup_20260426.mbz' }
  ];

  // Casos académicos del estudiante (#7) — mesa académica con SLA y trazabilidad a Data Docente
  const INITIAL_ACADEMIC_CASES = [
    {
      id: 'acase-1', studentId: 'usr-4', studentName: 'Sofía Navarro', studentEmail: 's.navarro@estudiantes.edu',
      courseId: 'crs-1', courseName: 'Arquitectura de Software y Sistemas Distribuidos', shortname: 'INF-401',
      teacherId: 'usr-2', teacherName: 'Mariana Valenzuela', platformId: 'plat-1', platformName: 'Campus Principal Pregrado',
      cicloAcademico: '2026-I', category: 'reclamo_notas', priority: 'high', status: 'open',
      title: 'Reclamo de nota parcial 2 — INF-401', description: 'Solicita revisión de calificación del parcial 2 (nota 3.8) por discrepancia con rúbrica publicada.',
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), updatedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      slaHours: 24, firstResponseAt: null, resolvedAt: null,
      activity: [{ at: new Date(Date.now() - 5 * 3600000).toISOString(), who: 'Sistema', text: 'Caso creado desde portal del estudiante' }]
    },
    {
      id: 'acase-2', studentId: 'usr-5', studentName: 'Diego Morales', studentEmail: 'd.morales@estudiantes.edu',
      courseId: 'crs-2', courseName: 'Machine Learning y Ciencia de Datos Aplicada', shortname: 'DAT-302',
      teacherId: 'usr-2', teacherName: 'Mariana Valenzuela', platformId: 'plat-1', platformName: 'Campus Principal Pregrado',
      cicloAcademico: '2026-I', category: 'duda_academica', priority: 'medium', status: 'in_progress',
      title: 'Duda sobre entrega de proyecto final', description: 'No entiende si el dataset debe incluir validación cruzada o basta train/test.',
      createdAt: new Date(Date.now() - 26 * 3600000).toISOString(), updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      slaHours: 48, firstResponseAt: new Date(Date.now() - 2 * 3600000).toISOString(), resolvedAt: null,
      activity: [
        { at: new Date(Date.now() - 26 * 3600000).toISOString(), who: 'Sistema', text: 'Caso creado' },
        { at: new Date(Date.now() - 2 * 3600000).toISOString(), who: 'Mariana Valenzuela', text: 'Primera respuesta: se requiere validación cruzada 5-fold.' }
      ]
    },
    {
      id: 'acase-3', studentId: 'usr-7', studentName: 'Rodrigo Soto', studentEmail: 'r.soto@posgrado.edu',
      courseId: 'crs-3', courseName: 'Dirección Estratégica y Finanzas Corporativas', shortname: 'MBA-610',
      teacherId: 'usr-3', teacherName: 'Carlos Herrera', platformId: 'plat-2', platformName: 'Aula Virtual Posgrado y Maestrías',
      cicloAcademico: '2026-I', category: 'reincorporacion', priority: 'critical', status: 'open',
      title: 'Reincorporación tras licencia médica', description: 'Retorna de licencia; solicita plan de recuperación de contenidos perdidos (2 semanas).',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      slaHours: 4, firstResponseAt: null, resolvedAt: null,
      activity: [{ at: new Date(Date.now() - 2 * 3600000).toISOString(), who: 'Sistema', text: 'Caso crítico creado — SLA 4h' }]
    },
    {
      id: 'acase-4', studentId: 'usr-8', studentName: 'Fernanda Castillo', studentEmail: 'f.castillo@extension.edu',
      courseId: 'crs-5', courseName: 'Desarrollo Web Frontend Moderno con JavaScript', shortname: 'EXT-101',
      teacherId: 'usr-6', teacherName: 'Elena Guzmán', platformId: 'plat-3', platformName: 'Cursos Libres y Extensión Continua',
      cicloAcademico: '2026-I', category: 'certificado', priority: 'low', status: 'resolved',
      title: 'Solicitud de certificado con código verificable', description: 'Solicita certificado de aprobación con hash verificable para empleador.',
      createdAt: new Date(Date.now() - 72 * 3600000).toISOString(), updatedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
      slaHours: 96, firstResponseAt: new Date(Date.now() - 60 * 3600000).toISOString(), resolvedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
      activity: [
        { at: new Date(Date.now() - 72 * 3600000).toISOString(), who: 'Sistema', text: 'Caso creado' },
        { at: new Date(Date.now() - 8 * 3600000).toISOString(), who: 'Elena Guzmán', text: 'Certificado emitido y verificado.' }
      ]
    },
    {
      id: 'acase-5', studentId: 'usr-4', studentName: 'Sofía Navarro', studentEmail: 's.navarro@estudiantes.edu',
      courseId: 'crs-1', courseName: 'Arquitectura de Software y Sistemas Distribuidos', shortname: 'INF-401',
      teacherId: 'usr-2', teacherName: 'Mariana Valenzuela', platformId: 'plat-1', platformName: 'Campus Principal Pregrado',
      cicloAcademico: '2025-I', category: 'reclamo_matricula', priority: 'medium', status: 'resolved',
      title: 'No aparece matriculada en INF-401 (2025-I)', description: 'La matrícula por lote no la incluyó; solicita regularización retroactiva.',
      createdAt: new Date(Date.now() - 200 * 3600000).toISOString(), updatedAt: new Date(Date.now() - 190 * 3600000).toISOString(),
      slaHours: 48, firstResponseAt: new Date(Date.now() - 198 * 3600000).toISOString(), resolvedAt: new Date(Date.now() - 190 * 3600000).toISOString(),
      activity: [
        { at: new Date(Date.now() - 200 * 3600000).toISOString(), who: 'Sistema', text: 'Caso creado' },
        { at: new Date(Date.now() - 190 * 3600000).toISOString(), who: 'Mariana Valenzuela', text: 'Matrícula regularizada y asistencia repuesta.' }
      ]
    }
  ];

  // --- Initial Root State ---
  const DEFAULT_STATE = {
    auth: {
      isAuthenticated: true, // Inicialmente activo en modo Demo para acceso directo
      user: {
        id: 'usr-1',
        name: 'Víctor Lorenzo',
        email: 'victor.lorenzo@universidad.edu',
        role: 'admin',
        institution: 'Consorcio Universitario Metropolitano'
      },
      token: 'jwt_mock_access_token_super_secret',
      refreshToken: 'jwt_mock_refresh_token_super_secret',
      expiresAt: Date.now() + 3600 * 1000
    },
    platforms: INITIAL_PLATFORMS,
    users: INITIAL_USERS,
    courses: INITIAL_COURSES,
    incidences: INITIAL_INCIDENCES,
    automations: INITIAL_AUTOMATIONS,
    enrollments: INITIAL_ENROLLMENTS,
    scheduledBatches: INITIAL_SCHEDULED_BATCHES,
    teachingAssignments: INITIAL_TEACHING_ASSIGNMENTS,
    academicPeriods: INITIAL_PERIODS,
    cohorts: INITIAL_COHORTS,
    groups: INITIAL_GROUPS,
    schedules: INITIAL_SCHEDULES,
    backups: INITIAL_BACKUPS,
    academicCases: INITIAL_ACADEMIC_CASES,
    auditLogs: INITIAL_AUDIT_LOGS,
    settings: Object.assign({}, window.CONFIG ? window.CONFIG.DEFAULT_SETTINGS : {}),
    ui: {
      currentRoute: '#dashboard',
      sidebarOpen: false,
      commandPaletteOpen: false,
      activeModal: null,
      theme: 'light',
      selectedPlatformFilter: 'all',
      searchQuery: '',
      isOnline: navigator.onLine !== false
    }
  };

  // --- Store Implementation ---
  class Store {
    constructor() {
      this.listeners = new Set();
      this.state = this._hydrateState();
      this._saveDebounceTimer = null;

      // Escuchar cambios de conectividad global
      window.addEventListener('online', () => this.setState({ ui: { ...this.state.ui, isOnline: true } }));
      window.addEventListener('offline', () => this.setState({ ui: { ...this.state.ui, isOnline: false } }));
    }

    /**
     * Recupera el estado guardado en localStorage o utiliza el estado inicial
     */
    _hydrateState() {
      try {
        const key = (window.CONFIG && window.CONFIG.STORAGE_KEYS) ? window.CONFIG.STORAGE_KEYS.STATE : 'moodlify_state_v2';
        const persisted = localStorage.getItem(key);
        if (persisted) {
          const parsed = JSON.parse(persisted);
          return {
            ...DEFAULT_STATE,
            ...parsed,
            scheduledBatches: (parsed.scheduledBatches && parsed.scheduledBatches.length > 0)
              ? parsed.scheduledBatches
              : INITIAL_SCHEDULED_BATCHES,
            teachingAssignments: (parsed.teachingAssignments && parsed.teachingAssignments.length > 0)
              ? parsed.teachingAssignments
              : INITIAL_TEACHING_ASSIGNMENTS,
            academicPeriods: (parsed.academicPeriods && parsed.academicPeriods.length > 0)
              ? parsed.academicPeriods
              : INITIAL_PERIODS,
            cohorts: (parsed.cohorts && parsed.cohorts.length > 0)
              ? parsed.cohorts
              : INITIAL_COHORTS,
            groups: (parsed.groups && parsed.groups.length > 0)
              ? parsed.groups
              : INITIAL_GROUPS,
            schedules: (parsed.schedules && parsed.schedules.length > 0)
              ? parsed.schedules
              : INITIAL_SCHEDULES,
            backups: (parsed.backups && parsed.backups.length > 0)
              ? parsed.backups
              : INITIAL_BACKUPS,
            academicCases: (parsed.academicCases && parsed.academicCases.length > 0)
              ? parsed.academicCases
              : INITIAL_ACADEMIC_CASES,
            ui: {
              ...DEFAULT_STATE.ui,
              theme: localStorage.getItem('moodlify_theme') || parsed.ui?.theme || 'light'
            }
          };
        }
      } catch (err) {
        console.warn('[Moodlify Store] Error hidratando estado de localStorage:', err);
      }
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    /**
     * Persiste el estado actual con debounce de 250ms
     */
    _persist() {
      if (this._saveDebounceTimer) clearTimeout(this._saveDebounceTimer);
      this._saveDebounceTimer = setTimeout(() => {
        try {
          const key = (window.CONFIG && window.CONFIG.STORAGE_KEYS) ? window.CONFIG.STORAGE_KEYS.STATE : 'moodlify_state_v2';
          const toSave = {
            auth: this.state.auth,
            platforms: this.state.platforms,
            users: this.state.users,
            courses: this.state.courses,
            incidences: this.state.incidences,
            automations: this.state.automations,
            enrollments: this.state.enrollments,
            scheduledBatches: this.state.scheduledBatches,
            teachingAssignments: this.state.teachingAssignments,
            academicPeriods: this.state.academicPeriods,
            cohorts: this.state.cohorts,
            groups: this.state.groups,
            schedules: this.state.schedules,
            backups: this.state.backups,
            academicCases: this.state.academicCases,
            auditLogs: this.state.auditLogs,
            settings: this.state.settings
          };
          localStorage.setItem(key, JSON.stringify(toSave));
        } catch (err) {
          console.error('[Moodlify Store] Error persistiendo estado:', err);
        }
      }, 250);
    }

    /**
     * Retorna una copia de lectura del estado actual
     */
    getState() {
      return this.state;
    }

    /**
     * Actualiza el estado parcialmente o mediante función transformadora
     */
    setState(updater) {
      const prevState = this.state;
      const nextPartial = typeof updater === 'function' ? updater(prevState) : updater;

      if (!nextPartial || typeof nextPartial !== 'object') return;

      this.state = {
        ...prevState,
        ...nextPartial
      };

      // Logger Middleware en modo desarrollo
      if (window.CONFIG && window.CONFIG.ENV === 'development') {
        console.groupCollapsed(`[Store Update] ${new Date().toLocaleTimeString()}`);
        console.log('%cPrev State:', 'color: #94a3b8;', prevState);
        console.log('%cPayload:', 'color: #3b82f6;', nextPartial);
        console.log('%cNext State:', 'color: #10b981;', this.state);
        console.groupEnd();
      }

      this._persist();

      // Notificar a todos los subscriptores registrados
      this.listeners.forEach((listener) => {
        try {
          listener(this.state, prevState);
        } catch (err) {
          console.error('[Moodlify Store] Error en suscriptor:', err);
        }
      });
    }

    /**
     * Suscribe un callback a cualquier cambio de estado. Retorna función para desuscribirse.
     */
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }

    /**
     * Restablece el almacén a los valores por defecto iniciales
     */
    reset() {
      try {
        const key = (window.CONFIG && window.CONFIG.STORAGE_KEYS) ? window.CONFIG.STORAGE_KEYS.STATE : 'moodlify_state_v2';
        localStorage.removeItem(key);
      } catch (e) {}
      this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      this._persist();
      this.listeners.forEach((l) => l(this.state, this.state));
    }
  }

  // --- Singleton Instance ---
  const storeInstance = new Store();

  // Helper para selectores memoizados
  function createSelector(selectorFn) {
    let lastState = null;
    let lastResult = null;
    return function (state) {
      if (state === lastState) return lastResult;
      lastState = state;
      lastResult = selectorFn(state);
      return lastResult;
    };
  }

  // Exposición en el objeto global
  window.store = storeInstance;
  window.createSelector = createSelector;
  window.__MOODLIFY_STORE__ = storeInstance; // Para inspección DevTools
})();

