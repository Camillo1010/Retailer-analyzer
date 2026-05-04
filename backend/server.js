require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initFirebase } = require('./firebase');
const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const commentsRoutes = require('./routes/comments');

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

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/events/:eventId/comments', commentsRoutes);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 4000);

if (require.main === module) {
  initFirebase();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`family-calendar backend listening on :${PORT}`);
  });
}

module.exports = app;
