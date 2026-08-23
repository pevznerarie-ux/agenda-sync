// Hachage simple des codes PIN (scrypt + sel), pour ne jamais stocker les
// codes personnels en clair dans data/db.json (contrairement aux tokens
// Google, un code PIN est un secret que quelqu'un choisit/reutilise).
const crypto = require('crypto');

function hashPin(pin) {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPin(pin, stored) {
  if (!stored || !pin) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(check, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { hashPin, verifyPin };
