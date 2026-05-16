# GoWithSally - Face AI Studio v4.0

> API d'intelligence artificielle pour la verification biometrique dans le covoiturage.
> Detection, reconnaissance, genre, age, anti-spoof, voice, comptage, securite trajet.

---

## Table des matieres

1. [Architecture](#architecture)
2. [Features](#features)
3. [Structure du projet](#structure-du-projet)
4. [Installation rapide (local sans Docker)](#installation-rapide)
5. [Docker - Developpement local](#docker---developpement-local)
6. [Docker - Production / Cloud](#docker---production--cloud)
7. [Commandes Docker completes](#commandes-docker-completes)
8. [Commandes Git](#commandes-git)
9. [Routes API](#routes-api)
10. [Modeles](#modeles)
11. [Configuration (.env)](#configuration-env)
12. [Scalabilite](#scalabilite)
13. [Monitoring](#monitoring)
14. [Deploiement Cloud](#deploiement-cloud)
15. [Training scripts](#training-scripts)

---

## Architecture

```
                    +---------------------------+
                    |   React Native App        |
                    |   (GoWithSally Mobile)    |
                    +------------+--------------+
                                 | HTTPS/REST
                                 v
                    +---------------------------+
                    |       Nginx (LB)          |
                    |   Rate limit + SSL        |
                    +------+----------+---------+
                           |          |
                    +------v--+ +-----v---+
                    | API #1  | | API #2  |   <- Docker containers
                    | 1 worker| | 1 worker|
                    +---------+ +---------+
                           |          |
                    +------v----------v--------+
                    |     MODEL REGISTRY       |
                    |  13 models in-memory      |
                    |  dlib, PyTorch, TF, YOLO  |
                    +---------------------------+
                           |
                    +------v----------v--------+
                    | Redis (cache)  | S3 (img)|
                    +----------------+---------+
```

---

## Features

### 8 Core AI Features
| # | Feature | Route | Description |
|---|---------|-------|-------------|
| 1 | Detection | `/api/detect` | Detection de visages + 68 landmarks |
| 2 | Recognition | `/api/recognize` | Embedding 128D par visage |
| 3 | Compare | `/api/compare` | Meme personne ? (distance + cosine) |
| 4 | Gender | `/api/gender` | Male/Female (ResNet18 PyTorch) |
| 5 | Anti-Spoof | `/api/antispoof` | Real/Fake (cascade PyTorch+TF) |
| 6 | Voice Gender | `/api/voice-gender` | Genre par la voix (90+ features audio) |
| 7 | Age | `/api/age` | Estimation d'age (EfficientNetV2) |
| 8 | Face Count | `/api/count-faces` | Comptage YOLO de visages |

### 5 GoWithSally Features
| # | Feature | Route | Description |
|---|---------|-------|-------------|
| 9 | Head Count | `/api/detect-heads` | Comptage de tetes (meme de dos) |
| 10 | Full Analysis | `/api/analyze` | Tout en 1 appel |
| 11 | Driver Verify | `/api/driver-verify` | Verification conducteur (face + spoof + age) |
| 12 | Passenger Verify | `/api/passenger-verify` | Verification passager + comptage |
| 13 | Trip Safety | `/api/trip-safety` | Score de securite du trajet |

### Features a venir (imaginees)
- **Drowsiness Detection** : detecter si le conducteur s'endort via la camera
- **Emotion Recognition** : detecter le stress/colere du conducteur
- **License Plate OCR** : verifier la plaque du vehicule
- **ID Card Verification** : scanner CIN/passeport et comparer au selfie
- **Route Anomaly** : alerter si le vehicule devie du trajet prevu
- **SOS Voice Trigger** : mot-cle vocal pour declencer l'alerte (via voice model)
- **Multi-language Chat** : utiliser Gemini/GPT pour le support client multilingue
- **Fraud Scoring** : score de fraude combine (face + voice + comportement)

---

## Structure du projet

```
gowithsally-face-api/
|-- app/
|   |-- __init__.py
|   +-- main.py                 <- FastAPI + 13 routes + tous les helpers
|-- models/                     <- Tous les modeles AI (montes via Docker volume)
|   |-- face/                   <- dlib landmarks + recognition
|   |-- gender/                 <- ResNet18 .pth + TF .h5
|   |-- antispoof/              <- MobileNetV2 .pth + VGG16 .h5
|   |-- age/                    <- EfficientNetV2 .keras + .tflite
|   |-- voice_gender/           <- sklearn ensemble (.pkl)
|   |-- facecount/              <- YOLOv8 face
|   +-- headcount/              <- YOLOv8 head
|-- training/                   <- Scripts d'entrainement (supprimables)
|   |-- age_recognition_v3.py
|   |-- finetune_gender_mena.py
|   |-- voice_ge.py
|   |-- train_face_count.py
|   +-- head_detection_v6.py
|-- templates/
|   +-- index.html              <- Interface web Face AI Studio
|-- static/                     <- Assets statiques
|-- nginx/
|   |-- nginx.conf              <- Config reverse proxy
|   +-- prometheus.yml          <- Config monitoring
|-- Dockerfile                  <- Multi-stage build
|-- docker-compose.yml          <- Dev (uvicorn --reload)
|-- docker-compose.prod.yml     <- Prod (gunicorn + nginx + monitoring)
|-- requirements.txt            <- Dependances Python
|-- .env                        <- Variables d'environnement (PAS dans git)
|-- .env.example                <- Template .env
|-- .dockerignore
|-- .gitignore
+-- README.md
```

---

## Installation rapide

### Prerequis
- Python 3.9+ (teste 3.9, 3.11)
- 512 MB RAM minimum (sans TF), 4 GB avec TF

### Sans Docker

```bash
# 1. Cloner
git clone https://github.com/gowithsally/gowithsally-face-api.git
cd gowithsally-face-api

# 2. Virtual env
python -m venv venv
source venv/bin/activate          # Linux/Mac
# .\venv\Scripts\Activate         # Windows

# 3. Installer deps
pip install -r requirements.txt

# 4. PyTorch CPU
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 5. TensorFlow (optionnel)
pip install tensorflow

# 6. Copier .env
cp .env.example .env
# Editer .env avec vos valeurs

# 7. Placer les modeles dans models/

# 8. Lancer
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Tester

```
http://localhost:8000           -> Interface web
http://localhost:8000/docs      -> Swagger UI
http://localhost:8000/redoc     -> ReDoc
http://localhost:8000/api/health/ping -> Ping (no auth)
```

---

## Docker - Developpement local

### Build et lancer

```bash
# Build l'image (sans TensorFlow = plus leger)
docker compose build

# Lancer en dev (uvicorn --reload, hot-reload)
docker compose up

# Lancer en arriere-plan
docker compose up -d

# Voir les logs en temps reel
docker compose logs -f api

# Arreter
docker compose down
```

### Build avec TensorFlow

```bash
docker compose build --build-arg INSTALL_TF=true
```

### Shell dans le container

```bash
docker exec -it sally-face-api bash
```

---

## Docker - Production / Cloud

### Lancer en mode production

```bash
# Production: gunicorn + nginx + prometheus + grafana
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Voir le status
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Logs production
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Arreter la prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

### Scaler horizontalement

```bash
# 3 instances de l'API derriere nginx
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale api=3

# 5 instances
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale api=5
```

---

## Commandes Docker completes

### Construction

```bash
# Build standard
docker compose build

# Build sans cache (force rebuild)
docker compose build --no-cache

# Build avec TensorFlow
docker compose build --build-arg INSTALL_TF=true

# Build une image taguee pour le registry
docker build -t gowithsally/face-api:latest .
docker build -t gowithsally/face-api:v4.0 .
```

### Execution

```bash
# Demarrer les services (dev)
docker compose up
docker compose up -d                    # arriere-plan

# Demarrer les services (prod)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Redemarrer un service
docker compose restart api
docker compose restart redis

# Voir les containers en cours
docker compose ps
docker ps
```

### Logs et debug

```bash
# Logs en temps reel
docker compose logs -f api
docker compose logs -f --tail=100 api   # derniers 100 lignes

# Stats memoire/CPU
docker stats sally-face-api

# Shell dans le container
docker exec -it sally-face-api bash
docker exec -it sally-face-api python -c "import torch; print(torch.__version__)"
```

### Arret et nettoyage

```bash
# Arreter les containers
docker compose down

# Arreter + supprimer les volumes (ATTENTION: perd les donnees Redis)
docker compose down -v

# Supprimer les images
docker compose down --rmi all

# Supprimer un container specifique
docker rm -f sally-face-api
docker rm -f sally-redis

# Nettoyage complet Docker
docker system prune -a              # supprime tout ce qui n'est pas utilise
docker volume prune                 # supprime les volumes orphelins
docker image prune -a               # supprime les images non utilisees
```

### Push vers un registry

```bash
# Docker Hub
docker login
docker tag gowithsally/face-api:latest gowithsally/face-api:v4.0
docker push gowithsally/face-api:v4.0

# GitHub Container Registry
docker tag gowithsally/face-api:latest ghcr.io/gowithsally/face-api:v4.0
docker push ghcr.io/gowithsally/face-api:v4.0

# Google Container Registry
docker tag gowithsally/face-api:latest gcr.io/PROJECT_ID/face-api:v4.0
docker push gcr.io/PROJECT_ID/face-api:v4.0
```

---

## Commandes Git

### Setup initial

```bash
# Initialiser le repo
git init
git remote add origin https://github.com/gowithsally/gowithsally-face-api.git

# Premier commit
git add .
git commit -m "feat: GoWithSally Face AI Studio v4.0"
git branch -M main
git push -u origin main
```

### Workflow quotidien

```bash
# Voir le status
git status
git diff

# Ajouter et commiter
git add .
git commit -m "feat: description du changement"
git push

# Ou fichier par fichier
git add app/main.py
git commit -m "fix: correction du bug X"
git push
```

### Branches

```bash
# Creer une branche feature
git checkout -b feature/emotion-detection

# Travailler dessus...
git add .
git commit -m "feat: add emotion detection endpoint"

# Push la branche
git push -u origin feature/emotion-detection

# Merge dans main
git checkout main
git pull
git merge feature/emotion-detection
git push

# Supprimer la branche
git branch -d feature/emotion-detection
git push origin --delete feature/emotion-detection
```

### Tags et releases

```bash
# Creer un tag
git tag -a v4.0.0 -m "Release v4.0.0 - Face AI Studio"
git push origin v4.0.0

# Lister les tags
git tag -l
```

### Annuler des changements

```bash
# Annuler les modifications non commitees d'un fichier
git checkout -- app/main.py

# Annuler le dernier commit (garde les fichiers)
git reset --soft HEAD~1

# Voir l'historique
git log --oneline -20
```

---

## Routes API

### Authentification

```bash
# Login (obtenir une cle API)
curl -X POST http://localhost:8000/api/auth/login \
  -F "password=sally2024"

# Utiliser la cle dans chaque requete
# Header: X-API-Key: <votre_cle>
```

### Exemples curl

```bash
# Health check (pas d'auth)
curl http://localhost:8000/api/health/ping

# Health check (avec auth)
curl http://localhost:8000/api/health \
  -H "X-API-Key: VOTRE_CLE"

# Detection de visages
curl -X POST http://localhost:8000/api/detect \
  -F "image=@photo.jpg" \
  -H "X-API-Key: VOTRE_CLE"

# Genre
curl -X POST http://localhost:8000/api/gender \
  -F "image=@photo.jpg" \
  -H "X-API-Key: VOTRE_CLE"

# Comparaison
curl -X POST http://localhost:8000/api/compare \
  -F "image1=@face1.jpg" -F "image2=@face2.jpg" -F "threshold=0.55" \
  -H "X-API-Key: VOTRE_CLE"

# Voice gender
curl -X POST http://localhost:8000/api/voice-gender \
  -F "audio=@voice.wav" \
  -H "X-API-Key: VOTRE_CLE"

# Age
curl -X POST http://localhost:8000/api/age \
  -F "image=@photo.jpg" \
  -H "X-API-Key: VOTRE_CLE"

# Anti-spoof
curl -X POST http://localhost:8000/api/antispoof \
  -F "image=@photo.jpg" \
  -H "X-API-Key: VOTRE_CLE"

# Driver verification
curl -X POST http://localhost:8000/api/driver-verify \
  -F "profile=@profile.jpg" -F "selfie=@selfie.jpg" \
  -H "X-API-Key: VOTRE_CLE"

# Passenger verification
curl -X POST http://localhost:8000/api/passenger-verify \
  -F "booking=@booking.jpg" -F "live=@live.jpg" \
  -H "X-API-Key: VOTRE_CLE"

# Trip safety score
curl -X POST http://localhost:8000/api/trip-safety \
  -F "image=@vehicle.jpg" \
  -H "X-API-Key: VOTRE_CLE"

# Full analysis
curl -X POST http://localhost:8000/api/analyze \
  -F "image=@photo.jpg" \
  -H "X-API-Key: VOTRE_CLE"

# AI providers status
curl http://localhost:8000/api/config/ai-providers \
  -H "X-API-Key: VOTRE_CLE"
```

---

## Modeles

| Modele | Fichier | Taille | Framework |
|--------|---------|--------|-----------|
| Face Detector | dlib built-in (HOG) | 0 MB | dlib |
| 68 Landmarks | `shape_predictor_68_face_landmarks.dat` | 95 MB | dlib |
| Recognition 128D | `dlib_face_recognition_resnet_model_v1.dat` | 21 MB | dlib |
| Gender (L1) | `gender_model_v3.pth` | 113 MB | PyTorch |
| Gender (L2) | `gender_model_v3.h5` | 160 MB | TensorFlow |
| AntiSpoof (L1) | `antispoof_model_v3.pth` | 12 MB | PyTorch |
| AntiSpoof (L2) | `antispoof_model_v4.h5` | 1.5 GB | TensorFlow |
| Voice Gender | `best_model.pkl` + 4 fichiers | ~5 MB | sklearn |
| Age | `age_model_v4.keras` | ~50 MB | Keras |
| Age (lite) | `age_model_v3_int8.tflite` | ~10 MB | TFLite |
| Face Count | `yolo_face_best.pt` | ~20 MB | YOLOv8 |
| Head Count | `yolo_head_best.pt` | ~20 MB | YOLOv8 |

### Placement

```
models/
|-- face/
|   |-- shape_predictor_68_face_landmarks.dat      <- REQUIS
|   +-- dlib_face_recognition_resnet_model_v1.dat  <- REQUIS
|-- gender/
|   |-- gender_model_v3.pth                        <- REQUIS
|   +-- gender_model_v3.h5                         <- optionnel
|-- antispoof/
|   |-- antispoof_model_v3.pth                     <- REQUIS
|   +-- antispoof_model_v4.h5                      <- optionnel
|-- age/
|   |-- age_model_v4.keras                         <- REQUIS (ou tflite)
|   +-- age_model_v3_int8.tflite                   <- fallback
|-- voice_gender/
|   |-- best_model.pkl
|   |-- scaler.pkl
|   |-- label_encoder.pkl
|   |-- var_selector.pkl
|   +-- mi_selector.pkl
|-- facecount/
|   +-- yolo_face_best.pt
+-- headcount/
    +-- yolo_head_best.pt
```

---

## Configuration (.env)

```bash
cp .env.example .env
```

Variables principales :

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Port du serveur |
| `WORKERS` | 1 | Workers gunicorn (1 par container en prod) |
| `APP_PASSWORD` | sally2024 | Mot de passe web UI |
| `APP_ENV` | development | Environment (development/production) |
| `MATCH_STRICT` | 0.45 | Seuil conducteur |
| `MATCH_NORMAL` | 0.55 | Seuil passager |
| `GEMINI_API_KEY` | | Cle API Google Gemini |
| `OPENAI_API_KEY` | | Cle API OpenAI |
| `ANTHROPIC_API_KEY` | | Cle API Anthropic |
| `GROK_API_KEY` | | Cle API xAI Grok |
| `MISTRAL_API_KEY` | | Cle API Mistral |
| `REDIS_URL` | | URL Redis pour cache |
| `SENTRY_DSN` | | DSN Sentry pour le tracking d'erreurs |

---

## Scalabilite

### Strategie recommandee

```
                +-------------------+
                |    Nginx (LB)     |
                | Rate limit: 30r/s |
                +----+--------+-----+
                     |        |
                +----v--+ +---v---+
                |API #1 | |API #2 |
                |1 wrkr | |1 wrkr |
                |250 MB | |250 MB |
                +-------+ +-------+
```

**Pourquoi 1 worker par container ?**
Chaque worker charge TOUS les modeles. 4 workers = 4x la RAM.
2 containers x 1 worker = meme capacite, meilleure isolation, auto-restart.

### Consommation memoire

```
dlib (detector + landmarks + recognition)  = ~120 MB
PyTorch (gender + antispoof)               = ~130 MB
YOLO (face count + head count)             = ~80 MB
Voice Gender (sklearn)                     = ~10 MB
Age (TFLite)                               = ~15 MB
TensorFlow (si active)                     = ~1,800 MB
                                             ---------
Total sans TF:                               ~355 MB
Total avec TF:                               ~2,150 MB
```

---

## Monitoring

### Prometheus + Grafana (production)

```bash
# Lancer avec monitoring
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Prometheus: http://localhost:9090
# Grafana:    http://localhost:3000 (admin / sally2024)
# Metrics:    http://localhost:8000/metrics
```

---

## Deploiement Cloud

### Option 1 : Railway (simple)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Option 2 : Google Cloud Run

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/face-api
gcloud run deploy face-api \
  --image gcr.io/PROJECT_ID/face-api \
  --memory 2Gi --port 8000 \
  --min-instances 1 --max-instances 10 \
  --set-env-vars APP_ENV=production,WORKERS=1
```

### Option 3 : AWS ECS Fargate

```bash
# Build et push vers ECR
aws ecr get-login-password | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com
docker tag gowithsally/face-api:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/face-api:latest
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/face-api:latest

# Deployer via task definition ECS
# Config: 1 vCPU, 2 GB RAM, ALB devant
```

### Option 4 : VPS (DigitalOcean, Hetzner, OVH)

```bash
# Sur le serveur
git clone https://github.com/gowithsally/gowithsally-face-api.git
cd gowithsally-face-api
cp .env.example .env
# Editer .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Training scripts

Les scripts d'entrainement sont dans `training/`. Ils sont autonomes (telecharent les datasets, entrainent, exportent les modeles).

```
training/
|-- age_recognition_v3.py       <- EfficientNetV2-S sur AFAD
|-- finetune_gender_mena.py     <- ResNet18 sur FairFace MENA + Naja Hijab
|-- voice_ge.py                 <- Ensemble ML (XGBoost + LightGBM)
|-- train_face_count.py         <- YOLOv8 sur WIDER FACE
+-- head_detection_v6.py        <- YOLOv8 sur CrowdHuman
```

Pour supprimer apres usage :

```bash
rm -rf training/
```

---

## Licence

Proprietary - GoWithSally (c) 2024-2026
