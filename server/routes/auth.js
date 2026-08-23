const express = require('express');
const config = require('../config');
const googleAuth = require('../googleAuth');
const directors = require('../directors');

const router = express.Router();

// --- Connexion des profils a Google Calendar ---

router.get('/google/:directorId', (req, res) => {
  const { directorId } = req.params;
  if (!googleAuth.isKnownDirector(directorId)) {
    return res.status(404).send('Profil inconnu.');
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

// --- Connexion aux interfaces internes (code PIN gardien / code personnel) ---

router.post('/login', express.json(), (req, res) => {
  const { mode, directorId, secret } = req.body || {};

  if (mode === 'gatekeeper' && secret === config.gatekeeperPin) {
    req.session.role = 'gatekeeper';
    req.session.directorId = null;
    req.session.isAdmin = false;
    return res.json({ ok: true, role: 'gatekeeper' });
  }

  if (mode === 'director') {
    const director = directors.findById(directorId);
    if (director && directors.verifyDirectorPin(directorId, secret)) {
      req.session.role = 'dashboard';
      req.session.directorId = director.id;
      req.session.isAdmin = Boolean(director.isAdmin);
      return res.json({
        ok: true,
        role: 'dashboard',
        directorId: director.id,
        name: director.name,
        isAdmin: req.session.isAdmin,
      });
    }
  }

  res.status(401).json({ ok: false, error: 'Code incorrect.' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/session', (req, res) => {
  if (!req.session.role) return res.json({ role: null });
  res.json({
    role: req.session.role,
    directorId: req.session.directorId || null,
    isAdmin: Boolean(req.session.isAdmin),
  });
});

function requireAuth(req, res, next) {
  if (!req.session.role) return res.status(401).json({ error: 'Non authentifie.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Reserve a l'administrateur." });
  next();
}

module.exports = { router, requireAuth, requireAdmin };
