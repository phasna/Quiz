# Quiz
<<<<<<< HEAD
npm install class-validator class-transformer reflect-metadata

npm install bcrypt jsonwebtoken
npm install --save-dev @types/bcrypt @types/jsonwebtoken
=======

API de quiz en temps réel (NodeJS / TypeScript / Express / Prisma / Socket.IO), avec gestion
de fichiers (Sharp, stockage local ou S3/Minio, transformation à la volée avec cache Redis).

## Prérequis

- Node.js 20+
- Docker et Docker Compose

## Démarrage en local (sans Docker)

```bash
npm install
cp .env.example .env   # puis ajuster les valeurs si besoin
npx prisma migrate deploy
npm run dev             # serveur avec live-reload (nodemon + ts-node)
```

L'API est disponible sur `http://localhost:3000`.

## Démarrage avec Docker Compose

```bash
docker compose up -d
```

Ceci démarre 4 services :

- `app` : le serveur NodeJS, construit depuis le stage `builder` du `Dockerfile` (il conserve
  les devDependencies) et lancé avec `npm run dev`. Le dossier `src` est monté en volume : toute
  modification du code déclenche un rechargement automatique (live-reload) sans reconstruire
  l'image.
- `db` : MySQL 8, correspond au provider `mysql` de `prisma/schema.prisma`. Exposé sur le
  port hôte `3307` (pas `3306`) pour éviter un conflit si tu as déjà un MySQL local qui tourne ;
  les autres containers s'y connectent en interne via `db:3306`.
- `redis` : cache utilisé pour les transformations d'images à la volée.
- `minio` : stockage S3-compatible pour les médias (console sur `http://localhost:9001`,
  identifiants `minioadmin` / `minioadmin`).

Pour reconstruire l'image après un changement de dépendances (`package.json`) :

```bash
docker compose up -d --build
```

Pour lancer l'app en mode "production" (image finale allégée, sans live-reload), utiliser
directement le `Dockerfile` sans le service `app` du compose :

```bash
docker build -t quiz .
docker run -p 3000:3000 --env-file .env quiz
```

## Variables d'environnement

Voir `.env.example` pour la liste complète (`DATABASE_URL`, `STORAGE_DRIVER`, `S3_*`,
`REDIS_URL`, `TRANSFORM_CACHE_TTL`). Le service `app` du `docker-compose.yml` définit déjà
les valeurs adaptées au réseau Docker interne (hosts `db`, `redis`, `minio`).

## Tests

Des tests unitaires/intégration légers (Jest + Supertest) couvrent la logique de correction
(`src/lib/answers.ts`) et la route `POST /api/users`. Ils mockent Prisma et ne nécessitent
donc pas de base de données pour s'exécuter :

```bash
npm test
```

Un cahier de tests manuels via Bruno est documenté dans `doc /commandes_bruno_api.pdf`
(à terme, à transformer en collection `.bru` versionnée dans le repo).

## CI/CD

- **CI** (`.github/workflows/ci.yml`) : à chaque push et pull request, installe les
  dépendances, génère le client Prisma, vérifie la compilation TypeScript, exécute les tests,
  puis construit l'image Docker pour valider le `Dockerfile`.
- **CD** (`.github/workflows/cd.yml`) : après un succès de la CI sur `main`, construit et
  publie l'image sur GitHub Container Registry (`ghcr.io/<repo>:latest` et `:<sha>`).

### Étape manuelle restante : protection de la branche `main`

Ceci se configure dans les paramètres du dépôt GitHub (pas via un fichier versionné) :

1. `Settings` → `Branches` → `Add branch protection rule`
2. Branche : `main`
3. Cocher « Require a pull request before merging »
4. Cocher « Require status checks to pass before merging » et sélectionner le job `CI /
   build-and-test`
5. Enregistrer

## Recettage

1. `docker compose up -d` puis vérifier que les 4 services sont `healthy`/`running`
   (`docker compose ps`)
2. `GET /api/questions` doit renvoyer les questions sans le champ `answer`
3. Upload d'une image via `POST /api/media/upload` puis vérification qu'elle apparaît bien
   dans Minio (console `http://localhost:9001`)
4. Ouvrir `http://localhost:3000` dans deux onglets, répondre à une question et vérifier que
   la réponse est bien enregistrée en base (table `Answer`) via le canal Socket.IO
>>>>>>> phasna
