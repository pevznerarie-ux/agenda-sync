function initials(name) {
  return name
    .replace(/^(M\.|Mme|Mlle|Dr)\s+/i, '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

async function renderDirectors() {
  const grid = document.getElementById('directors-grid');
  try {
    const { needsSetup } = await fetch('/api/public/setup-status').then((r) => r.json());
    if (needsSetup) {
      window.location.href = 'setup.html';
      return;
    }

    const res = await fetch('/api/public/directors');
    const directors = await res.json();

    if (!directors.length) {
      grid.innerHTML = '<p class="empty-state">Aucun profil configuré pour le moment.</p>';
      return;
    }

    grid.innerHTML = directors.map((d) => `
      <div class="portal-card">
        <div class="avatar">${initials(d.name)}</div>
        <div class="portal-name">${d.name}</div>
        ${d.role ? `<div class="portal-role">${d.role}</div>` : ''}
        <div class="portal-actions">
          <a class="btn" href="/auth/google/${encodeURIComponent(d.id)}">Connecter Google</a>
          <a class="btn secondary" href="dashboard.html">Voir l'agenda</a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Impossible de charger la direction : ${err.message}</p>`;
  }
}

renderDirectors();
