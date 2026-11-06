/**
 * Exporta el estado actual del navegador (localStorage `moodlify_state_v2`)
 * a un JSON por colección, listo para importar a Sheets o Supabase.
 *
 * Uso (en http://localhost:3000 con consola abierta):
 *   1. Abre DevTools (F12) > Console
 *   2. Pega este script y Enter
 *   3. Se descargará moodlify_export.json
 *
 * Luego en Apps Script usa sync_collection por colección con ese JSON.
 */
(function exportMoodlify() {
  const raw = localStorage.getItem('moodlify_state_v2');
  if (!raw) {
    console.warn('No hay estado guardado. Recarga la app y espera a que persista.');
    return;
  }
  const state = JSON.parse(raw);
  const collections = [
    'platforms','users','courses','enrollments','teachingAssignments',
    'academicPeriods','cohorts','groups','schedules','scheduledBatches',
    'backups','academicCases','incidences','automations','auditLogs'
  ];
  const out = {};
  collections.forEach(k => {
    if (state[k] !== undefined) out[k] = state[k];
  });
  out._exportedAt = new Date().toISOString();
  out._serviceWorker = 'moodlify-v2.0.7';

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'moodlify_export_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  console.log('[Moodlify] Export listo:', Object.keys(out).join(', '));
})();
