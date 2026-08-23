const deniedEl = document.getElementById('admin-denied');
const contentEl = document.getElementById('admin-content');
const body = document.getElementById('directors-body');
const addForm = document.getElementById('add-form');
const addMessage = document.getElementById('add-message');

async function loadDirectors() {
  try {
    const { directors } = await apiFetch('/api/admin/directors');
    body.innerHTML = directors.map((d) => `
      <tr>
        <td>${d.name}</td>
        <td>${d.role || '—'}</td>
        <td>${d.googleConnected ? '<span class="badge arrived">Connecté</span>' : '<span class="badge late">Non connecté</span>'}</td>
        <td>${d.isAdmin ? '<span class="badge in_progress">Admin</span>' : ''}</td>
        <td style="white-space:nowrap">
          <button class="secondary" data-action="reset-pin" data-id="${d.id}">Réinitialiser le code</button>
          <button class="secondary" data-action="delete" data-id="${d.id}">Supprimer</button>
        </td>
      </tr>
    `).join('');

    body.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer ce profil ? Son historique de connexion Google sera aussi effacé.`)) return;
        try {
          await apiFetch(`/api/admin/directors/${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
          loadDirectors();
        } catch (err) {
          alert(err.message);
        }
      });
    });

    body.querySelectorAll('button[data-action="reset-pin"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pin = prompt('Nouveau code PIN (4 caractères minimum) :');
        if (!pin) return;
        try {
          await apiFetch(`/api/admin/directors/${encodeURIComponent(btn.dataset.id)}/reset-pin`, {
            method: 'POST',
            body: JSON.stringify({ pin }),
          });
          alert('Code mis à jour.');
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5">Erreur: ${err.message}</td></tr>`;
  }
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addMessage.textContent = '';
  try {
    await apiFetch('/api/admin/directors', {
      method: 'POST',
      body: JSON.stringify({
        id: document.getElementById('add-id').value.trim(),
        name: document.getElementById('add-name').value.trim(),
        role: document.getElementById('add-role').value.trim(),
        email: document.getElementById('add-email').value.trim(),
        pin: document.getElementById('add-pin').value,
        isAdmin: document.getElementById('add-admin').checked,
      }),
    });
    addForm.reset();
    addMessage.style.color = 'var(--green)';
    addMessage.textContent = 'Profil ajouté.';
    loadDirectors();
  } catch (err) {
    addMessage.style.color = 'var(--red)';
    addMessage.textContent = err.message;
  }
});

(async () => {
  const session = await ensureSession('director');
  if (!session.isAdmin) {
    deniedEl.style.display = '';
    return;
  }
  contentEl.style.display = '';
  loadDirectors();
})();
