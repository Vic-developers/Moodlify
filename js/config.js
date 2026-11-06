/**
 * ==============================================================================
 * MOODLIFY - CONFIGURATION (js/config.js)
 * Global application constants, endpoints, storage keys and defaults
 * ==============================================================================
 */

const CONFIG = {
  // Application Meta
  APP_NAME: 'Moodlify',
  VERSION: '2.0.0',
  TAGLINE: 'Plataforma SaaS de Administración Centralizada de Moodle',
  ENV: 'production', // 'development' | 'production'

  // Backend API Endpoint
  // Si está vacío (''), el cliente entra en MODO DEMO interactivo con datos mock.
  // Para conectar tu backend real (Google Apps Script / Node.js), coloca la URL aquí:
  API_URL: '', // Ej: 'https://script.google.com/macros/s/AKfycby.../exec'

  // Timeouts y Límites de Red
  API_TIMEOUT_MS: 30000,
  API_MAX_RETRIES: 3,
  CACHE_TTL_MS: 60000, // 60 segundos de caché TTL
  MOODLE_RATE_LIMIT_RPS: 10,

  // LocalStorage Keys
  STORAGE_KEYS: {
    STATE: 'moodlify_state_v2',
    AUTH_TOKEN: 'moodlify_access_token',
    REFRESH_TOKEN: 'moodlify_refresh_token',
    AUTH_USER: 'moodlify_auth_user',
    THEME: 'moodlify_theme',
    NOTIFICATIONS: 'moodlify_notifications',
    CSRF_TOKEN: 'moodlify_csrf_token',
    RATE_LIMIT: 'moodlify_rate_limits',
    REMEMBER_ME: 'moodlify_remember_me'
  },

  // Configuración de Seguridad y Sesión
  TOKEN_REFRESH_MARGIN_SEC: 120, // Refrescar token 2 minutos antes de expirar
  PASSWORD_MIN_LENGTH: 8,

  // Configuración Predeterminada del Sistema
  DEFAULT_SETTINGS: {
    institutionName: 'Consorcio Universitario Metropolitano',
    timezone: 'America/Santiago',
    language: 'es',
    autoSyncInterval: 30, // minutos
    emailNotifications: true,
    pushNotifications: false,
    security2FA: false,
    sessionTimeoutMinutes: 60
  },

  // Rutas y Permisos
  ROUTES: {
    LOGIN: '/login.html',
    APP: '/index.html',
    DEFAULT_AUTH_REDIRECT: '#dashboard'
  }
};

// Determina dinámicamente si el modo Mock está activo
CONFIG.IS_MOCK = !CONFIG.API_URL || CONFIG.API_URL.trim() === '';

// Congelamos el objeto en producción para evitar mutaciones accidentales en tiempo de ejecución
if (typeof Object.freeze === 'function') {
  Object.freeze(CONFIG.STORAGE_KEYS);
  Object.freeze(CONFIG.DEFAULT_SETTINGS);
  Object.freeze(CONFIG.ROUTES);
}

// Exportación compatible tanto con módulos ES6 como con scripts tradicionales
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

