// Donnees de demonstration (DEMO_MODE=true dans .env) : permet de visualiser
// le tableau de bord et le poste d'accueil sans avoir connecte de vrais
// comptes Google. Les horaires sont calcules par rapport a "maintenant" pour
// toujours montrer un rendez-vous en cours, un a venir et un termine.
// 10 entrees pour couvrir jusqu'a 5 profils sans repetition (2 chacun).
const SAMPLE_VISITS = [
  { offsetMin: -95, durationMin: 30, title: 'Entretien inscription', visitorName: 'Famille Amsellem' },
  { offsetMin: -60, durationMin: 20, title: 'Reunion pedagogique', visitorName: 'Famille Toledano' },
  { offsetMin: -25, durationMin: 25, title: 'Suivi scolaire', visitorName: 'Famille Journo' },
  { offsetMin: -10, durationMin: 30, title: 'Entretien individuel', visitorName: 'Famille Sebbag' },
  { offsetMin: 15, durationMin: 20, title: 'Visite parent-professeur', visitorName: 'Famille Cohen-Levy' },
  { offsetMin: 40, durationMin: 30, title: 'Point administratif', visitorName: 'Famille Berdah' },
  { offsetMin: 70, durationMin: 20, title: 'Entretien inscription', visitorName: 'Famille Azoulay' },
  { offsetMin: 100, durationMin: 25, title: 'Reunion de suivi', visitorName: 'Famille Chetrit' },
  { offsetMin: 130, durationMin: 30, title: 'Visite des locaux', visitorName: 'Famille Malka' },
  { offsetMin: 160, durationMin: 20, title: 'Entretien individuel', visitorName: 'Famille Attia' },
];

function buildEvent(director, sample, index) {
  const start = new Date(Date.now() + sample.offsetMin * 60000);
  const end = new Date(start.getTime() + sample.durationMin * 60000);
  return {
    id: `demo-${director.id}-${index}`,
    kind: 'appointment',
    directorId: director.id,
    directorName: director.name,
    title: sample.title,
    visitorName: sample.visitorName,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
    location: '',
    description: '(Rendez-vous de demonstration - DEMO_MODE)',
    htmlLink: '#',
  };
}

// Deux rendez-vous de demo par profil, choisis dans SAMPLE_VISITS sans
// repetition pour les 5 premiers profils (2 x 5 = les 10 entrees).
function eventsForDirector(director, directorIndex) {
  const n = SAMPLE_VISITS.length;
  const a = SAMPLE_VISITS[(directorIndex * 2) % n];
  const b = SAMPLE_VISITS[(directorIndex * 2 + 1) % n];
  return [buildEvent(director, a, 0), buildEvent(director, b, 1)];
}

function roomEvent(roomName) {
  const start = new Date(Date.now() + 50 * 60000);
  const end = new Date(start.getTime() + 30 * 60000);
  return {
    id: 'demo-room-1',
    kind: 'room_visit',
    directorId: null,
    directorName: roomName,
    title: 'Visite de la salle de reception',
    visitorName: 'Famille Perez',
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
    location: roomName,
    description: '(Reservation de demonstration - DEMO_MODE)',
    htmlLink: '#',
  };
}

module.exports = { eventsForDirector, roomEvent };
