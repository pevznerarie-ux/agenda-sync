const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const reminders = require('./reminders');

const app = express();

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 12 * 60 * 60 * 1000 }, // 12h, une journee d'accueil
}));

app.use('/auth', authRoutes.router);
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(config.port, () => {
  console.log(`agenda-sync demarre sur ${config.baseUrl}`);
  if (config.directors.length < 3) {
    console.warn('Moins de 3 directeurs configures dans .env (DIRECTOR_1_*, DIRECTOR_2_*, DIRECTOR_3_*).');
  }
  reminders.start();
});
