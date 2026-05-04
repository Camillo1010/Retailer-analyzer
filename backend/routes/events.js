const express = require('express');
const { z } = require('zod');
const { db } = require('../firebase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const CATEGORIES = ['appointment', 'bill', 'reminder', 'milestone', 'other'];

const eventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  // YYYY-MM-DD (local calendar date)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // HH:MM (24h) or null for all-day
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  category: z.enum(CATEGORIES),
  description: z.string().max(5000).optional().default(''),
  reminders: z
    .array(z.enum(['1d', '1h', 'at-time']))
    .max(3)
    .optional()
    .default([]),
});

// GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { from, to } = req.query;
  const ref = db().ref('events');
  const snap = await ref.orderByChild('date').once('value');
  const all = snap.val() || {};
  const list = Object.entries(all)
    .map(([id, e]) => ({ id, ...e }))
    .filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    })
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  res.json({ events: list });
});

router.get('/:id', async (req, res) => {
  const snap = await db().ref(`events/${req.params.id}`).once('value');
  const e = snap.val();
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json({ event: { id: req.params.id, ...e } });
});

router.post('/', async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const now = Date.now();
  const event = {
    ...parsed.data,
    time: parsed.data.time ?? null,
    createdBy: req.user.id,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await db().ref('events').push(event);
  res.status(201).json({ event: { id: ref.key, ...event } });
});

router.put('/:id', async (req, res) => {
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const ref = db().ref(`events/${req.params.id}`);
  const snap = await ref.once('value');
  if (!snap.exists()) return res.status(404).json({ error: 'Not found' });

  const update = { ...parsed.data, updatedAt: Date.now() };
  if ('time' in update && update.time === undefined) update.time = null;
  await ref.update(update);
  const after = (await ref.once('value')).val();
  res.json({ event: { id: req.params.id, ...after } });
});

router.delete('/:id', async (req, res) => {
  const eventRef = db().ref(`events/${req.params.id}`);
  const snap = await eventRef.once('value');
  if (!snap.exists()) return res.status(404).json({ error: 'Not found' });
  await eventRef.remove();
  await db().ref(`comments/${req.params.id}`).remove();
  res.json({ ok: true });
});

module.exports = router;
