const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const directors = require('./directors');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const reminders = require('./reminders');

directors.seedIfNeeded();

const app = express();

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 12 * 60 * 60 * 1000 }, // 12h, une journee d'accueil
}));

// Identite publique des directeurs (nom/role/lien de connexion), sans statut
// de connexion ni aucune autre donnee sensible : sert a afficher la page
// d'accueil sans authentification prealable.
app.get('/api/public/directors', (req, res) => {
  res.json(directors.publicList());
});

// Assistant de premier demarrage (/setup.html) : tant qu'aucun profil
// n'existe, personne ne peut se connecter, donc ces deux routes ne
// demandent pas d'authentification. Elles se desactivent d'elles-memes des
// qu'un seul profil existe (voir directors.bulkCreate).
app.get('/api/public/setup-status', (req, res) => {
  res.json({ needsSetup: directors.needsSetup() });
});

app.post('/api/public/setup', express.json(), (req, res) => {
  if (!directors.needsSetup()) {
    return res.status(403).json({ error: 'Des profils existent deja, utilisez /admin.html.' });
  }
  try {
    directors.bulkCreate((req.body || {}).directors);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use('/auth', authRoutes.router);
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(config.port, () => {
  console.log(`agenda-sync demarre sur ${config.baseUrl}`);
  if (directors.list().length === 0) {
    console.warn('Aucun profil configure. Ajoutez DIRECTOR_1_* dans .env avant le tout premier demarrage, ou utilisez /admin.html.');
  }
  reminders.start();
});
