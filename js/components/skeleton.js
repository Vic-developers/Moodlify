/**
 * ==============================================================================
 * MOODLIFY - SKELETON LOADERS (js/components/skeleton.js)
 * Shimmer-animated placeholding components for Tables, Cards, KPIs & Charts
 * ==============================================================================
 */

(function () {
  'use strict';

  class SkeletonGenerator {
    /**
     * Retorna HTML para una cuadrícula de KPIs en carga
     */
    metricsGrid(count = 4) {
      let items = '';
      for (let i = 0; i < count; i++) {
        items += `
          <div class="card" style="padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
              <div class="skeleton skeleton-text short" style="height: 12px;"></div>
              <div class="skeleton skeleton-circle" style="width: 36px; height: 36px;"></div>
            </div>
            <div class="skeleton skeleton-text medium" style="height: 28px; margin-bottom: 0.75rem;"></div>
            <div class="skeleton skeleton-text short" style="height: 12px; margin-bottom: 0;"></div>
          </div>
        `;
      }
      return `<div class="metrics-grid animate-fade-in">${items}</div>`;
    }

    /**
     * Retorna HTML para una tabla en carga
     */
    table(rows = 5, cols = 4) {
      let thead = '';
      for (let c = 0; c < cols; c++) {
        thead += `<th><div class="skeleton skeleton-text" style="height: 14px; width: 80%;"></div></th>`;
      }

      let tbody = '';
      for (let r = 0; r < rows; r++) {
        let rowCells = '';
        for (let c = 0; c < cols; c++) {
          rowCells += `<td><div class="skeleton skeleton-text" style="height: 14px; width: ${Math.floor(Math.random() * 40 + 50)}%;"></div></td>`;
        }
        tbody += `<tr>${rowCells}</tr>`;
      }

      return `
        <div class="table-container animate-fade-in">
          <table class="table">
            <thead><tr>${thead}</tr></thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>
      `;
    }

    /**
     * Retorna HTML para un gráfico en carga
     */
    chartCard(title = 'Cargando estadísticas...') {
      return `
        <div class="card animate-fade-in">
          <div class="card-header">
            <div>
              <div class="card-title">${title}</div>
              <div class="skeleton skeleton-text short" style="height: 10px; margin-top: 4px;"></div>
            </div>
          </div>
          <div class="card-body">
            <div class="skeleton" style="height: 260px; width: 100%; border-radius: 8px;"></div>
          </div>
        </div>
      `;
    }

    /**
     * Retorna HTML para tarjetas tipo Grid de Cursos / Plataformas
     */
    cardsGrid(count = 3) {
      let cards = '';
      for (let i = 0; i < count; i++) {
        cards += `
          <div class="card" style="display: flex; flex-direction: column;">
            <div class="skeleton" style="height: 80px; border-radius: 12px 12px 0 0;"></div>
            <div style="padding: 1.25rem; flex: 1;">
              <div class="skeleton skeleton-text medium" style="height: 18px; margin-bottom: 0.75rem;"></div>
              <div class="skeleton skeleton-text" style="height: 14px; margin-bottom: 0.5rem;"></div>
              <div class="skeleton skeleton-text short" style="height: 14px; margin-bottom: 1.25rem;"></div>
              <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 0.75rem;">
                <div class="skeleton skeleton-text short" style="width: 30%; height: 12px;"></div>
                <div class="skeleton skeleton-text short" style="width: 25%; height: 12px;"></div>
              </div>
            </div>
          </div>
        `;
      }
      return `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;" class="animate-fade-in">${cards}</div>`;
    }
  }

  window.skeleton = new SkeletonGenerator();
})();

