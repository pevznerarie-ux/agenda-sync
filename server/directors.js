// Source de verite pour les profils (directeurs, intendance, surveillance...).
// Contrairement a la config Google/SMTP qui reste dans .env, la liste des
// profils vit dans data/db.json pour pouvoir etre geree en direct depuis
// /admin.html (ajout/suppression/reinitialisation de code) sans redeploiement.
// Au tout premier demarrage, elle est amorcee depuis les DIRECTOR_N_* de .env.
const config = require('./config');
const db = require('./db');
const { hashPin, verifyPin } = require('./pinCrypto');

const ID_PATTERN = /^[a-z0-9-]+$/;

function seedIfNeeded() {
  // Se reamorce depuis .env tant que la liste est vide : une liste vide ne
  // sert jamais a rien (meme l'admin ne pourrait plus se connecter), donc il
  // n'existe pas de scenario legitime a preserver ici. Ca permet aussi de
  // corriger un premier demarrage fait sans les DIRECTOR_N_* en ajoutant les
  // variables puis en redemarrant, sans avoir a purger data/db.json a la main.
  if (list().length > 0) return;

  db.update((d) => {
    d.directors = config.envDirectors.map((env) => ({
      id: env.id,
      name: env.name,
      role: env.role,
      email: env.email,
      isAdmin: env.isAdmin,
      pinHash: env.pin ? hashPin(env.pin) : null,
      createdAt: new Date().toISOString(),
    }));
  });
}

function list() {
  return db.load().directors || [];
}

function publicList() {
  return list().map(({ id, name, role }) => ({ id, name, role }));
}

function findById(id) {
  return list().find((d) => d.id === id);
}

function add({ id, name, role, email, pin, isAdmin }) {
  if (!id || !ID_PATTERN.test(id)) {
    throw new Error('Identifiant invalide (lettres minuscules, chiffres, tirets uniquement).');
  }
  if (!name) throw new Error('Le nom est requis.');
  if (!pin || String(pin).length < 4) throw new Error('Un code PIN d\'au moins 4 caracteres est requis.');
  if (findById(id)) throw new Error('Cet identifiant existe deja.');

  db.update((data) => {
    data.directors.push({
      id,
      name,
      role: role || '',
      email: email || '',
      isAdmin: Boolean(isAdmin),
      pinHash: hashPin(pin),
      createdAt: new Date().toISOString(),
    });
  });
}

function remove(id) {
  const target = findById(id);
  if (!target) throw new Error('Profil introuvable.');
  db.update((data) => {
    data.directors = data.directors.filter((d) => d.id !== id);
    delete data.tokens[id];
  });
}

function resetPin(id, pin) {
  if (!pin || String(pin).length < 4) throw new Error('Un code PIN d\'au moins 4 caracteres est requis.');
  const data = db.update((d) => {
    const target = d.directors.find((x) => x.id === id);
    if (!target) throw new Error('Profil introuvable.');
    target.pinHash = hashPin(pin);
  });
  return data;
}

function verifyDirectorPin(id, pin) {
  const director = findById(id);
  return Boolean(director) && verifyPin(pin, director.pinHash);
}

module.exports = {
  seedIfNeeded,
  list,
  publicList,
  findById,
  add,
  remove,
  resetPin,
  verifyDirectorPin,
};
