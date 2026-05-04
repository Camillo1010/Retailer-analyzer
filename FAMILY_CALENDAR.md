# Family Calendar

A password-protected calendar and event-management app for two users
(you and your spouse). React + Tailwind frontend, Node/Express backend
fronting Firebase Realtime Database.

> Note: this branch (`claude/family-calendar-app-LDRCq`) was forked
> from `main`, which contains an unrelated "Retailer Analyzer" project.
> The family-calendar code lives entirely in `frontend/` and `backend/`.
> The retailer-analyzer files at the repo root can be ignored or
> removed in a follow-up.

## Repo layout

```
frontend/                  React app (Vite + Tailwind)
  src/
    components/            Login, Calendar, Dashboard, EventDetail, EventForm, EventCreate
    services/              api.js (HTTP client), auth.js (token storage),
                           dates.js, notifications.js
    App.jsx, main.jsx, index.css
  vercel.json              SPA rewrite + Vite framework hint
  .env.example
backend/                   Node + Express + firebase-admin
  routes/                  auth.js, events.js, comments.js
  middleware/auth.js       JWT verifier
  scripts/seed-users.js    Bcrypt-hash & write the 2 users
  firebase.js              Admin SDK init
  firebase-schema.md       DB shape + indexing rules
  server.js
  .env.example
```

## Local development

### 1. Firebase project (one-time)

1. Create a Firebase project, enable Realtime Database, copy its URL
   (looks like `https://family-calendar-xxxxx-default-rtdb.firebaseio.com`).
2. **Project Settings → Service accounts → Generate new private key.**
   Save as `backend/serviceAccountKey.json` (gitignored).
3. Paste the indexing rules from `backend/firebase-schema.md` into the
   Realtime Database rules tab. Top-level `.read` and `.write` should
   stay `false` — clients never talk to RTDB directly, only through
   the Express API.

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set JWT_SECRET, FIREBASE_DATABASE_URL, SEED_USER_* values
npm install
npm run seed          # writes the two users with bcrypt-hashed passwords
npm run dev           # http://localhost:4000  (health check: GET /health)
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev           # http://localhost:5173
```

In dev, Vite proxies `/api/*` → `http://localhost:4000` (configured in
`vite.config.js`), so no `VITE_API_BASE` is needed.

## Production deploy

### Backend → Firebase Cloud Functions or Cloud Run

The Express app is a vanilla `module.exports = app`, so it drops into
either runtime:

**Cloud Run (recommended, simplest):**
1. Add a `Dockerfile` (`FROM node:20-slim`, `COPY .`, `npm ci`, `CMD ["node", "server.js"]`).
2. `gcloud run deploy family-calendar-backend --source . --region us-central1 --allow-unauthenticated`.
3. Set env vars on the service: `JWT_SECRET`, `FIREBASE_DATABASE_URL`,
   `FIREBASE_SERVICE_ACCOUNT_JSON` (the JSON, single-line),
   `CORS_ORIGINS=https://your-vercel-domain.vercel.app`.

**Cloud Functions (1st or 2nd gen):**
```js
// functions/index.js
const app = require('../backend/server');
exports.api = require('firebase-functions').https.onRequest(app);
```
Then configure Firebase Hosting to rewrite `/api/**` → the function.

Either way: never commit `serviceAccountKey.json`. Use environment
variables in production (`FIREBASE_SERVICE_ACCOUNT_JSON`).

### Frontend → Vercel

```bash
cd frontend
vercel --prod
```

Set the env var **`VITE_API_BASE`** in the Vercel project settings to
your deployed backend URL (e.g. `https://family-calendar-backend-xxxx.run.app`).

`vercel.json` already declares the framework as Vite and adds the SPA
rewrite so client-side state survives refreshes.

## Security notes

- Passwords stored as bcrypt hashes (cost 12). Plaintext passwords are
  never logged.
- JWTs signed with `JWT_SECRET` (rotate by changing the secret —
  forces all sessions to re-auth).
- Login route is rate-limited (20 attempts / 15 min / IP).
- Realtime Database is locked down at the rules level; the only path
  to data is the Express API + Admin SDK.
- Always serve over HTTPS in production. Vercel and Cloud Run handle
  TLS for you.

## What's done in this first pass

- [x] Project scaffolding (frontend + backend folder structure, package.json, configs)
- [x] Express server with CORS, JSON body parsing, error handler
- [x] Firebase Admin init, RTDB schema documented, seed script
- [x] Auth: bcrypt + JWT, `/api/auth/login`, `/api/auth/me`, rate-limited
- [x] Event CRUD: `GET /api/events`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`
- [x] Comments: `GET/POST /api/events/:id/comments`, `DELETE /:commentId`
- [x] Login screen + token persistence (`localStorage`)
- [x] Calendar month view with category dots and event preview
- [x] Today / next-7-days dashboard with quick add
- [x] Event detail modal with edit, delete, and inline comment thread (5s polling)
- [x] Browser-notification scaffold (8 AM summary, per-event reminders)
- [x] Vercel config (SPA rewrite) + deploy notes

## Next iterations

- Swap comment polling for an RTDB live listener (`onChildAdded`)
- Service worker for true push notifications when the tab is closed
- Server-side reminder scheduler (Cloud Scheduler → Cloud Functions →
  FCM push) so notifications fire even with no client open
- Recurring events (daily/weekly/monthly)
- Per-user color preference for "who created this event"
