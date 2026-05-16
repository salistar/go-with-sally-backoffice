# Go With Sally

La premiere plateforme VTC exclusivement feminine au Maroc. Des conductrices pour des passageres, en toute securite.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18.0%2B-green)
![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)

---

## Table des matieres

1. [Architecture du projet](#architecture-du-projet)
2. [Stack technique](#stack-technique)
3. [Structure des fichiers](#structure-des-fichiers)
4. [Prerequis](#prerequis)
5. [Configuration (.env)](#configuration-env)
6. [Utilisateurs et mots de passe](#utilisateurs-et-mots-de-passe)
7. [Commandes de lancement](#commandes-de-lancement)
8. [Tests](#tests)
9. [Infrastructure (Terraform / Ansible)](#infrastructure)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Liste des features](#liste-des-features)
12. [Internationalisation (i18n)](#internationalisation)
13. [URLs des services](#urls-des-services)

---

## Architecture du projet

```
                    +------------------+
                    |   Nginx Reverse  |
                    |     Proxy (SSL)  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------+--+   +------+-----+  +-----+------+
     | Web App   |   | Backend API|  | Face AI    |
     | (React)   |   | (Node.js)  |  | (Python)   |
     | Port 3000 |   | Port 5000  |  | Port 8000  |
     +-----------+   +-----+------+  +------------+
                           |
                  +--------+---------+
                  |                  |
           +------+-----+    +------+-----+
           |  MongoDB   |    |   Redis    |
           |  Port 27017|    |  Port 6379 |
           +------------+    +------------+
```

L'application mobile (React Native / Expo) se connecte au Backend API. Elle n'est pas containerisee car elle est deployee via les stores (App Store / Google Play).

---

## Stack technique

**Backend:** Node.js 18+ / Express.js / Socket.IO / Mongoose
**Base de donnees:** MongoDB 7+ avec replica set
**Cache:** Redis 7+
**Face AI:** Python 3.9+ / FastAPI / TensorFlow / PyTorch / YOLO
**Mobile:** React Native / Expo SDK 50+ / TypeScript / Redux
**Web:** HTML5 / CSS3 / JavaScript (vanilla) / Chart.js / Socket.IO
**Infra:** Docker / Docker Compose / Terraform / Ansible
**CI/CD:** GitHub Actions
**Tests:** Playwright (E2E) / Karate (API) / Gatling (Performance) / Mocha+Chai (Unit)
**Monitoring:** Prometheus / ELK Stack (Elasticsearch, Logstash, Kibana)

---

## Structure des fichiers

```
goWithSally/
├── .env                          # Configuration racine (TOUTES les variables)
├── .env.example                  # Template de configuration
├── docker-compose.yml            # Dev: tous les services
├── docker-compose.prod.yml       # Prod: avec limites, replicas, SSL
├── docker-compose.test.yml       # Test: environnement isole
├── .github/workflows/deploy.yml  # CI/CD Pipeline
├── nginx/nginx.prod.conf         # Nginx reverse proxy prod
├── sonar-project.properties      # SonarQube config
│
├── gowithsally-backend/          # API Node.js
│   ├── config/                   # Configuration centralisee (database, winston)
│   ├── controllers/              # Logique metier (18 controllers)
│   │   ├── adminController.js, adminStatsController.js
│   │   ├── authController.js, aiProxyController.js
│   │   ├── badgeController.js, documentController.js
│   │   ├── earningsController.js, gdprController.js
│   │   ├── healthController.js, matchingController.js
│   │   ├── notificationController.js, otpController.js
│   │   ├── paymentController.js, pricingController.js
│   │   ├── pricingEngineController.js, ratingController.js
│   │   ├── rideController.js, tokenController.js
│   │   └── serviceController.js, verificationController.js
│   ├── middleware/                # Auth, RBAC, validation (10 fichiers)
│   │   ├── auth.js, femaleOnly.js, rateLimiter.js
│   │   ├── upload.js, validateObjectId.js, documentCheck.js
│   │   └── admin.middleware.js, roleCheck.js
│   ├── models/                   # Schemas Mongoose (38 modeles)
│   │   ├── User, Driver, Ride, Badge, Vehicle, Wallet
│   │   ├── Payment, Rating, Notification, Complaint
│   │   ├── Document, Consent, BiometricData, RefreshToken
│   │   └── OTP, Message, Conversation + 20 autres
│   ├── routes/                   # Endpoints REST (45+ fichiers)
│   ├── seeds/                    # Donnees de test (fullSeed.js)
│   ├── services/                 # Services (19 fichiers)
│   │   ├── badgeService, earningsService, paymentService
│   │   ├── cmiService, fcmService, infobipService
│   │   ├── matchingService, poolMatchingService
│   │   ├── notificationService, otpService, gdprService
│   │   ├── pricingEngineService, surgePricingService
│   │   ├── ratingService, documentService
│   │   ├── tokenService, encryptionService
│   │   ├── healthCheckService, sentryService
│   │   └── telegramAlertService
│   ├── socket/                   # WebSocket handlers (4 fichiers)
│   │   ├── index.js, chatHandler.js
│   │   ├── rideSocket.js, notificationSocket.js
│   ├── tests/                    # Tests unitaires + integration
│   ├── utils/                    # Utilitaires
│   ├── validators/               # Validation des requetes
│   ├── Dockerfile                # Multi-stage build
│   └── server.js                 # Point d'entree
│
├── gowithsally-mobile/           # App React Native
│   ├── src/
│   │   ├── components/           # Composants reutilisables (40+)
│   │   │   ├── badges/           # BadgeCard, BadgeDetailModal, ProgressBar, Celebration
│   │   │   ├── chat/             # ChatBubble, TypingIndicator, MessageInput
│   │   │   ├── driver/           # RideRequestCard, StatusToggle, AcceptRideModal, Earnings
│   │   │   ├── payment/          # PaymentMethodCard, WalletBalance
│   │   │   ├── pricing/          # PricingBreakdown, ServiceComparator, SurgeIndicator
│   │   │   ├── profile/          # AvatarEditor, UserStats, DriverStats, ReferralSection
│   │   │   ├── ride/             # RideRequestForm, DriverMarkers, RouteTracer, PriceEstimator
│   │   │   ├── security/         # SOSButton, EmergencyContactCard, QRCodeShare
│   │   │   └── common/           # LanguageSwitcher
│   │   ├── config/               # appMode.ts (static/hybrid/prod)
│   │   ├── constants/            # Badges, pricing, services
│   │   ├── context/              # Providers React
│   │   ├── hooks/                # Custom hooks (14 fichiers)
│   │   ├── i18n/                 # Traductions FR/AR/EN
│   │   │   └── locales/          # ar/fr/en.json + sos_*/badges_*/payment_*/notifications_*
│   │   ├── mocks/                # Donnees mock (mode static)
│   │   ├── navigation/           # React Navigation (RootNavigator)
│   │   ├── screens/              # 55+ ecrans
│   │   │   ├── admin/            # 8 ecrans admin
│   │   │   ├── auth/             # 10 ecrans (Login, Register, OTP, Voice, Face)
│   │   │   ├── common/           # 10 ecrans (Chat, SOS, Badges, Privacy, Notifications)
│   │   │   ├── driver/           # 11 ecrans
│   │   │   ├── profile/          # 2 ecrans
│   │   │   ├── user/             # 13 ecrans (Home, Wallet, ChooseOnMap, PaymentMethods)
│   │   │   └── verification/     # 1 ecran
│   │   ├── services/             # API, Socket, Payment, Auth, Voice (15+ fichiers)
│   │   ├── store/slices/         # Redux: auth, ride, badge, chat, payment, pricing, etc.
│   │   ├── types/                # TypeScript types
│   │   └── utils/                # Theme, Toast config
│   ├── .env.static               # Mode hors-ligne
│   ├── .env.hybrid               # Mode hybride
│   ├── .env.production           # Mode production
│   └── App.tsx                   # Point d'entree
│
├── gowithsally-web/              # Interface web admin
│   ├── public/index.html         # SPA complete (HTML/CSS/JS)
│   ├── Dockerfile                # Multi-stage build
│   └── nginx.conf                # Config Nginx dev
│
├── gowithsally-face-api/         # API reconnaissance faciale
│   ├── app/
│   │   ├── main.py               # FastAPI application
│   │   ├── routes/               # verify_voice.py, unified_pipeline.py
│   │   └── services/             # face_count.py, preprocessing.py, voice_analysis.py
│   ├── models/                   # Modeles ML (age, gender, face, voice)
│   ├── scripts/                  # finetune_gender_mena.py, evaluate_gender.py, train_voice
│   ├── test/                     # test_gender.py, test_antispoof.py, test_face_match.py
│   ├── requirements.txt          # Dependencies Python
│   └── Dockerfile                # Multi-stage build
│
├── docker/                       # Dockerfiles production
│   ├── Dockerfile.backend.prod   # Node.js 20 multi-stage optimise
│   └── Dockerfile.faceapi.prod   # PyTorch INT8, Python 3.11
│
├── deploy/                       # Scripts deploiement
│   ├── deploy.sh                 # git pull → build → health check → rollback
│   ├── init-server.sh            # Hetzner CX21 setup (swap 2GB, firewall)
│   └── backup.sh                 # MongoDB backup quotidien
│
├── gowithsally-database/         # Configuration MongoDB
│   ├── init/                     # Scripts d'initialisation
│   ├── scripts/                  # Backup, restore, reset
│   └── Dockerfile                # Image custom MongoDB
│
├── gowithsally-redis/            # Configuration Redis
│   ├── config/redis.conf         # Config Redis
│   └── scripts/                  # Flush, seed cache
│
├── infrastructure/
│   ├── terraform/
│   │   ├── main.tf               # Infrastructure AWS
│   │   ├── variables.tf          # Variables
│   │   ├── outputs.tf            # Outputs
│   │   ├── environments/         # dev.tfvars, staging.tfvars, prod.tfvars
│   │   └── modules/              # networking, compute, database, storage
│   └── ansible/
│       ├── inventory/hosts.yml   # Inventaire serveurs
│       ├── playbooks/            # deploy, setup-server, monitoring, backup
│       └── roles/                # docker, nginx, app, monitoring
│
└── tests/
    ├── unit/                     # Tests unitaires (Mocha/Chai)
    ├── e2e/playwright/           # 11 fichiers de tests E2E
    ├── api/karate/               # 16 feature files API
    ├── performance/gatling/      # 6 simulations de charge
    └── mobile/appium/            # Tests mobile (Appium)
```

---

## Prerequis

**Developpement local (sans Docker):**
- Node.js >= 18.0
- npm >= 9.0
- Python >= 3.9
- MongoDB >= 7.0 (installe localement)
- Redis >= 7.0 (optionnel)
- Git

**Avec Docker:**
- Docker >= 24.0
- Docker Compose >= 2.20
- 8 Go RAM minimum

**Mobile:**
- Node.js >= 18.0
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (pour Android) ou Xcode (pour iOS)
- Expo Go app sur telephone

---

## Configuration (.env)

Toute la configuration est centralisee dans le fichier `.env` a la racine du projet. Aucune valeur sensible n'est hardcodee dans le code source. Les services enfants (backend, database, redis, face-api) heritent automatiquement des variables du `.env` racine via docker-compose.

**Setup initial:**
```bash
cp .env.example .env
# Editer .env avec vos valeurs
```

**Sections du fichier .env:**

| Section | Variables principales |
|---------|---------------------|
| General | `NODE_ENV`, `APP_URL`, `FRONTEND_URL`, `LOG_LEVEL` |
| MongoDB | `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `MONGODB_URI` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_URL` |
| Backend | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRE`, `BCRYPT_ROUNDS` |
| OTP | `OTP_LENGTH`, `OTP_EXPIRE_MINUTES`, `OTP_MAX_ATTEMPTS` |
| Email | `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` |
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Paiements | `STRIPE_SECRET_KEY`, `CMI_STORE_ID`, `CMI_SECRET_KEY` |
| Firebase | `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` |
| Google Maps | `GOOGLE_MAPS_API_KEY` |
| Face AI | `FACE_API_SECRET_KEY`, `FACE_API_PASSWORD`, `FACE_RECOGNITION_THRESHOLD` |
| AI APIs | `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (optionnels) |
| Monitoring | `ENABLE_PROMETHEUS`, `SENTRY_DSN` |
| Seed Data | `SEED_ADMIN_PASSWORD`, `SEED_DRIVER_PASSWORD`, `SEED_USER_PASSWORD` |

---

## Utilisateurs et mots de passe

### Comptes applicatifs (apres seeding avec `npm run seed`)

| Role | Email | Mot de passe | Ville |
|------|-------|-------------|-------|
| **Super Admin** | admin@gowithsally.ma | Admin@2024 | - |
| **Sub-Admin** | subadmin.casa@gowithsally.ma | SubAdmin@2024 | Casablanca |
| **Sub-Admin** | subadmin.rabat@gowithsally.ma | SubAdmin@2024 | Rabat |
| **Conductrice** | fatima.driver@gmail.com | Driver@2024 | Casablanca |
| **Conductrice** | khadija.driver@gmail.com | Driver@2024 | Rabat |
| **Conductrice** | amina.driver@gmail.com | Driver@2024 | Marrakech |
| **Passagere** | sara.user@gmail.com | User@2024 | Casablanca |
| **Passagere** | meryem.user@gmail.com | User@2024 | Rabat |
| **Passagere** | nadia.user@gmail.com | User@2024 | Marrakech |
| **Passagere** | laila.user@gmail.com | User@2024 | Casablanca |
| **Passagere** | zineb.user@gmail.com | User@2024 | Fes |

### Comptes infrastructure

| Service | URL | Utilisateur | Mot de passe |
|---------|-----|-------------|-------------|
| **Mongo Express** | http://localhost:8081 | admin | sally2024 |
| **Redis Commander** | http://localhost:8082 | admin | sally2024 |
| **MongoDB** | mongodb://localhost:27017 | gowithsally_admin | sally_secure_2024 |
| **Redis** | redis://localhost:6379 | - | sally_redis_2024 |
| **Face API** | http://localhost:8000 | (JWT) | sally2024 |
| **Web Admin** | http://localhost:3000 | admin@gowithsally.ma | Admin@2024 |

### OTP de test

En mode `development`, le code OTP est toujours **123456**.

---

## Commandes de lancement

### A. Local SANS Docker

```bash
# 1. Configurer
cp .env.example .env
# Editer .env avec vos valeurs

# 2. Backend (terminal 1)
cd gowithsally-backend
npm install
npm run seed          # Peupler la base
npm run dev           # http://localhost:5000

# 3. Face API (terminal 2)
cd gowithsally-face-api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app/main.py    # http://localhost:8000

# 4. Web (terminal 3)
cd gowithsally-web
npx serve public -l 3000   # http://localhost:3000

# 5. Mobile (terminal 4)
cd gowithsally-mobile
npm install
npx expo start        # Scanner QR avec Expo Go
```

### B. Docker - UNE seule commande

```bash
docker compose up -d && docker compose exec backend npm run seed
```

### C. Docker - Commandes detaillees

```bash
# Construire toutes les images
docker compose build

# Lancer tout
docker compose up -d

# Lancer un service specifique
docker compose up -d mongodb
docker compose up -d mongodb redis backend
docker compose up -d face-api
docker compose up -d web
docker compose up -d mongo-express redis-commander

# Peupler la base
docker compose exec backend npm run seed
docker compose exec backend npm run seed:reset   # Reset + seed

# Logs
docker compose logs -f
docker compose logs -f backend

# Redemarrer / reconstruire
docker compose restart backend
docker compose build --no-cache backend && docker compose up -d backend

# Shell MongoDB
docker compose exec mongodb mongosh -u gowithsally_admin -p sally_secure_2024

# Arreter
docker compose down
docker compose down -v   # + supprimer les volumes
```

### D. Deployer en PRODUCTION

```bash
# 1. Configurer (CHANGER TOUS LES SECRETS !)
cp .env.example .env
# Editer NODE_ENV=production et tous les mots de passe

# 2. Deployer
docker compose -f docker-compose.prod.yml up -d

# 3. Seed (premiere fois)
docker compose -f docker-compose.prod.yml exec backend npm run seed

# 4. Verifier
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f

# 5. Mise a jour zero-downtime
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d --no-deps backend web

# 6. Backup MongoDB
docker compose -f docker-compose.prod.yml exec mongodb \
  mongodump --db gowithsally -u gowithsally_admin -p "$MONGO_ROOT_PASSWORD" --out /backup
```

### E. Terraform + Ansible

```bash
# Provisionner AWS
cd infrastructure/terraform
terraform init
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars

# Deployer avec Ansible
cd ../ansible
ansible-playbook -i inventory/hosts.yml playbooks/setup-server.yml
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml
ansible-playbook -i inventory/hosts.yml playbooks/setup-monitoring.yml
ansible-playbook -i inventory/hosts.yml playbooks/backup.yml
```

### F. App Mobile - 3 modes

```bash
cd gowithsally-mobile

# Mode STATIC (hors-ligne, donnees mock sur le telephone)
cp .env.static .env && npx expo start

# Mode HYBRID (test avec MongoDB + fallback mock)
cp .env.hybrid .env && npx expo start

# Mode PRODUCTION (donnees reelles via API)
cp .env.production .env && npx expo start

# Script de switch rapide
bash scripts/switch-mode.sh static
bash scripts/switch-mode.sh hybrid
bash scripts/switch-mode.sh online
```

---

## Tests

### Tests unitaires (Mocha/Chai)

```bash
cd gowithsally-backend
npm test                  # Tests de base
npm run test:coverage     # Avec rapport de couverture
npm run test:all          # Tout + couverture
```

### Tests E2E (Playwright) - 237+ tests

```bash
cd tests/e2e/playwright
npm install && npx playwright install
npx playwright test                           # Tous les tests
npx playwright test --ui                      # Mode interactif
npx playwright test tests/auth.spec.ts        # Fichier specifique
npx playwright show-report                    # Rapport HTML
```

Fichiers: `landing-page`, `auth`, `admin-dashboard`, `ride-management`, `user-management`, `driver-management`, `i18n-rtl`, `accessibility`, `api-integration`, `performance`, `login`

### Tests API (Karate) - 280+ scenarios

```bash
cd tests/api/karate
./gradlew test
# Ou via Docker:
docker compose -f docker-compose.test.yml run --rm karate-tests
```

Fichiers: `auth`, `users`, `drivers`, `rides`, `admin`, `chat`, `wallet`, `reviews`, `favorites`, `notifications`, `promotions`, `services`, `badges`, `affiliations`, `subscriptions`, `emergency-contacts`

### Tests de performance (Gatling) - 6 simulations

```bash
cd tests/performance/gatling
./gradlew gatlingRun
./gradlew gatlingRun-simulations.AuthSimulation     # Specifique
```

Simulations: `AuthSimulation`, `RideSimulation`, `DriverSimulation`, `WebsocketSimulation`, `ApiStressTest`, `EndToEndSimulation`

### Tous les tests d'un coup

```bash
docker compose -f docker-compose.test.yml up --abort-on-container-exit
```

---

## Infrastructure

### Terraform (AWS)

Modules: networking (VPC, ALB), compute (EC2, ASG), database (DocumentDB, ElastiCache), storage (S3, CloudFront).

Auto-scaling: CPU > 70% = scale up, CPU < 30% = scale down. Min 2, Max 10 instances. Heures de pointe 7h-22h GMT+1 = 4 instances.

### Ansible

Playbooks: `setup-server` (Docker, Nginx, certbot), `deploy` (app + rollback), `setup-monitoring` (Prometheus, Grafana), `backup` (MongoDB quotidien).

---

## CI/CD Pipeline

Le pipeline GitHub Actions comprend 9 etapes: Lint, Unit Tests (couverture > 70%), API Tests (Karate), E2E Tests (Playwright, 5 navigateurs), Security Scan (Trivy, TruffleHog), Code Quality (SonarQube), Docker Build, Deploy Staging (automatique), Deploy Production (avec approbation).

---

## Liste des features — 30 Prompts Implementes

### BLOC 1 — Mobile UI & Navigation (Prompts 01-08)

**Prompt #01 — Navigation Complete & Structure**
- RootNavigator avec AuthStack, UserStack, DriverStack, AdminStack
- Ecrans: PaymentMethodsScreen, NotificationsScreen, SOSScreen, ChooseOnMapScreen
- TypeScript strict, React Navigation 6, RTL arabe via I18nManager
- Flux Auth → FaceVerification → Main intact

**Prompt #02 — HomeScreen Passagere (Carte + Reservation)**
- Composant RideRequestForm: AutoComplete Google Places, DateTimePicker, prix propose
- DriverMarkers: 5 conductrices disponibles autour avec distance/rating
- RouteTracer: trace trajet Directions API, instructions tour par tour
- PriceEstimator: estimation prix automatique selon distance/duree/service

**Prompt #03 — HomeScreen Conductrice (Dashboard)**
- DriverStatusToggle: switch actif/inactif avec update API + earnings summary
- RideRequestCard: courses disponibles (From→To, distance, duree, prix)
- AcceptRideModal: modal detaille avec Accept/Refuse + countdown timer
- GPS broadcast via Socket.IO toutes les 5s

**Prompt #04 — Systeme de Badges Bronze → Platinum**
- BadgesScreen: grille tous badges avec progression locked/unlocked
- BadgeCard: animation shimmer badges unlocked, tailles S/M/L
- BadgeDetailModal: details badge, avantages, progression next level
- BadgeCelebrationModal: animation confetti avec Animated API
- ProgressBar: barre de progression reusable
- badgeSlice Redux: setBadges, unlockBadge, updateBadgeProgress

**Prompt #05 — Chat Temps Reel Complet**
- ChatBubble: bulles messages avec statut envoye ✓, recu ✓✓, lu ✓✓ (bleu)
- TypingIndicator: animation points "en train d'ecrire..."
- MessageInput: texte + emoji + photo (Image Picker) + audio
- ConversationItem: dernier message + timestamp + badge non-lu
- chatSlice Redux: conversations, messages, typing, read receipts
- Socket events: message:send, message:new, user:typing, message:read

**Prompt #06 — SOS & Securite Passageres**
- SOSScreen: bouton rouge urgence + numeros SAMU/Police/Pompiers/Gendarmerie
- SOSButton: appui long 3s avec countdown pour eviter declenchement accidentel
- EmergencyContactsScreen: CRUD contacts urgence (max 3), validation +212
- ShareLocationScreen: partage trajet temps reel via WhatsApp deep link
- QRCodeShare: QR Code du trajet pour verification
- EmergencyContactCard: affichage contact avec actions rapides
- Routes API: POST /api/sos/trigger, CRUD /api/users/emergency-contacts, POST /api/location/share

**Prompt #07 — Internationalisation AR/FR/EN + RTL**
- 1015+ cles de traduction dans ar.json, fr.json, en.json
- Fichiers supplementaires: sos_*, badges_*, payment_*, notifications_* (12 fichiers)
- LanguageSwitcher: selecteur FR/AR/EN avec restart app (Expo Updates)
- RTL complet: FlexDirection row-reverse, marges inversees, StyleSheet RTL aware
- Fonts arabes: Cairo/Amiri via expo-font, application conditionnelle
- I18nManager.forceRTL() + Noto Sans Arabic

**Prompt #08 — Profil Utilisateur & Statistiques**
- AvatarEditor: expo-image-picker + upload multipart/form-data
- UserStats: total courses, distance parcourue, economies, note moyenne
- DriverStats: revenus mois, note moyenne etoiles, taux acceptation, heures actives
- ReferralSection: code parrainage + partage WhatsApp/SMS
- VehicleInfoScreen: marque, modele, annee, immatriculation, couleur, capacite, photos
- API: PUT /api/users/profile, POST /api/users/avatar, GET /api/users/stats

---

### BLOC 2 — Backend & API REST (Prompts 09-14)

**Prompt #09 — Routes Manquantes & Middleware**
- rateLimiter.js: 100 req/min general, 10 req/15min auth, 5 req/hour OTP
- femaleOnly.js: verifie gender depuis JWT payload
- validateObjectId.js: validation mongoose.Types.ObjectId factory pattern
- upload.js: multer config 5MB/10MB, validation types fichiers, storage user-specific
- documentCheck.js: verification documents 3 niveaux (strict, warning, type-specific)
- Routes: POST /api/auth/register (+18), login, refresh-token, forgot-password
- Routes: POST /api/rides/request, PUT accept/start/complete, GET history (pagination)

**Prompt #10 — Socket.IO Temps Reel**
- rideSocket.js: driver:location-update, ride:status-change, driver:available-rides, passenger:cancel-ride, emergency:alert
- notificationSocket.js: push delivery, read tracking, type subscriptions, broadcasts
- Rooms: ride_{rideId}, conv_{conversationId}, drivers:active, user:{id}:notifications
- Auth socket middleware: JWT verification a la connexion

**Prompt #11 — Documents Conductrices (13 Documents)**
- Document.js model: driverId, type, fileUrl, status (pending/approved/rejected/expired), expiresAt
- 13 types: CIN r/v, permis, carte grise, assurance, visite technique, casier, photos, contrat, formation, RIB, domicile, certificat medical
- documentService.js: validation, expiry notifications 30j, archivage, verification driver
- documentCheck middleware: bloque courses si documents incomplets
- Routes: POST upload, GET liste+statuts, PUT admin review approve/reject

**Prompt #12 — Notation & Avis Bidirectionnel**
- Rating.js model: rideId, fromUserId, toUserId, role (passenger|driver), stars 1-5, comment, tags[], response, reported
- Tags predefinis: Ponctuelle, Conduite douce, Vehicule propre, Amicale, Securite...
- Moyenne glissante sur 50 dernieres notes (sliding window)
- Alerte admin si conductrice < 3.5 etoiles
- Delai 24h pour noter, verrouille apres
- Routes: POST /api/ratings, GET user/:id, GET driver/:id/summary

**Prompt #13 — Notifications Push + In-App**
- Notification.js model: userId, type (24 types), title, body, data, read, fcmMessageId
- fcmService.js: Firebase Cloud Messaging single/multicast/topic, platform-specific
- notificationService.js: dual delivery in-app + push, bulk, type subscriptions
- Types: course (acceptee/en route/demarree/terminee), documents, badges, paiements, admin
- Token FCM: PUT /api/users/fcm-token
- Routes: GET notifications, PUT mark-read, DELETE, GET unread-count

**Prompt #14 — Admin Dashboard Backend**
- adminStatsController.js: 10 endpoints analytics
- Complaint.js model: userId, rideId, subject, description, severity, status, resolution
- GET /api/admin/stats/overview (KPIs temps reel)
- GET /api/admin/stats/rides-by-day (graphe 30 derniers jours)
- GET /api/admin/stats/revenue-by-month
- GET /api/admin/users?status=&gender=&page=&limit=
- PUT /api/admin/users/:id/suspend
- GET /api/admin/drivers/pending-approval + PUT approve
- GET /api/admin/complaints + PUT resolve
- Carte temps reel: markers users (mauve) + drivers (rose)

---

### BLOC 3 — Paiement & Tarification (Prompts 15-17)

**Prompt #15 — Paiement CMI Maroc + Especes + Wallet**
- Payment.js model: rideId, passengerId, driverId, amount, currency MAD, method, status, transactionId
- Wallet.js model: userId, balance, currency MAD, transactions[]
- cmiService.js: integration Centre Monetique Interbancaire avec signature HMAC
- 4 methodes: Especes (defaut), Wallet in-app, CMI (Visa/MC Maroc), Virement RIB
- Routes: POST initiate, POST cmi/callback (webhook), GET wallet/balance, POST topup, POST withdraw
- WalletScreen mobile: solde + historique + topup
- PaymentMethodCard, WalletBalance composants
- paymentSlice Redux

**Prompt #16 — Tarification Dynamique**
- Formule: Prix = (PrixBase + Distance×TarifKm + Duree×TarifMin) × SurgeMultiplier
- pricingEngineService.js: calcul complet avec tous facteurs
- surgePricingService.js: demand/supply ratio
- Multiplicateurs services: Eco ×0.8, Standard ×1.0, Confort ×1.3, Pool ×0.6
- Facteurs temps: nuit +30%, pluie +15%, heure pointe +25%, heure creuse -20%
- Surge: ×1.2 → ×2.0 selon demande
- PricingBreakdown: detail base + km + duree + surge
- ServiceComparator: comparatif eco/standard/confort/pool
- SurgeIndicator: affichage multiplicateur anime avec countdown

**Prompt #17 — Revenus Conductrices**
- earningsService.js: calculs jour/semaine/mois, deduction commission configurable
- DriverEarningsScreen: solde + bouton "Retirer" + toggle jour/semaine/mois
- EarningsSummary: stats par periode avec grille
- EarningsChart: graphe barres hebdomadaire anime (couleurs performance)
- WithdrawModal: formulaire retrait RIB (validation 28 digits Maroc), min 100 MAD, max 50,000 MAD
- Commission 2% frais traitement
- Routes: GET earnings?period=day|week|month, GET summary?month=YYYY-MM, POST withdraw

---

### BLOC 4 — Securite & Verification (Prompts 18-21)

**Prompt #18 — Verification Faciale Mobile ↔ FastAPI IA**
- aiProxyController.js: proxy backend → FastAPI avec timeout 10s + 1 retry
- Routes: POST /api/ai/verify, /api/ai/register-face, /api/ai/liveness, /api/ai/compare
- faceVerificationProxy.ts mobile: appelle proxy backend (pas directement FastAPI)
- Flux inscription: Selfie → Gender Check → Antispoof → Face Save → Acces App
- Flux login: Selfie → Face Match (vs photo inscription) → Acces App
- Log chaque verification: userId, timestamp, result

**Prompt #19 — JWT Refresh Tokens & Sessions**
- RefreshToken.js model: token, userId, expiresAt 7j, revokedAt, userAgent, ip
- tokenService.js: generate access (15min) + refresh (7j), revoke, revokeAll
- Access Token payload: userId, email, role, gender, isVerified
- Refresh Token: stocke en DB + httpOnly cookie, revocable
- Routes: POST /api/auth/refresh, POST /api/auth/logout, POST /api/auth/logout-all
- authInterceptor.ts mobile: Axios intercepteur auto-refresh sur 401
- secureStorage.ts: expo-secure-store (pas AsyncStorage pour tokens)

**Prompt #20 — OTP SMS Maroc**
- infobipService.js: Infobip API (meilleur coverage Maroc), fallback Twilio
- otpService.js: code 6 chiffres, TTL 5min, max 3 tentatives, lockout 15min
- Validation numero marocain: /^(\+212|0)(5|6|7)[0-9]{8}$/
- OTPInputCustom.tsx: 6 cases individuelles auto-focus
- Timer countdown 5min + bouton "Renvoyer" apres 60s
- Routes: POST /api/otp/send, POST /api/otp/verify, POST /api/otp/resend

**Prompt #21 — RGPD & Conformite Loi 09-08 CNDP Maroc**
- Consent.js model: userId, 8 types consentements horodates
- BiometricData.js model: embeddings chiffres AES-256, expiresAt 12 mois
- encryptionService.js: AES-256 encryption/decryption, HMAC signing
- gdprService.js: export JSON toutes donnees, suppression complete, rectification
- Conservation: biometrie 12 mois max, logs 6 mois
- Purge automatique cron job
- PrivacyConsentScreen: premier lancement, consentements detailles required/optional
- DataRightsScreen: demander export/suppression donnees, historique demandes
- PrivacyPolicyScreen: texte legal FR/AR/EN expandable
- Routes: POST consent, GET data-export, DELETE /api/users/me, GET consent-history

---

### BLOC 5 — IA/ML Integration (Prompts 22-25)

**Prompt #22 — Fine-tuning Gender Model MENA**
- finetune_gender_mena.py: PyTorch ResNet18, unfreeze 2 dernieres couches
- DataLoader avec augmentation (flip, brightness, rotation ±15°)
- Datasets: UTKFace (23K), FairFace (108K) + photos Maroc/Maghreb
- Early stopping patience=5, save best model
- evaluate_gender.py: matrice confusion, precision/rappel par genre
- download_datasets.sh: telechargement automatise UTKFace + FairFace
- Correction biais MENA (ResNet18 v3 predisait FEMALE sur visages masculins marocains)

**Prompt #23 — Matching Conductrice Geopatial**
- matchingService.js: multi-criteres score = 0.4×(1/distance) + 0.3×rating + 0.2×(1/eta) + 0.1×history
- Haversine formula, rayon 5km defaut, index 2dsphere MongoDB
- poolMatchingService.js: trajets compatibles bearing GPS ±20%
- Google Directions API pour ETA
- Bonus si deja notees +4 etoiles ensemble
- Routes: GET /api/rides/nearby-drivers?lat=&lng=&service=&radius=

**Prompt #24 — Voice Gender Recognition (Optionnel)**
- verify_voice.py FastAPI: reception audio, prediction SVM
- voice_analysis.py: extraction 90+ features (MFCC, ZCR, spectral centroid, chroma, energy, tempo)
- train_voice_model.py: entrainement SVM, feature selection, model persistence
- VoiceVerificationScreen.tsx: enregistrement 5s via expo-av
- Strategie: si confiance gender < 70% → proposer verification vocale
- Les deux doivent confirmer "female" pour acces conductrice

**Prompt #25 — Pipeline IA Unifie**
- face_count.py: YOLOv8-face + Haar Cascade fallback, reject si count ≠ 1
- preprocessing.py: normalisation 160×160, padding constant, histogram equalization
- unified_pipeline.py: 4 etapes (face count → antispoof → gender → face match)
- Retourne {passed, steps[], details{}} avec timing par etape
- Correction coherence Face Compare (meme preprocessing CLI et API)
- Toujours dlib cosine distance (pas mixer avec TF embeddings)

---

### BLOC 6 — DevOps & Deploiement (Prompts 26-28)

**Prompt #26 — Docker Compose Hetzner**
- docker-compose.yml: 11 services (mongodb, redis, backend, seed, face-api, web, mongo-express, redis-commander, elasticsearch, logstash, kibana)
- Dockerfile.backend.prod: multi-stage Node.js 20 optimise
- Dockerfile.faceapi.prod: PyTorch INT8, Python 3.11
- deploy.sh: git pull → build → health check → rollback automatique
- init-server.sh: Hetzner CX21 (4€/mois), swap 2GB, firewall, Docker install
- backup.sh: MongoDB backup quotidien avec retention
- .env.production.example: template production complet
- Limites memoire: backend 512m, face-api 1.5g (CPU only)

**Prompt #27 — CI/CD GitHub Actions**
- backend-ci.yml: ESLint + Jest unit tests (mongodb-memory-server) + Docker build + deploy SSH Hetzner
- mobile-ci.yml: ESLint + TypeScript check + Jest + EAS Build Android APK
- security-scan.yml: npm audit + Snyk scanning + vulnerability detection
- Trigger: push main, PR vers main
- Secrets: HETZNER_SSH_KEY, EXPO_TOKEN, ANDROID_KEYSTORE

**Prompt #28 — Monitoring & Alertes**
- healthCheckService.js: check MongoDB, Redis, AI service status
- GET /api/health → {status, mongodb, redis, aiService, uptime, memory, timestamp}
- sentryService.js: Sentry Express error tracking + performance
- telegramAlertService.js: alertes critiques temps reel via Telegram Bot
- winston.js: logs structures JSON, rotation quotidienne, error.log + combined.log
- Conservation 30 jours, format: timestamp, level, service, userId, action, duration, ip

---

### BLOC 7 — Tests & Monitoring (Prompts 29-30)

**Prompt #29 — Tests Complets**
- Tests unitaires Backend (Jest): pricingService, matchingService, badgeService, authService (20+ cas)
- Tests integration: register → verify phone → verify face → book ride → complete → rate
- mongodb-memory-server pour CI (pas de DB externe)
- Tests E2E Mobile (Detox): passenger.e2e.js, driver.e2e.js, auth.e2e.js
- Tests Mobile (Jest): LoginScreen.test.tsx, HomeScreen.test.tsx, SOSButton.test.tsx
- Tests IA (pytest): test_gender.py (20 images), test_antispoof.py, test_face_match.py
- Tests E2E (Playwright): 237+ tests, 11 spec files
- Tests API (Karate): 280+ scenarios, 16 feature files
- Tests Performance (Gatling): 6 simulations de charge

**Prompt #30 — Google Play Store**
- eas.json: profils development, preview, production
- bundleId: com.gowithsally.app
- Permissions: CAMERA, LOCATION, RECORD_AUDIO, VIBRATE
- Store listing FR: "GoWithSally — VTC Feminin Maroc"
- Store listing AR: "جو ويث سالي — تنقل آمن للنساء"
- Categorie: Transports & Navigation
- Pays cible: Maroc, France, Belgique, Suisse
- STORE_CHECKLIST.md: 100+ items verification avant soumission
- PrivacyPolicyScreen accessible SANS connexion
- Mentions legales CNDP Maroc dans metadonnees

---

### Fonctionnalites Transversales

**Authentification & Securite**
- Inscription/connexion email + mot de passe (bcrypt genSalt 12)
- Verification OTP SMS (Infobip/Twilio, +212), email lien magique
- Reconnaissance faciale (ResNet18 gender, MobileNetV2 antispoof, dlib face match)
- Verification vocale optionnelle (SVM 90+ features, 99.85% accuracy)
- JWT access 15min + refresh 7j, rotation, revocation
- RBAC: Admin, SubAdmin, Driver, User
- Rate limiting (100/min general, 10/15min auth, 5/h OTP)
- femaleOnly middleware, Helmet, CORS, mongo-sanitize, HPP
- Conformite RGPD + Loi 09-08 CNDP Maroc

**Paiements Maroc**
- Especes (defaut), Wallet Sally (MAD), CMI (Visa/MC Maroc), Virement RIB
- Tarification dynamique: base + km + duree × surge × service
- Negociation prix (max 3 echanges)
- Commission conductrice configurable, retrait min 100 MAD

**Temps Reel**
- Socket.IO: courses, chat, localisation GPS, notifications
- Chat: bulles, ✓✓ statut, typing indicator, photos, emoji
- GPS broadcast toutes les 5s, rooms par course/conversation

**Gamification**
- 4 niveaux: Bronze (0-50), Silver (51-150), Gold (151-300), Platinum (300+)
- Badges avec progression, celebration confetti
- Points fidelite, parrainage avec bonus

**i18n & RTL**
- 3 langues: FR, AR, EN (1015+ cles + fichiers supplementaires par module)
- RTL complet arabe: FlexDirection, marges, polices Cairo/Amiri
- Selecteur de langue avec restart app

**Monitoring & Logs**
- Sentry error tracking + performance
- Telegram Bot alertes critiques
- Winston JSON logs rotation quotidienne
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Health check: MongoDB + Redis + AI service
- Prometheus metrics

---

## Internationalisation

3 langues avec 1015+ cles de traduction:

| Langue | Code | Direction | Fichier |
|--------|------|-----------|---------|
| Francais | fr | LTR | `gowithsally-mobile/src/i18n/locales/fr.json` |
| Arabe | ar | RTL | `gowithsally-mobile/src/i18n/locales/ar.json` |
| Anglais | en | LTR | `gowithsally-mobile/src/i18n/locales/en.json` |

RTL arabe: `I18nManager.forceRTL()`, styles conditionels, marges inversees, polices Noto Sans Arabic.

---

## URLs des services

| Service | URL |
|---------|-----|
| Backend API | http://localhost:5000 |
| Web Admin | http://localhost:3000 |
| Face AI API | http://localhost:8000 |
| MongoDB | mongodb://localhost:27017 |
| Redis | redis://localhost:6379 |
| Mongo Express | http://localhost:8081 |
| Redis Commander | http://localhost:8082 |
| Kibana | http://localhost:5601 |

---

## Licence

Projet prive - Go With Sally - Tous droits reserves.
