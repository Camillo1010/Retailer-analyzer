const express = require('express');
const { z } = require('zod');
const { db } = require('../firebase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

// GET /api/events/:eventId/comments
router.get('/', async (req, res) => {
  const { eventId } = req.params;
  const snap = await db().ref(`comments/${eventId}`).orderByChild('createdAt').once('value');
  const val = snap.val() || {};
  const list = Object.entries(val)
    .map(([id, c]) => ({ id, ...c }))
    .sort((a, b) => a.createdAt - b.createdAt);
  res.json({ comments: list });
});

router.post('/', async (req, res) => {
  const { eventId } = req.params;
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const eventSnap = await db().ref(`events/${eventId}`).once('value');
  if (!eventSnap.exists()) return res.status(404).json({ error: 'Event not found' });

  const comment = {
    body: parsed.data.body,
    authorId: req.user.id,
    authorName: req.user.username,
    createdAt: Date.now(),
  };
  const ref = await db().ref(`comments/${eventId}`).push(comment);
  res.status(201).json({ comment: { id: ref.key, ...comment } });
});

router.delete('/:commentId', async (req, res) => {
  const { eventId, commentId } = req.params;
  const ref = db().ref(`comments/${eventId}/${commentId}`);
  const snap = await ref.once('value');
  if (!snap.exists()) return res.status(404).json({ error: 'Not found' });
  const c = snap.val();
  if (c.authorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await ref.remove();
  res.json({ ok: true });
});

module.exports = router;
