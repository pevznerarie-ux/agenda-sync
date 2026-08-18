const { google } = require('googleapis');
const config = require('./config');
const db = require('./db');

function isKnownDirector(directorId) {
  return config.directors.some((d) => d.id === directorId);
}

function newOAuthClient() {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri,
  );
}

// Etape 1: URL vers laquelle rediriger le directeur pour qu'il connecte son
// compte Google. `state` porte l'identifiant du directeur pour qu'on sache,
// au retour, a qui appartient le token.
function getAuthUrl(directorId) {
  if (!isKnownDirector(directorId)) throw new Error(`Directeur inconnu: ${directorId}`);
  const client = newOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force le renvoi d'un refresh_token a chaque connexion
    scope: config.google.scopes,
    state: directorId,
  });
}

// Etape 2: echange du code contre des tokens, sauvegarde du refresh_token.
async function handleCallback(code, directorId) {
  if (!isKnownDirector(directorId)) throw new Error(`Directeur inconnu: ${directorId}`);
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google n'a pas renvoye de refresh_token. Revoquez l'acces existant sur " +
      "myaccount.google.com/permissions puis reessayez (Google ne renvoie un " +
      'refresh_token que lors du tout premier consentement).',
    );
  }
  db.update((data) => {
    data.tokens[directorId] = {
      refresh_token: tokens.refresh_token,
      connected_at: new Date().toISOString(),
    };
  });
}

// Client Google authentifie pour un directeur donne, ou null s'il n'a pas
// encore connecte son compte.
function getAuthorizedClient(directorId) {
  const data = db.load();
  const record = data.tokens[directorId];
  if (!record) return null;
  const client = newOAuthClient();
  client.setCredentials({ refresh_token: record.refresh_token });
  return client;
}

function connectionStatus() {
  const data = db.load();
  return config.directors.map((d) => ({
    id: d.id,
    name: d.name,
    connected: Boolean(data.tokens[d.id]),
    connectedAt: data.tokens[d.id] ? data.tokens[d.id].connected_at : null,
  }));
}

module.exports = { getAuthUrl, handleCallback, getAuthorizedClient, connectionStatus, isKnownDirector };
