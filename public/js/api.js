// Petites aides partagees par les pages: appel API avec gestion de session,
// et modale de connexion (PIN accueil, ou profil personnel + code).

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (res.status === 401) {
    await ensureSession();
    return apiFetch(url, options);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

async function showLoginModal(defaultMode) {
  const directors = await fetch('/api/public/directors').then((r) => r.json()).catch(() => []);

  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <h2>Connexion requise</h2>
        <div class="field">
          <label>Profil</label>
          <select id="login-mode">
            <option value="gatekeeper" ${defaultMode === 'gatekeeper' ? 'selected' : ''}>Accueil / gardien</option>
            <option value="director" ${defaultMode !== 'gatekeeper' ? 'selected' : ''}>Membre de la direction</option>
          </select>
        </div>
        <div class="field" id="login-director-field">
          <label>Qui êtes-vous ?</label>
          <select id="login-director">
            ${directors.map((d) => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Code PIN</label>
          <input id="login-secret" type="password" autofocus />
        </div>
        <div class="error" id="login-error"></div>
        <button id="login-submit" style="width:100%">Se connecter</button>
      </div>`;
    document.body.appendChild(backdrop);

    const modeSelect = backdrop.querySelector('#login-mode');
    const directorField = backdrop.querySelector('#login-director-field');
    const syncDirectorField = () => {
      directorField.style.display = modeSelect.value === 'director' ? '' : 'none';
    };
    modeSelect.addEventListener('change', syncDirectorField);
    syncDirectorField();

    const submit = async () => {
      const mode = modeSelect.value;
      const directorId = backdrop.querySelector('#login-director').value;
      const secret = backdrop.querySelector('#login-secret').value;
      const errorEl = backdrop.querySelector('#login-error');
      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, directorId, secret }),
        });
        if (!res.ok) throw new Error('Code incorrect.');
        document.body.removeChild(backdrop);
        resolve(await res.json());
      } catch (err) {
        errorEl.textContent = err.message;
      }
    };

    backdrop.querySelector('#login-submit').addEventListener('click', submit);
    backdrop.querySelector('#login-secret').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  });
}

let sessionPromise = null;
function ensureSession(defaultMode) {
  if (!sessionPromise) {
    sessionPromise = fetch('/api/public/setup-status')
      .then((r) => r.json())
      .then(({ needsSetup }) => {
        if (needsSetup && !window.location.pathname.endsWith('setup.html')) {
          window.location.href = 'setup.html';
          return new Promise(() => {}); // la page quitte avant que ça compte
        }
        return fetch('/auth/session')
          .then((r) => r.json())
          .then((data) => (data.role ? data : showLoginModal(defaultMode)));
      })
      .finally(() => { sessionPromise = null; });
  }
  return sessionPromise;
}
