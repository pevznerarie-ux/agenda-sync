// Profils par defaut proposes par l'assistant (modifiables avant creation).
const DEFAULT_DIRECTORS = [
  { id: 'atlan', name: 'Yohan Atlan', role: 'Directeur du Primaire', email: 'atlan@exemple.org', pin: '4127', isAdmin: false },
  { id: 'nemni', name: 'Simha Nemni', role: 'Direction du College/Lycee', email: 'nemni@exemple.org', pin: '8563', isAdmin: false },
  { id: 'cohen', name: 'Moche Cohen', role: 'Intendant', email: 'cohen@exemple.org', pin: '2940', isAdmin: false },
  { id: 'surveillance-college-lycee', name: 'Surveillance College Lycee', role: '', email: 'surveillance@exemple.org', pin: '7305', isAdmin: false },
  { id: 'rav-arie', name: 'Rav Arie', role: 'Direction generale', email: 'arie@exemple.org', pin: '9481', isAdmin: true },
];

const rowsEl = document.getElementById('setup-rows');
const alreadyDoneEl = document.getElementById('already-done');
const contentEl = document.getElementById('setup-content');
const messageEl = document.getElementById('setup-message');

function renderRows() {
  rowsEl.innerHTML = DEFAULT_DIRECTORS.map((d, i) => `
    <tr>
      <td>
        <input data-field="name" data-index="${i}" value="${d.name}" style="min-width:160px" />
        ${d.isAdmin ? '<div class="portal-role">Administrateur</div>' : ''}
      </td>
      <td><input data-field="role" data-index="${i}" value="${d.role}" style="min-width:160px" /></td>
      <td><input data-field="pin" data-index="${i}" value="${d.pin}" style="width:90px" minlength="4" required /></td>
    </tr>
  `).join('');

  rowsEl.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      const i = Number(input.dataset.index);
      DEFAULT_DIRECTORS[i][input.dataset.field] = input.value;
    });
  });
}

document.getElementById('setup-submit').addEventListener('click', async () => {
  messageEl.textContent = '';
  try {
    const res = await fetch('/api/public/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directors: DEFAULT_DIRECTORS }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Erreur inconnue.');
    messageEl.style.color = 'var(--green)';
    messageEl.textContent = 'Profils créés ! Redirection…';
    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
  } catch (err) {
    messageEl.style.color = 'var(--red)';
    messageEl.textContent = err.message;
  }
});

(async () => {
  try {
    const { needsSetup } = await fetch('/api/public/setup-status').then((r) => r.json());
    if (!needsSetup) {
      contentEl.style.display = 'none';
      alreadyDoneEl.style.display = '';
      return;
    }
    renderRows();
  } catch (err) {
    messageEl.style.color = 'var(--red)';
    messageEl.textContent = `Erreur: ${err.message}`;
  }
})();
