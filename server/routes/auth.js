const express = require('express');
const config = require('../config');
const googleAuth = require('../googleAuth');

const router = express.Router();

// --- Connexion des directeurs a Google Calendar ---

router.get('/google/:directorId', (req, res) => {
  const { directorId } = req.params;
  if (!googleAuth.isKnownDirector(directorId)) {
    return res.status(404).send('Directeur inconnu.');
  }
  res.redirect(googleAuth.getAuthUrl(directorId));
});

router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send(`Connexion Google refusee: ${error}`);
  try {
    await googleAuth.handleCallback(code, state);
    res.redirect('/dashboard.html?connected=' + encodeURIComponent(state));
  } catch (err) {
    console.error(err);
    res.status(500).send(`Erreur pendant la connexion Google: ${err.message}`);
  }
});

// --- Connexion simple (PIN accueil / mot de passe tableau de bord) ---

router.post('/login', express.json(), (req, res) => {
  const { role, secret } = req.body || {};
  if (role === 'gatekeeper' && secret === config.gatekeeperPin) {
    req.session.role = 'gatekeeper';
    return res.json({ ok: true, role: 'gatekeeper' });
  }
  if (role === 'dashboard' && secret === config.dashboardPassword) {
    req.session.role = 'dashboard';
    return res.json({ ok: true, role: 'dashboard' });
  }
  res.status(401).json({ ok: false, error: 'Code incorrect.' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/session', (req, res) => {
  res.json({ role: req.session.role || null });
});

function requireAuth(req, res, next) {
  if (!req.session.role) return res.status(401).json({ error: 'Non authentifie.' });
  next();
}

module.exports = { router, requireAuth };
