# Go With Sally — Backoffice — Déploiement VPS (runbook)

Méthode reprise de **SallyCards Backoffice** (Hetzner + Cloudflare Tunnel +
GitHub Actions + GHCR). Le VPS `91.99.70.43` héberge **déjà SallyCards en
production** : ces étapes sont volontairement **manuelles** et n'ont **pas**
été exécutées (décision : *« STOP avant le VPS »*).

## Architecture cible

| Service | URL publique | Conteneur | Port (127.0.0.1) |
|---|---|---|---|
| Web | https://gowithsally.salistar.com | gws-web | 3100 |
| API | https://api.gowithsally.salistar.com | gws-backend | 5000 |
| Face AI | https://aigowithsally.salistar.com | gws-face-api | 8000 |
| Mongo | (interne) | **sallycards-mongo réutilisé** — base `gowithsally` | — |
| Redis | (interne) | **sallycards-redis réutilisé** — DB 3 (api) / 4 (face) | — |

Tout passe par le **tunnel Cloudflare existant** (aucun port public ouvert).

## CI/CD

- `deploy-prod.yml` : **`workflow_dispatch` uniquement**. Build des 3 images
  → GHCR → SSH VPS → `docker compose -f docker-compose.vps.yml pull && up -d`
  → purge Cloudflare (optionnelle) → health-check.
- `deploy.yml` (pipeline historique) : auto-trigger **désactivé**
  (`workflow_dispatch` only) pour éviter tout déploiement accidentel.

### Secrets GitHub Actions (repo › Settings › Secrets › Actions)

| Secret | Valeur | Statut |
|---|---|---|
| `VPS_HOST` | `91.99.70.43` | ✅ posé par l'automatisation |
| `VPS_USER` | `deploy` | ✅ posé |
| `VPS_SSH_KEY` | clé privée `~/.ssh/id_ed25519` | ✅ posé |
| `CF_ZONE_ID` | zone Cloudflare `salistar.com` | ⛔ à ajouter (optionnel) |
| `CF_API_TOKEN` | token Cloudflare *Cache Purge* | ⛔ à ajouter (optionnel) |

> Le push GHCR utilise `GITHUB_TOKEN` (images publiques → pull VPS sans PAT).

## Étapes VPS restantes (à exécuter quand prêt)

```bash
ssh deploy@91.99.70.43

# 1. Réseau Docker partagé + brancher les conteneurs SallyCards
docker network create shared-db || true
docker network connect shared-db sallycards-mongo  || true
docker network connect shared-db sallycards-redis  || true

# 2. Base Mongo dédiée 'gowithsally' (isolée de 'sallycards')
#    (réutilise l'utilisateur Mongo SallyCards, authSource=admin)
docker exec -it sallycards-mongo mongosh -u sallycards -p '<MONGO_PWD>' \
  --authenticationDatabase admin --eval \
  'db.getSiblingDB("gowithsally").createCollection("_init")'

# 3. Cloner le repo + .env.production
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/salistar/go-with-sally-backoffice.git
cd go-with-sally-backoffice
cp .env.production.example .env.production
nano .env.production        # remplir <MONGO_PWD>, <REDIS_PWD>, JWT, etc.
chmod 600 .env.production

# 4. Provisionner les modèles ML Face AI (~2.3 GB) — voir POINT OUVERT
docker volume create gowithsally_face_models
#  …copier les modèles dans le volume (rsync/scp/objet S3)…

# 5. Ajouter l'ingress Cloudflare (tunnel SallyCards EXISTANT)
#    Insérer cloudflared/gowithsally-ingress.yml dans ~/.cloudflared/config.yml
#    AVANT le catch-all 404, puis :
cloudflared tunnel route dns <TUNNEL> gowithsally.salistar.com
cloudflared tunnel route dns <TUNNEL> api.gowithsally.salistar.com
cloudflared tunnel route dns <TUNNEL> aigowithsally.salistar.com
sudo systemctl restart cloudflared
```

Puis, depuis GitHub : onglet **Actions › Deploy Prod (VPS) › Run workflow**.

## ⚠️ Points ouverts / risques

1. **Modèles ML Face AI (~2,3 GB)** : non versionnés (`.gitignore`, trop
   volumineux pour git/LFS gratuit). L'image `gws-face-api` buildée en CI ne
   les contient pas. → à provisionner sur le VPS dans le volume
   `gowithsally_face_models` (montage `:ro`) via stockage objet (S3/R2) ou
   `scp`. Le Face AI ne fonctionnera pas tant que ce n'est pas fait.
2. **RAM VPS** : CPX22 = 4 GB **déjà chargé par SallyCards**. Lancer en plus
   backend + face-api + **ELK** sature la mémoire (OOM → risque pour
   SallyCards). Recommandé : upgrade CPX32/CPX42 **avant**, ou déployer
   **sans** le profil `elk` (ne pas cocher *with_elk*).
3. **Mongo/Redis partagés** : isolation logique (base + index dédiés). Aucune
   donnée SallyCards modifiée, mais charge CPU/RAM mutualisée.
4. **`docker-compose.vps.yml`** suppose les conteneurs `sallycards-mongo` /
   `sallycards-redis` joignables sur le réseau `shared-db`.
