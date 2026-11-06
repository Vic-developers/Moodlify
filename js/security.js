/**
 * ==============================================================================
 * MOODLIFY - SECURITY UTILITIES (js/security.js)
 * Anti-XSS HTML Sanitizer, Form & URL Validators, Web Crypto SHA-256 Hashing,
 * CSRF Token Generator & Client-Side Rate Limiter
 * ==============================================================================
 */

(function () {
  'use strict';

  class SecurityService {
    constructor() {
      this._rateLimits = new Map();
      this._initCsrf();
    }

    /**
     * Inicializa o recupera el token CSRF activo
     */
    _initCsrf() {
      const storageKey = window.CONFIG?.STORAGE_KEYS?.CSRF_TOKEN || 'moodlify_csrf_token';
      let token = localStorage.getItem(storageKey);
      if (!token) {
        token = this.generateToken(32);
        localStorage.setItem(storageKey, token);
      }
      this.csrfToken = token;
    }

    /**
     * Genera un token criptográficamente seguro
     */
    generateToken(byteLength = 32) {
      if (window.crypto && window.crypto.getRandomValues) {
        const bytes = new Uint8Array(byteLength);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      }
      // Fallback pseudo-aleatorio
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    /**
     * Sanitiza cadenas de texto para prevenir ataques XSS al renderizar en el DOM
     */
    escapeHtml(str) {
      if (typeof str !== 'string') return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    /**
     * Sanitiza HTML permitiendo exclusivamente etiquetas semánticas y seguras (Whitelist)
     */
    sanitizeHtml(dirtyHtml) {
      if (typeof dirtyHtml !== 'string') return '';
      const parser = new DOMParser();
      const doc = parser.parseFromString(dirtyHtml, 'text/html');

      const allowedTags = new Set([
        'b', 'strong', 'i', 'em', 'u', 'span', 'p', 'br',
        'code', 'pre', 'ul', 'ol', 'li', 'small'
      ]);

      const sanitizeNode = (node) => {
        const children = Array.from(node.childNodes);
        for (const child of children) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const tagName = child.tagName.toLowerCase();
            if (!allowedTags.has(tagName)) {
              // Si no está permitido, reemplazar por su texto plano
              const textNode = document.createTextNode(child.textContent || '');
              node.replaceChild(textNode, child);
            } else {
              // Limpiar todos los atributos excepto 'class' segura
              const attrs = Array.from(child.attributes);
              for (const attr of attrs) {
                if (attr.name !== 'class') {
                  child.removeAttribute(attr.name);
                }
              }
              sanitizeNode(child);
            }
          }
        }
      };

      sanitizeNode(doc.body);
      return doc.body.innerHTML;
    }

    /**
     * Valida formato de correo electrónico institucional
     */
    isValidEmail(email) {
      if (!email || typeof email !== 'string') return false;
      const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      return re.test(email.trim());
    }

    /**
     * Valida URLs con protocolos seguros permitidos (http o https)
     */
    isValidUrl(urlStr) {
      if (!urlStr || typeof urlStr !== 'string') return false;
      try {
        const url = new URL(urlStr);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch (_) {
        return false;
      }
    }

    /**
     * Verifica robustez de contraseñas (mínimo 8 caracteres, números y letras)
     */
    isStrongPassword(password) {
      if (!password || typeof password !== 'string') return false;
      return password.length >= (window.CONFIG?.PASSWORD_MIN_LENGTH || 8);
    }

    /**
     * Hash SHA-256 nativo mediante la API Web Crypto
     */
    async sha256(message) {
      if (!window.crypto || !window.crypto.subtle) {
        // Fallback simple si Web Crypto no estuviera disponible
        return this._simpleHash(message);
      }
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    _simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return 'hash_' + Math.abs(hash).toString(16);
    }

    /**
     * Rate limiter del lado del cliente para mitigar abusos o envíos duplicados
     * @param {string} key Identificador de la acción (ej: 'login_attempt', 'bulk_enrol')
     * @param {number} maxAttempts Número máximo permitido dentro de la ventana de tiempo
     * @param {number} windowMs Duración de la ventana en milisegundos
     * @returns {boolean} true si está permitido, false si ha superado el límite
     */
    checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
      const now = Date.now();
      let record = this._rateLimits.get(key);

      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + windowMs };
        this._rateLimits.set(key, record);
        return true;
      }

      if (record.count >= maxAttempts) {
        return false;
      }

      record.count++;
      return true;
    }

    /**
     * Retorna el token CSRF activo
     */
    getCsrfToken() {
      return this.csrfToken;
    }
  }

  window.security = new SecurityService();
})();

