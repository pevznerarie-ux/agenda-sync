const list = document.getElementById('visits-list');

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function whoLabel(e) {
  return e.kind === 'room_visit' ? 'Visite de salle' : e.directorName;
}

async function checkin(eventId, action) {
  await apiFetch(`/api/checkin/${encodeURIComponent(eventId)}`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
  render();
}

async function render() {
  try {
    const { events } = await apiFetch('/api/today');
    if (!events.length) {
      list.innerHTML = '<div class="empty-state">Aucun rendez-vous aujourd\'hui.</div>';
      return;
    }
    list.innerHTML = events.map((e) => `
      <div class="visit-card ${e.arrived ? 'arrived' : ''} ${e.late ? 'late' : ''}">
        <div class="visit-time">${formatTime(e.start)}</div>
        <div class="visit-info">
          <div class="visitor">${e.visitorNameOverride || e.visitorName || e.title}</div>
          <div class="meta">${whoLabel(e)}${e.arrivedAt ? ` · arrivé à ${formatTime(e.arrivedAt)}` : ''}</div>
        </div>
        <div class="visit-actions">
          ${e.arrived
            ? `<button class="secondary" data-action="reset" data-id="${e.id}">Annuler</button>`
            : `<button data-action="arrive" data-id="${e.id}">Faire entrer</button>`}
          <button class="secondary" data-action="toggle_late" data-id="${e.id}">${e.late ? 'Retirer retard' : 'En retard'}</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => checkin(btn.dataset.id, btn.dataset.action));
    });
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Erreur: ${err.message}</div>`;
  }
}

(async () => {
  await ensureSession('gatekeeper');
  render();
  setInterval(render, 20000);
})();
