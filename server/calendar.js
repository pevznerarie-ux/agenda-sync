const { google } = require('googleapis');
const config = require('./config');
const db = require('./db');
const googleAuth = require('./googleAuth');
const directors = require('./directors');

function dayRange(dateStr) {
  const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0);
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

// Devine le nom du visiteur depuis les champs Google Calendar disponibles:
// 1) une propriete privee "visitorName" posee explicitement sur l'evenement
// 2) le premier participant invite qui n'est pas le directeur lui-meme
function guessVisitorName(event) {
  const fromProps = event.extendedProperties && event.extendedProperties.private
    && event.extendedProperties.private.visitorName;
  if (fromProps) return fromProps;

  const guest = (event.attendees || []).find((a) => !a.self && !a.organizer);
  if (guest) return guest.displayName || guest.email || '';
  return '';
}

function normalizeEvent(event, director) {
  const start = event.start.dateTime || event.start.date;
  const end = event.end.dateTime || event.end.date;
  return {
    id: event.id,
    kind: 'appointment',
    directorId: director.id,
    directorName: director.name,
    title: event.summary || '(Sans titre)',
    visitorName: guessVisitorName(event),
    start,
    end,
    allDay: !event.start.dateTime,
    location: event.location || '',
    description: event.description || '',
    htmlLink: event.htmlLink,
  };
}

async function fetchDirectorEvents(director, dateStr) {
  const client = googleAuth.getAuthorizedClient(director.id);
  if (!client) return { director, connected: false, events: [] };

  const calendar = google.calendar({ version: 'v3', auth: client });
  const { timeMin, timeMax } = dayRange(dateStr);
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });
  const events = (res.data.items || [])
    .filter((e) => e.status !== 'cancelled')
    .map((e) => normalizeEvent(e, director));
  return { director, connected: true, events };
}

async function fetchRoomEvents(dateStr) {
  if (!config.room.calendarId) return { connected: false, events: [] };
  const ownerClient = googleAuth.getAuthorizedClient(config.room.ownerDirectorId);
  if (!ownerClient) return { connected: false, events: [] };

  const calendar = google.calendar({ version: 'v3', auth: ownerClient });
  const { timeMin, timeMax } = dayRange(dateStr);
  const res = await calendar.events.list({
    calendarId: config.room.calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });
  const events = (res.data.items || [])
    .filter((e) => e.status !== 'cancelled')
    .map((e) => ({
      id: e.id,
      kind: 'room_visit',
      directorId: null,
      directorName: config.room.name,
      title: e.summary || 'Visite de salle',
      visitorName: guessVisitorName(e),
      start: e.start.dateTime || e.start.date,
      end: e.end.dateTime || e.end.date,
      allDay: !e.start.dateTime,
      location: e.location || config.room.name,
      description: e.description || '',
      htmlLink: e.htmlLink,
    }));
  return { connected: true, events };
}

function withLocalStatus(event) {
  const data = db.load();
  const record = data.checkins[event.id];
  const now = new Date();
  const start = new Date(event.start);
  const end = new Date(event.end);

  let timeStatus = 'a_venir';
  if (now > end) timeStatus = 'termine';
  else if (now >= start) timeStatus = 'en_cours';

  return {
    ...event,
    timeStatus,
    arrived: Boolean(record && record.status === 'checked_in'),
    arrivedAt: record && record.status === 'checked_in' ? record.at : null,
    late: Boolean(record && record.late),
    visitorNameOverride: record && record.visitorName ? record.visitorName : null,
  };
}

// Vue fusionnee de la journee: les 3 directeurs + le calendrier de la salle,
// triee chronologiquement, avec le statut d'accueil (arrive/en retard) pour
// chaque rendez-vous.
async function getMergedAgenda(dateStr) {
  const [directorResults, roomResult] = await Promise.all([
    Promise.all(directors.list().map((d) => fetchDirectorEvents(d, dateStr))),
    fetchRoomEvents(dateStr),
  ]);

  const events = [
    ...directorResults.flatMap((r) => r.events),
    ...roomResult.events,
  ]
    .map(withLocalStatus)
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  return {
    events,
    directors: directorResults.map((r) => ({
      id: r.director.id,
      name: r.director.name,
      connected: r.connected,
    })),
    roomConnected: roomResult.connected,
  };
}

async function checkConflict(startIso, endIso) {
  const ownerClient = googleAuth.getAuthorizedClient(config.room.ownerDirectorId);
  if (!ownerClient) throw new Error('Le compte Google du proprietaire de la salle n\'est pas connecte.');
  const calendar = google.calendar({ version: 'v3', auth: ownerClient });
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: startIso,
      timeMax: endIso,
      items: [{ id: config.room.calendarId }],
    },
  });
  const busy = res.data.calendars[config.room.calendarId].busy || [];
  return busy.length > 0;
}

async function createRoomBooking({ startIso, endIso, purpose, visitorName, requestedBy }) {
  if (!config.room.calendarId) throw new Error('ROOM_CALENDAR_ID n\'est pas configure.');
  const conflict = await checkConflict(startIso, endIso);
  if (conflict) {
    const err = new Error('Ce creneau est deja reserve pour la salle.');
    err.code = 'CONFLICT';
    throw err;
  }

  const ownerClient = googleAuth.getAuthorizedClient(config.room.ownerDirectorId);
  const calendar = google.calendar({ version: 'v3', auth: ownerClient });
  const res = await calendar.events.insert({
    calendarId: config.room.calendarId,
    requestBody: {
      summary: purpose || `Visite de salle - ${visitorName || 'visiteur'}`,
      description: `Reserve via l'accueil par: ${requestedBy || 'inconnu'}`,
      start: { dateTime: startIso },
      end: { dateTime: endIso },
      extendedProperties: { private: { visitorName: visitorName || '' } },
    },
  });

  db.update((data) => {
    data.roomBookings.push({
      eventId: res.data.id,
      startIso,
      endIso,
      purpose,
      visitorName,
      requestedBy,
      createdAt: new Date().toISOString(),
    });
  });

  return res.data;
}

module.exports = { getMergedAgenda, createRoomBooking };
