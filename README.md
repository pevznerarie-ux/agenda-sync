# Agenda Sync — CNJ

Système reliant les agendas Google de la direction — Yohan Atlan (Primaire),
Simha Nemni (Collège/Lycée), Moché Cohen (Intendance), la Surveillance du
Collège/Lycée et Rav Arie (Direction générale) — avec un poste d'accueil
pour le gardien (check-in des visiteurs, retards) et une réservation de
créneaux pour les visites de la salle de réception. La liste des profils
est configurable dans `.env` (`DIRECTOR_1_*` à `DIRECTOR_N_*`) : on peut en
ajouter ou en retirer sans toucher au code.

## Fonctionnalités

- **Connexion Google Calendar** de chaque profil (OAuth2, lecture des
  rendez-vous du jour sur le calendrier principal de chacun), directement
  depuis sa carte sur la page d'accueil.
- **Tableau de bord** (`/dashboard.html`) : agenda fusionné de toute la
  direction pour une date donnée, statut de connexion de chaque compte.
- **Poste d'accueil** (`/gatekeeper.html`) : vue tablette, gros boutons,
  liste des rendez-vous du jour triés par heure, avec "Faire entrer" et
  "En retard" pour chaque visiteur.
- **Visite de salle** (`/room-booking.html`) : réservation d'un créneau sur
  un calendrier Google dédié à la salle, avec détection des conflits.
- **Rappels par email** : un email est envoyé au directeur concerné N
  minutes avant chaque rendez-vous (`REMINDER_MINUTES_BEFORE`). Les rappels
  natifs de Google Calendar (popup/email configurés directement dans
  Google Agenda par chaque directeur) continuent de fonctionner en plus,
  sans rien à coder.
- **Connexion individuelle** : chaque profil a son propre code PIN
  (haché, jamais stocké en clair). Un profil marqué administrateur peut
  ajouter, supprimer ou réinitialiser le code d'un autre profil depuis
  `/admin.html`, sans toucher au code ni redéployer.

## Architecture

Application Node.js/Express autonome (aucune dépendance avec le site
vitrine CNJ Events à la racine du dépôt). Stockage local en JSON
(`data/db.json`, non versionné) pour les statuts d'accueil (arrivé/en
retard) et l'historique des réservations de salle — les rendez-vous
eux-mêmes restent toujours la propriété de Google Calendar, cette app ne
fait que lire/écrire dessus via l'API.

```
server/    logique serveur (auth Google, API, rappels)
public/    pages HTML/CSS/JS servies telles quelles
data/      stockage JSON local (créé automatiquement, ignoré par git)
```

## Mise en route

### 1. Créer les identifiants Google

1. Dans [Google Cloud Console](https://console.cloud.google.com), créez un
   projet (ou réutilisez-en un) et activez l'**API Google Calendar**.
2. Configurez l'écran de consentement OAuth (type "Externe" suffit si les 3
   comptes sont ajoutés comme testeurs, ou "Interne" si vous êtes sur un
   Google Workspace).
3. Créez un identifiant **OAuth 2.0 - Application Web**, avec comme URI de
   redirection autorisée : `http://localhost:3000/auth/google/callback`
   (remplacez par votre vrai domaine en production).
4. Copiez `.env.example` en `.env` et renseignez `GOOGLE_CLIENT_ID` et
   `GOOGLE_CLIENT_SECRET`.

### 2. Configurer les profils de la direction (premier démarrage uniquement)

Dans `.env`, un bloc `DIRECTOR_N_*` par personne (`DIRECTOR_1_*`,
`DIRECTOR_2_*`, ...) : identifiant technique, nom affiché, rôle, email pour
les rappels, et un `_PIN` (code personnel de connexion). Marquez
`DIRECTOR_N_ADMIN=true` sur le profil qui doit pouvoir gérer les autres
comptes (Rav Arie par défaut).

⚠️ Ces variables ne servent qu'à **amorcer** la liste au tout premier
démarrage (quand `data/db.json` n'existe pas encore). Une fois l'app
lancée une première fois, la liste réelle vit dans `data/db.json` et se
gère depuis `/admin.html` — modifier `.env` ensuite n'a plus d'effet.

### 3. (Optionnel) Calendrier de la salle de visite

1. Créez un calendrier Google dédié, par ex. "Salle de visite CNJ".
2. Partagez-le avec le compte Google de la personne désignée comme
   `ROOM_OWNER_DIRECTOR_ID` (droit "Apporter des modifications aux
   événements").
3. Récupérez son ID (Paramètres du calendrier → Intégrer l'agenda → ID du
   calendrier) et renseignez `ROOM_CALENDAR_ID`.

Si cette section n'est pas configurée, la fonctionnalité de visite de
salle est simplement désactivée — le reste de l'app fonctionne normalement.

### 4. Rappels email (optionnel mais recommandé)

Renseignez `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`,
`SMTP_FROM`. Pour Gmail, utilisez un [mot de passe
d'application](https://myaccount.google.com/apppasswords) plutôt que le mot
de passe du compte.

### 5. Codes d'accès internes

`GATEKEEPER_PIN` est un code partagé pour le poste d'accueil (le gardien
n'a pas de compte personnel). Chaque membre de la direction a son propre
code (`DIRECTOR_N_PIN`) — changez tous ces codes par défaut avant tout
déploiement, et redemandez à l'admin (Rav Arie) de les réinitialiser
depuis `/admin.html` si besoin après coup.

### 6. Lancer

```bash
cd agenda-sync
npm install
npm run dev      # ou: npm start
```

Ouvrez `http://localhost:3000`. Chaque personne connecte son compte Google
directement depuis sa carte sur la page d'accueil, sans mot de passe
requis pour cette étape (l'authentification se fait auprès de Google).

## Déploiement

- Nécessite un hébergement avec **disque persistant** (pour `data/db.json`
  et les tokens Google) et une **URL HTTPS stable** (Google exige une URI
  de redirection en `https://` en production — mettez à jour `BASE_URL` et
  l'URI de redirection autorisée dans Google Cloud Console en conséquence).
- Convient à un petit VPS, Render, Railway ou équivalent. Une seule
  instance à la fois (le stockage JSON n'est pas conçu pour plusieurs
  processus en parallèle).

## Limites connues / pistes d'amélioration

- Les tokens Google sont stockés **en clair** dans `data/db.json` pour
  simplifier ce premier MVP. Avant d'y faire transiter des données sur de
  vrais visiteurs/élèves, chiffrer ce fichier au repos ou migrer vers un
  vrai gestionnaire de secrets est recommandé.
- Détection du nom du visiteur : lue depuis une propriété `visitorName` sur
  l'événement Google (si posée manuellement) ou depuis le premier invité de
  l'événement. À la création d'un rendez-vous, indiquer le nom du visiteur
  en invité ou dans le titre facilite le travail de l'accueil.
- Rappels actuellement uniquement par email. Passage à SMS/notification
  push (ex. Twilio) possible en ajoutant un module à côté de
  `server/reminders.js`.
- Un seul créneau/salle géré. Extensible à plusieurs salles en dupliquant
  la logique `ROOM_CALENDAR_ID` pour une liste de salles.
