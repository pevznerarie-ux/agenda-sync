const datePicker = document.getElementById('date-picker');
const today = new Date().toISOString().slice(0, 10);
datePicker.value = today;

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function statusBadge(event) {
  const badges = [];
  const label = { a_venir: 'À venir', en_cours: 'En cours', termine: 'Terminé' }[event.timeStatus];
  const cls = { a_venir: 'upcoming', en_cours: 'in_progress', termine: 'done' }[event.timeStatus];
  badges.push(`<span class="badge ${cls}">${label}</span>`);
  if (event.arrived) badges.push('<span class="badge arrived">Arrivé</span>');
  if (event.late) badges.push('<span class="badge late">En retard</span>');
  return badges.join(' ');
}

async function loadDirectorsStatus() {
  const el = document.getElementById('directors-status');
  try {
    const { directors } = await apiFetch('/api/directors-status');
    el.innerHTML = directors.map((d) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
        <div>
          <strong>${d.name}</strong>
          ${d.connected
            ? `<span class="badge arrived">Connecté</span>`
            : `<span class="badge late">Non connecté</span>`}
        </div>
        ${d.connected ? '' : `<a class="btn" href="/auth/google/${encodeURIComponent(d.id)}">Connecter le compte Google</a>`}
      </div>
    `).join('');
  } catch (err) {
    el.textContent = `Erreur: ${err.message}`;
  }
}

async function loadAgenda() {
  const tbody = document.getElementById('agenda-body');
  const empty = document.getElementById('agenda-empty');
  try {
    const { events } = await apiFetch(`/api/today?date=${datePicker.value}`);
    empty.style.display = events.length ? 'none' : 'block';
    tbody.innerHTML = events.map((e) => `
      <tr>
        <td>${formatTime(e.start)}</td>
        <td>${e.kind === 'room_visit' ? '<span class="badge room">Salle</span>' : e.directorName}</td>
        <td>${e.title}</td>
        <td>${e.visitorNameOverride || e.visitorName || '—'}</td>
        <td>${statusBadge(e)}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Erreur: ${err.message}</td></tr>`;
  }
}

datePicker.addEventListener('change', loadAgenda);

(async () => {
  await ensureSession('dashboard');
  loadDirectorsStatus();
  loadAgenda();
  setInterval(loadAgenda, 30000);
})();
