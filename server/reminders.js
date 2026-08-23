const cron = require('node-cron');
const nodemailer = require('nodemailer');
const config = require('./config');
const db = require('./db');
const directors = require('./directors');
const { getMergedAgenda } = require('./calendar');

let transporter = null;
function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
    });
  }
  return transporter;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

async function sendReminderEmail(director, event) {
  const mailer = getTransporter();
  if (!mailer || !director.email) return;

  const subject = `Rappel: rendez-vous a ${formatTime(event.start)}${event.visitorName ? ` avec ${event.visitorName}` : ''}`;
  const text = [
    `Bonjour ${director.name},`,
    '',
    `Votre rendez-vous "${event.title}" commence a ${formatTime(event.start)}.`,
    event.visitorName ? `Visiteur: ${event.visitorName}` : null,
    event.location ? `Lieu: ${event.location}` : null,
    '',
    "Ceci est une notification automatique du systeme d'agendas CNJ.",
  ].filter(Boolean).join('\n');

  await mailer.sendMail({
    from: config.smtp.from,
    to: director.email,
    subject,
    text,
  });
}

async function tick() {
  try {
    const { events } = await getMergedAgenda();
    const now = Date.now();
    const windowMs = config.reminderMinutesBefore * 60 * 1000;

    for (const event of events) {
      if (event.kind !== 'appointment') continue;
      const director = directors.findById(event.directorId);
      if (!director || !director.email) continue;

      const minutesUntilStart = new Date(event.start) - now;
      const dueSoon = minutesUntilStart <= windowMs && minutesUntilStart > windowMs - 60 * 1000;
      if (!dueSoon) continue;

      const key = `${director.id}:${event.id}`;
      const data = db.load();
      if (data.remindersSent[key]) continue;

      await sendReminderEmail(director, event);
      db.update((d) => {
        d.remindersSent[key] = new Date().toISOString();
      });
      console.log(`Rappel envoye a ${director.name} pour "${event.title}"`);
    }
  } catch (err) {
    console.error('Erreur pendant le job de rappels:', err.message);
  }
}

function start() {
  if (!config.smtp.host) {
    console.warn('SMTP non configure: les emails de rappel sont desactives (voir .env).');
  }
  // Toutes les minutes: assez frequent pour un rappel a la minute pres, sans
  // solliciter l'API Google en continu.
  cron.schedule('* * * * *', tick);
  console.log(`Rappels par email actifs (${config.reminderMinutesBefore} min avant chaque rendez-vous).`);
}

module.exports = { start, tick };
