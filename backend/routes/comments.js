const express = require('express');
const { z } = require('zod');
const { store } = require('../store');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

router.get('/', async (req, res) => {
  const comments = await store.listComments(req.params.eventId);
  res.json({ comments });
});

router.post('/', async (req, res) => {
  const { eventId } = req.params;
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const event = await store.getEvent(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const comment = await store.createComment(eventId, {
    body: parsed.data.body,
    authorId: req.user.id,
    authorName: req.user.username,
    createdAt: Date.now(),
  });
  res.status(201).json({ comment });
});

router.delete('/:commentId', async (req, res) => {
  const { eventId, commentId } = req.params;
  const existing = await store.getComment(eventId, commentId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.authorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await store.deleteComment(eventId, commentId);
  res.json({ ok: true });
});

module.exports = router;
