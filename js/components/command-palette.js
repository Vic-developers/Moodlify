/**
 * ==============================================================================
 * MOODLIFY - COMMAND PALETTE (js/components/command-palette.js)
 * Quick Search & Action Modal (Ctrl+K / Cmd+K), Keyboard Navigation,
 * Fuzzy Matching, Dynamic Command Registration & Category Grouping
 * ==============================================================================
 */

(function () {
  'use strict';

  class CommandPalette {
    constructor() {
      this.isOpen = false;
      this.backdrop = null;
      this.input = null;
      this.resultsContainer = null;
      this.selectedIndex = 0;
      this.filteredCommands = [];
      this.commands = [];

      this._init();
    }

    _init() {
      this._registerDefaultCommands();
      this._bindGlobalShortcut();
    }

    _registerDefaultCommands() {
      this.commands = [
        // --- Navegación ---
        {
          id: 'nav-dashboard',
          title: 'Ir a Dashboard',
          category: 'Navegación',
          shortcut: 'G D',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
          action: () => window.router.navigate('#dashboard')
        },
        {
          id: 'nav-platforms',
          title: 'Ir a Plataformas',
          category: 'Navegación',
          shortcut: 'G P',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>',
          action: () => window.router.navigate('#platforms')
        },
        {
          id: 'nav-users',
          title: 'Ir a Usuarios',
          category: 'Navegación',
          shortcut: 'G U',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
          action: () => window.router.navigate('#users')
        },
        {
          id: 'nav-courses',
          title: 'Ir a Cursos',
          category: 'Navegación',
          shortcut: 'G C',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>',
          action: () => window.router.navigate('#courses')
        },
        {
          id: 'nav-teaching',
          title: 'Ir a Data Docente',
          category: 'Navegación',
          shortcut: 'G D',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12.5V16c0 1.66 2.68 3 6 3s6-1.34 6-3v-3.5"/></svg>',
          action: () => window.router.navigate('#teaching')
        },
        {
          id: 'nav-periods',
          title: 'Ir a Periodos',
          category: 'Navegación',
          shortcut: 'G P',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
          action: () => window.router.navigate('#periods')
        },
        {
          id: 'nav-cohorts',
          title: 'Ir a Cohortes',
          category: 'Navegación',
          shortcut: 'G H',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
          action: () => window.router.navigate('#cohorts')
        },
        {
          id: 'nav-activity',
          title: 'Ir a Actividad y Progreso',
          category: 'Navegación',
          shortcut: 'G Y',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
          action: () => window.router.navigate('#activity')
        },
        {
          id: 'nav-academic',
          title: 'Ir a Mesa Académica',
          category: 'Navegación',
          shortcut: 'G E',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
          action: () => window.router.navigate('#academic-cases')
        },
        {
          id: 'nav-importer',
          title: 'Ir a Importador CSV',
          category: 'Navegación',
          shortcut: 'G X',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
          action: () => window.router.navigate('#importer')
        },
        {
          id: 'nav-enrollments',
          title: 'Ir a Matrículas',
          category: 'Navegación',
          shortcut: 'G M',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
          action: () => window.router.navigate('#enrollments')
        },
        {
          id: 'nav-automations',
          title: 'Ir a Automatizaciones',
          category: 'Navegación',
          shortcut: 'G A',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
          action: () => window.router.navigate('#automations')
        },
        {
          id: 'nav-reports',
          title: 'Ir a Reportes',
          category: 'Navegación',
          shortcut: 'G R',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>',
          action: () => window.router.navigate('#reports')
        },
        {
          id: 'nav-integrations',
          title: 'Ir a Integraciones',
          category: 'Navegación',
          shortcut: 'G K',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
          action: () => window.router.navigate('#integrations')
        },
        {
          id: 'nav-backups',
          title: 'Ir a Backups',
          category: 'Navegación',
          shortcut: 'G B',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
          action: () => window.router.navigate('#backups')
        },
        {
          id: 'nav-incidences',
          title: 'Ir a Incidencias',
          category: 'Navegación',
          shortcut: 'G I',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
          action: () => window.router.navigate('#incidences')
        },
        {
          id: 'nav-settings',
          title: 'Ir a Configuración',
          category: 'Navegación',
          shortcut: 'G S',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
          action: () => window.router.navigate('#settings')
        },

        // --- Acciones Rápidas ---
        {
          id: 'act-new-platform',
          title: 'Nueva Plataforma',
          category: 'Acciones Rápidas',
          shortcut: 'N P',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
          action: () => {
            window.router.navigate('#platforms');
            setTimeout(() => {
              if (window.platformsPage && typeof window.platformsPage.openCreateModal === 'function') {
                window.platformsPage.openCreateModal();
              }
            }, 100);
          }
        },
        {
          id: 'act-new-user',
          title: 'Nuevo Usuario',
          category: 'Acciones Rápidas',
          shortcut: 'N U',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
          action: () => {
            window.router.navigate('#users');
            setTimeout(() => {
              if (window.usersPage && typeof window.usersPage.openCreateModal === 'function') {
                window.usersPage.openCreateModal();
              }
            }, 100);
          }
        },
        {
          id: 'act-new-course',
          title: 'Nuevo Curso',
          category: 'Acciones Rápidas',
          shortcut: 'N C',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></svg>',
          action: () => {
            window.router.navigate('#courses');
            setTimeout(() => {
              if (window.coursesPage && typeof window.coursesPage.openCreateModal === 'function') {
                window.coursesPage.openCreateModal();
              }
            }, 100);
          }
        },
        {
          id: 'act-schedule-batch',
          title: 'Programar Matrícula por Lote',
          category: 'Acciones Rápidas',
          shortcut: 'N B',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
          action: () => {
            window.router.navigate('#enrollments');
            setTimeout(() => {
              if (window.enrollmentsPage && typeof window.enrollmentsPage.openScheduleBatchModal === 'function') {
                window.enrollmentsPage.openScheduleBatchModal();
              }
            }, 100);
          }
        },
        {
          id: 'act-custom-report',
          title: 'Generar Reporte a Medida',
          category: 'Acciones Rápidas',
          shortcut: 'G R',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
          action: () => {
            window.router.navigate('#reports');
            setTimeout(() => {
              if (window.reportsPage && typeof window.reportsPage.setTab === 'function') {
                window.reportsPage.setTab('builder');
              }
            }, 100);
          }
        },
        {
          id: 'act-sync-all',
          title: 'Sincronizar Todo',
          category: 'Acciones Rápidas',
          shortcut: 'S T',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>',
          action: async () => {
            if (window.toast) window.toast.info('Sincronizando todas las plataformas Moodle...');
            const platforms = window.store.getState().platforms;
            for (const p of platforms) {
              await window.api.request('syncPlatform', { id: p.id });
            }
            if (window.toast) window.toast.success('Todas las plataformas sincronizadas exitosamente');
          }
        },

        // --- Sistema ---
        {
          id: 'sys-theme',
          title: 'Cambiar Tema (Claro / Oscuro)',
          category: 'Sistema',
          shortcut: 'T',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
          action: () => {
            if (window.themeManager) window.themeManager.cycleTheme();
          }
        },
        {
          id: 'sys-logout',
          title: 'Cerrar Sesión',
          category: 'Sistema',
          shortcut: 'Q',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
          action: () => {
            if (window.auth) window.auth.logout(true);
          }
        }
      ];
    }

    _bindGlobalShortcut() {
      window.addEventListener('keydown', (e) => {
        // Detectar Ctrl+K o Cmd+K
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.toggle();
        }
      });
    }

    registerCommand(cmd) {
      this.commands.push(cmd);
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this._buildModal();
      this._filter('');
      this.backdrop.classList.add('open');
      setTimeout(() => this.input.focus(), 50);
    }

    close() {
      if (!this.isOpen || !this.backdrop) return;
      this.isOpen = false;
      this.backdrop.classList.remove('open');
      setTimeout(() => {
        if (this.backdrop && this.backdrop.parentNode) {
          this.backdrop.parentNode.removeChild(this.backdrop);
        }
        this.backdrop = null;
      }, 200);
    }

    _buildModal() {
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'cmd-backdrop';

      this.backdrop.innerHTML = `
        <div class="cmd-modal">
          <div class="cmd-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="cmd-input" placeholder="Escribe un comando o navega a una sección..." autocomplete="off" spellcheck="false" />
            <kbd class="kbd-badge">ESC</kbd>
          </div>
          <div class="cmd-results"></div>
          <div class="cmd-footer">
            <div>Navega con <kbd class="kbd-badge">↑</kbd> <kbd class="kbd-badge">↓</kbd></div>
            <div>Ejecuta con <kbd class="kbd-badge">↵</kbd></div>
          </div>
        </div>
      `;

      document.body.appendChild(this.backdrop);

      this.input = this.backdrop.querySelector('.cmd-input');
      this.resultsContainer = this.backdrop.querySelector('.cmd-results');

      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) this.close();
      });

      this.input.addEventListener('input', (e) => {
        this._filter(e.target.value);
      });

      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this._navigate(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this._navigate(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this._executeSelected();
        } else if (e.key === 'Escape') {
          this.close();
        }
      });
    }

    _filter(query = '') {
      const q = query.trim().toLowerCase();

      if (!q) {
        this.filteredCommands = [...this.commands];
      } else {
        this.filteredCommands = this.commands.filter(cmd =>
          cmd.title.toLowerCase().includes(q) ||
          cmd.category.toLowerCase().includes(q)
        );
      }

      this.selectedIndex = 0;
      this._renderResults(q);
    }

    _renderResults(searchQuery = '') {
      if (this.filteredCommands.length === 0) {
        this.resultsContainer.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: var(--muted); font-size: 0.875rem;">
            No se encontraron comandos para "<strong>${window.security ? window.security.escapeHtml(searchQuery) : searchQuery}</strong>"
          </div>
        `;
        return;
      }

      // Agrupar por categoría
      const groups = {};
      this.filteredCommands.forEach((cmd, idx) => {
        if (!groups[cmd.category]) groups[cmd.category] = [];
        groups[cmd.category].push({ cmd, flatIndex: idx });
      });

      let html = '';
      for (const [catName, items] of Object.entries(groups)) {
        html += `<div class="cmd-group-title">${catName}</div>`;
        items.forEach(({ cmd, flatIndex }) => {
          const isSelected = flatIndex === this.selectedIndex;
          const highlightedTitle = this._highlightMatch(cmd.title, searchQuery);

          html += `
            <div class="cmd-item ${isSelected ? 'selected' : ''}" data-index="${flatIndex}">
              <div class="cmd-item-icon">${cmd.icon}</div>
              <div class="cmd-item-label">${highlightedTitle}</div>
              ${cmd.shortcut ? `<span class="cmd-shortcut">${cmd.shortcut}</span>` : ''}
            </div>
          `;
        });
      }

      this.resultsContainer.innerHTML = html;

      // Click listener en los ítems
      this.resultsContainer.querySelectorAll('.cmd-item').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.getAttribute('data-index'), 10);
          this.selectedIndex = idx;
          this._executeSelected();
        });
      });
    }

    _highlightMatch(text, query) {
      if (!query) return window.security ? window.security.escapeHtml(text) : text;
      const safeText = window.security ? window.security.escapeHtml(text) : text;
      const regex = new RegExp(`(${query})`, 'gi');
      return safeText.replace(regex, '<span style="color: var(--primary); font-weight: 700; text-decoration: underline;">$1</span>');
    }

    _navigate(direction) {
      if (this.filteredCommands.length === 0) return;
      this.selectedIndex = (this.selectedIndex + direction + this.filteredCommands.length) % this.filteredCommands.length;

      const items = this.resultsContainer.querySelectorAll('.cmd-item');
      items.forEach((item, idx) => {
        if (idx === this.selectedIndex) {
          item.classList.add('selected');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('selected');
        }
      });
    }

    _executeSelected() {
      const selected = this.filteredCommands[this.selectedIndex];
      if (selected && typeof selected.action === 'function') {
        this.close();
        selected.action();
      }
    }
  }

  window.commandPalette = new CommandPalette();
})();

