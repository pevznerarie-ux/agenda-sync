const express = require('express');
const config = require('../config');
const db = require('../db');
const googleAuth = require('../googleAuth');
const calendarSvc = require('../calendar');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth);
router.use(express.json());

router.get('/today', async (req, res) => {
  try {
    const agenda = await calendarSvc.getMergedAgenda(req.query.date);
    res.json(agenda);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/directors-status', (req, res) => {
  res.json({ directors: googleAuth.connectionStatus(), room: config.room });
});

// Marque un visiteur comme entre, en retard, ou remet l'etat a zero.
router.post('/checkin/:eventId', (req, res) => {
  const { eventId } = req.params;
  const { action, visitorName } = req.body || {};

  db.update((data) => {
    const current = data.checkins[eventId] || {};
    if (action === 'arrive') {
      data.checkins[eventId] = {
        ...current,
        status: 'checked_in',
        at: new Date().toISOString(),
        visitorName: visitorName || current.visitorName,
      };
    } else if (action === 'toggle_late') {
      data.checkins[eventId] = { ...current, late: !current.late };
    } else if (action === 'reset') {
      delete data.checkins[eventId];
    }
  });

  res.json({ ok: true, checkin: db.load().checkins[eventId] || null });
});

router.post('/room-booking', async (req, res) => {
  const { startIso, endIso, purpose, visitorName } = req.body || {};
  if (!startIso || !endIso) {
    return res.status(400).json({ error: 'startIso et endIso sont requis.' });
  }
  try {
    const event = await calendarSvc.createRoomBooking({
      startIso,
      endIso,
      purpose,
      visitorName,
      requestedBy: req.session.role,
    });
    res.json({ ok: true, event });
  } catch (err) {
    res.status(err.code === 'CONFLICT' ? 409 : 500).json({ error: err.message });
  }
});

module.exports = router;
