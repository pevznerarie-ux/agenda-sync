// Petites aides partagees par les pages: appel API avec gestion de session,
// et modale de connexion (PIN accueil ou mot de passe directeur).

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

function showLoginModal(defaultRole) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <h2>Connexion requise</h2>
        <div class="field">
          <label>Profil</label>
          <select id="login-role">
            <option value="gatekeeper" ${defaultRole === 'gatekeeper' ? 'selected' : ''}>Accueil / gardien (code PIN)</option>
            <option value="dashboard" ${defaultRole === 'dashboard' ? 'selected' : ''}>Directeur (mot de passe)</option>
          </select>
        </div>
        <div class="field">
          <label>Code</label>
          <input id="login-secret" type="password" autofocus />
        </div>
        <div class="error" id="login-error"></div>
        <button id="login-submit" style="width:100%">Se connecter</button>
      </div>`;
    document.body.appendChild(backdrop);

    const submit = async () => {
      const role = backdrop.querySelector('#login-role').value;
      const secret = backdrop.querySelector('#login-secret').value;
      const errorEl = backdrop.querySelector('#login-error');
      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, secret }),
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
function ensureSession(defaultRole) {
  if (!sessionPromise) {
    sessionPromise = fetch('/auth/session')
      .then((r) => r.json())
      .then((data) => (data.role ? data : showLoginModal(defaultRole)))
      .finally(() => { sessionPromise = null; });
  }
  return sessionPromise;
}
