// Stockage simple en JSON sur disque. Suffisant pour le volume d'un accueil
// d'ecole (quelques dizaines d'evenements/jour). A remplacer par une vraie
// base de donnees si le systeme grandit ou si plusieurs instances tournent
// en parallele.
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

const DEFAULT_DATA = {
  // directorId -> { refresh_token, connected_at, email_used }
  tokens: {},
  // eventId -> { status: 'checked_in' | 'late', visitorName, at, directorId }
  checkins: {},
  // reminder key ("directorId:eventId") -> ISO timestamp sent
  remindersSent: {},
  // list of room bookings created through this app
  roomBookings: [],
};

function load() {
  if (!fs.existsSync(DB_FILE)) {
    save(DEFAULT_DATA);
    return structuredClone(DEFAULT_DATA);
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  try {
    return { ...structuredClone(DEFAULT_DATA), ...JSON.parse(raw) };
  } catch (err) {
    console.error('db.json illisible, reinitialisation', err);
    save(DEFAULT_DATA);
    return structuredClone(DEFAULT_DATA);
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, DB_FILE);
}

// Toutes les operations passent par ces deux helpers pour rester coherentes
// meme en cas d'ecritures rapprochees (pas de vraie concurrence attendue ici).
function update(mutator) {
  const data = load();
  mutator(data);
  save(data);
  return data;
}

module.exports = { load, save, update };
