require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

const { store, isDemoMode } = require('./store');
const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const commentsRoutes = require('./routes/comments');

// In demo mode, generate a JWT secret on the fly so users don't have to
// configure one. Sessions won't survive a server restart, which is fine
// for a local demo.
if (!process.env.JWT_SECRET) {
  if (isDemoMode) {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  } else {
    // eslint-disable-next-line no-console
    console.error('JWT_SECRET is required outside demo mode.');
    process.exit(1);
  }
}

const app = express();

const origins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origins.length ? origins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '64kb' }));

app.get('/health', (req, res) =>
  res.json({ ok: true, mode: isDemoMode ? 'demo' : 'firebase' })
);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/events/:eventId/comments', commentsRoutes);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 4000);

async function seedDemoUsers() {
  const demoUsers = [
    { username: 'alex', password: 'demo', displayName: 'Alex' },
    { username: 'sam', password: 'demo', displayName: 'Sam' },
  ];
  for (const u of demoUsers) {
    await store.upsertUser(u);
  }
}

async function start() {
  if (isDemoMode) {
    await seedDemoUsers();
    // eslint-disable-next-line no-console
    console.log('');
    console.log('  ┌──────────────────────────────────────────────┐');
    console.log('  │  Family Calendar — DEMO MODE                 │');
    console.log('  │                                              │');
    console.log('  │  Data is in memory only and resets when      │');
    console.log('  │  this program stops.                         │');
    console.log('  │                                              │');
    console.log('  │  Log in with one of:                         │');
    console.log('  │    Username: alex   Password: demo           │');
    console.log('  │    Username: sam    Password: demo           │');
    console.log('  └──────────────────────────────────────────────┘');
    console.log('');
  } else {
    // Firebase mode — initialize the SDK now so a misconfig fails loud.
    // eslint-disable-next-line global-require
    const { initFirebase } = require('./firebase');
    initFirebase();
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

module.exports = app;
