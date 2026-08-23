require('dotenv').config();

function director(index) {
  const id = process.env[`DIRECTOR_${index}_ID`];
  if (!id) return null;
  return {
    id,
    name: process.env[`DIRECTOR_${index}_NAME`] || id,
    role: process.env[`DIRECTOR_${index}_ROLE`] || '',
    email: process.env[`DIRECTOR_${index}_EMAIL`] || '',
  };
}

// Jusqu'a 20 profils (DIRECTOR_1_* ... DIRECTOR_20_*) : ecole primaire, college/
// lycee, direction generale, intendance... on peut en ajouter sans toucher au code.
const MAX_DIRECTORS = 20;
const directors = Array.from({ length: MAX_DIRECTORS }, (_, i) => director(i + 1)).filter(Boolean);

module.exports = {
  port: Number(process.env.PORT || 3000),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/google/callback`,
    scopes: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
  },

  directors,

  room: {
    calendarId: process.env.ROOM_CALENDAR_ID || '',
    name: process.env.ROOM_CALENDAR_NAME || 'Salle de visite',
    ownerDirectorId: process.env.ROOM_OWNER_DIRECTOR_ID || (directors[0] && directors[0].id),
  },

  gatekeeperPin: process.env.GATEKEEPER_PIN || '1234',
  dashboardPassword: process.env.DASHBOARD_PASSWORD || 'changeme',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'Accueil <accueil@exemple.org>',
  },

  reminderMinutesBefore: Number(process.env.REMINDER_MINUTES_BEFORE || 10),
};
