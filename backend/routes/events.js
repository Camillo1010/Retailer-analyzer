const express = require('express');
const { z } = require('zod');
const { store } = require('../store');
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
  const events = await store.listEvents({ from: req.query.from, to: req.query.to });
  res.json({ events });
});

router.get('/:id', async (req, res) => {
  const event = await store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  res.json({ event });
});

router.post('/', async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const now = Date.now();
  const event = await store.createEvent({
    ...parsed.data,
    time: parsed.data.time ?? null,
    createdBy: req.user.id,
    createdAt: now,
    updatedAt: now,
  });
  res.status(201).json({ event });
});

router.put('/:id', async (req, res) => {
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const updated = await store.updateEvent(req.params.id, {
    ...parsed.data,
    updatedAt: Date.now(),
  });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ event: updated });
});

router.delete('/:id', async (req, res) => {
  const ok = await store.deleteEvent(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
